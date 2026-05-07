import { parseUnits, keccak256, toBytes, isAddress } from 'viem'
import { multiRailRoute } from '@/lib/mpp-route'
import { payrollBatcher, treasury, getServerWalletClient } from '@/lib/contracts'
import { getEmployerOnchainIdentity, getEmployerOnchainIdentityError } from '@/lib/employer-onchain'
import {
  spentInLastDay,
  recordPayCall,
  callsInLastMinute,
  rollingMedianAmount,
  halveCapOnAnomaly,
} from '@/lib/queries/agent-authorizations'
import { encodeMemo } from '@/lib/memo'
import { requireEmployerCaller } from '@/lib/mpp-auth'
import { createNotification } from '@/lib/notifications'

const AGENT_KEY = process.env.REMLO_AGENT_PRIVATE_KEY as `0x${string}` | undefined

interface PayBody {
  employer_id?: string
  recipient_wallet?: string
  amount?: string
  reference?: string
}

/**
 * POST /api/mpp/agent/pay
 * MPP-13 — $0.05 x402 charge.
 *
 * Agent-to-agent direct payment. An external agent (via AgentCash or another
 * x402 client) pays $0.05 USDC to Remlo, then Remlo broadcasts a single-
 * recipient USDC transfer from the specified employer's PayrollTreasury.
 *
 * Authorization: caller must be the employer (Privy) or an employer-authorized
 * agent (X-Agent-Identifier + HMAC). Caps (per-tx, per-day) enforce only on
 * the agent path — Privy callers can spend up to the on-chain treasury balance.
 */
export const POST = multiRailRoute({
  amount: '0.05',
  description: 'Agent-to-agent payment',
  handler: async ({ req }) => {
    if (!AGENT_KEY) {
    return Response.json(
      { error: 'REMLO_AGENT_PRIVATE_KEY not configured on server' },
      { status: 503 },
    )
  }

  const rawBody = await req.text()
  let body: PayBody
  try {
    body = JSON.parse(rawBody) as PayBody
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { employer_id: employerId, recipient_wallet: recipient, amount, reference } = body

  if (!employerId || !recipient || !amount) {
    return Response.json(
      { error: 'employer_id, recipient_wallet, and amount are required' },
      { status: 400 },
    )
  }
  if (!isAddress(recipient)) {
    return Response.json({ error: 'recipient_wallet is not a valid address' }, { status: 400 })
  }
  const amountNumber = parseFloat(amount)
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return Response.json({ error: 'amount must be a positive decimal' }, { status: 400 })
  }

  const auth = await requireEmployerCaller(req, { employerId, rawBody })
  if (!auth.ok) return auth.response

  // Caps + audit trail apply to the agent path only. Human owners use the
  // dashboard for cap-bound spending.
  //
  // Six-gate defence model (security hardening 2026-05-07):
  //   gate 1: emergency pause   — paused_at on the authorization row
  //   gate 2: per-tx cap        — per_tx_cap_usd
  //   gate 3: per-day cap       — per_day_cap_usd (rolling 24h sum)
  //   gate 4: velocity          — velocity_per_minute (rolling 60s count)
  //   gate 5: recipient allowlist — allowed_recipients (optional)
  //   gate 6: anomaly detection — >10× rolling median triggers halving
  // Identity, reputation, sanctions are gates checked elsewhere.
  if (auth.caller.kind === 'employer-agent') {
    const authorization = auth.caller.authorization

    // Gate 1: emergency pause. Single field, single check, immediate 403.
    if (authorization.paused_at) {
      return Response.json(
        {
          error: 'Agent authorization is paused. Employer must resume from the dashboard.',
          paused_at: authorization.paused_at,
          pause_reason: authorization.pause_reason ?? null,
          code: 'AGENT_PAUSED',
        },
        { status: 403 },
      )
    }

    // Gate 2: per-tx cap.
    if (amountNumber > Number(authorization.per_tx_cap_usd)) {
      return Response.json(
        {
          error: 'Amount exceeds per-transaction cap',
          requested: amountNumber,
          per_tx_cap_usd: Number(authorization.per_tx_cap_usd),
          code: 'PER_TX_CAP_EXCEEDED',
        },
        { status: 403 },
      )
    }

    // Gate 3: per-day cap.
    const spentToday = await spentInLastDay(authorization.id)
    if (spentToday + amountNumber > Number(authorization.per_day_cap_usd)) {
      return Response.json(
        {
          error: 'Daily spend cap would be exceeded by this payment',
          spent_in_last_24h: spentToday,
          requested: amountNumber,
          per_day_cap_usd: Number(authorization.per_day_cap_usd),
          code: 'PER_DAY_CAP_EXCEEDED',
        },
        { status: 403 },
      )
    }

    // Gate 4: velocity. Stops the "drain in 30 seconds" path that per-day
    // caps don't catch on their own.
    const callsRecently = await callsInLastMinute(authorization.id)
    if (callsRecently >= authorization.velocity_per_minute) {
      return Response.json(
        {
          error: 'Velocity limit exceeded — too many calls in the last minute',
          calls_in_last_60s: callsRecently,
          velocity_per_minute: authorization.velocity_per_minute,
          retry_after_seconds: 60,
          code: 'VELOCITY_LIMIT_EXCEEDED',
        },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }

    // Gate 5: recipient allowlist (optional). If unset (null or empty
    // array), behaves as before — caps are the only ceiling. If set, the
    // agent can ONLY pay addresses in the allowlist.
    if (authorization.allowed_recipients && authorization.allowed_recipients.length > 0) {
      const allowedLower = authorization.allowed_recipients.map((addr) => addr.toLowerCase())
      if (!allowedLower.includes(recipient.toLowerCase())) {
        return Response.json(
          {
            error: 'Recipient is not on this agent\'s allowlist',
            recipient,
            allowed_recipients_count: authorization.allowed_recipients.length,
            code: 'RECIPIENT_NOT_ALLOWED',
          },
          { status: 403 },
        )
      }
    }
  }

  const onchain = getEmployerOnchainIdentity(auth.caller.employer)
  if (!onchain) {
    return Response.json(getEmployerOnchainIdentityError(auth.caller.employer), { status: 409 })
  }

  const amountUnits = parseUnits(amount, 6)
  const available = (await treasury.read.getAvailableBalance([
    onchain.employerAccountId,
  ])) as bigint
  if (available < amountUnits) {
    return Response.json(
      {
        error: 'Insufficient treasury balance',
        available: (Number(available) / 1e6).toFixed(6),
        required: amount,
      },
      { status: 422 },
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const recordHash = keccak256(
    toBytes(`agent-pay:${employerId}:${recipient}:${amount}:${Date.now()}`),
  ).slice(2, 10)

  const memo = encodeMemo({
    employerId,
    employeeId: '00000000-0000-0000-0000-000000000000',
    payPeriod: today,
    costCenter: 1000,
    recordHash,
  })

  const walletClient = getServerWalletClient(AGENT_KEY)
  const txHash = await walletClient.writeContract({
    address: payrollBatcher.address,
    abi: payrollBatcher.abi,
    functionName: 'executeBatchPayroll',
    args: [
      [recipient as `0x${string}`],
      [amountUnits],
      [memo],
      onchain.employerAccountId,
    ],
  })

  if (auth.caller.kind === 'employer-agent') {
    await recordPayCall({
      authorization_id: auth.caller.authorization.id,
      employer_id: employerId,
      recipient_wallet: recipient,
      usd_amount: amountNumber,
      tx_hash: txHash,
      reference: reference ?? null,
    })

    // Gate 6: anomaly detection. If this payment is >10× the agent's
    // rolling 7-day median, halve per_tx_cap_usd and notify the employer.
    // The cap halving is idempotent — only fires once until the employer
    // ack's via the dashboard. Spike thresholds are intentionally
    // conservative (the cost of a false positive is one notification +
    // a temporarily lower cap; the cost of a false negative is a drain).
    const median = await rollingMedianAmount(auth.caller.authorization.id)
    if (median !== null && amountNumber > median * 10) {
      const reason = `Spike: $${amountNumber.toFixed(2)} vs 7-day median $${median.toFixed(2)}`
      await halveCapOnAnomaly({
        authorizationId: auth.caller.authorization.id,
        reason,
      })
      await createNotification({
        employerId,
        kind: 'agent_spike_detected',
        title: `Spike on agent ${auth.caller.authorization.label}`,
        body: `Payment of $${amountNumber.toFixed(2)} is more than 10× this agent's recent median ($${median.toFixed(2)}). Per-tx cap auto-halved as a safety measure. Review and restore from /dashboard/settings/agents.`,
        severity: 'warning',
        link: '/dashboard/settings/agents',
        metadata: {
          authorization_id: auth.caller.authorization.id,
          tx_hash: txHash,
          amount: amountNumber,
          median,
        },
      })
    }
  }

  return Response.json({
    success: true,
    tx_hash: txHash,
    recipient,
    amount,
    employer_id: employerId,
    employer_account_id: onchain.employerAccountId,
    caller: auth.caller.kind,
    authorization:
      auth.caller.kind === 'employer-agent'
        ? {
            id: auth.caller.authorization.id,
            label: auth.caller.authorization.label,
            per_tx_cap_usd: Number(auth.caller.authorization.per_tx_cap_usd),
            per_day_cap_usd: Number(auth.caller.authorization.per_day_cap_usd),
          }
        : null,
    reference: reference ?? null,
    explorer_url: `https://explore.moderato.tempo.xyz/tx/${txHash}`,
    memo,
    timestamp: new Date().toISOString(),
  })
  },
})
