import { parseUnits, keccak256, toBytes, isAddress } from 'viem'
import { mppx } from '@/lib/mpp'
import { payrollBatcher, treasury, getServerWalletClient } from '@/lib/contracts'
import { getEmployerById } from '@/lib/queries/employers'
import { getEmployerOnchainIdentity, getEmployerOnchainIdentityError } from '@/lib/employer-onchain'
import { encodeMemo } from '@/lib/memo'
import {
  findActiveAuthorization,
  spentInLastDay,
  recordPayCall,
} from '@/lib/queries/agent-authorizations'

const AGENT_KEY = process.env.REMLO_AGENT_PRIVATE_KEY as `0x${string}` | undefined

/**
 * POST /api/mpp/agent/pay
 * MPP-13 — $0.05 x402 charge
 *
 * Agent-to-agent direct payment. An external agent (via AgentCash or another
 * x402 client) pays $0.05 USDC.e to Remlo, then Remlo broadcasts a single-
 * recipient USDC transfer from the specified employer's PayrollTreasury.
 *
 * Authorization model:
 *   The caller must identify itself via `X-Agent-Identifier` header. That
 *   identifier must match an `employer_agent_authorizations` row for the
 *   specified employer_id. The authorization defines per-tx and per-day
 *   spend caps which are enforced before broadcast.
 *
 *   Absent this, anyone who paid the $0.05 fee could drain any employer's
 *   treasury. The x402 fee is service revenue, not authorization.
 *
 * Body: { employer_id, recipient_wallet, amount, reference? }
 * Header: X-Agent-Identifier — the pre-registered agent identity (0x..., URI, or token)
 */
export const POST = mppx.charge({ amount: '0.05' })(async (req: Request) => {
  if (!AGENT_KEY) {
    return Response.json(
      { error: 'REMLO_AGENT_PRIVATE_KEY not configured on server' },
      { status: 503 },
    )
  }

  const agentIdentifier = req.headers.get('x-agent-identifier')?.trim()
  if (!agentIdentifier) {
    return Response.json(
      {
        error: 'Missing X-Agent-Identifier header. Register your agent at /dashboard/settings/agents first.',
        code: 'AGENT_NOT_AUTHORIZED',
      },
      { status: 401 },
    )
  }

  const body = (await req.json()) as {
    employer_id?: string
    recipient_wallet?: string
    amount?: string
    reference?: string
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

  // Authorization check
  const authorization = await findActiveAuthorization(employerId, agentIdentifier)
  if (!authorization) {
    return Response.json(
      {
        error: 'Agent is not authorized for this employer. The employer must register your X-Agent-Identifier.',
        code: 'AGENT_NOT_AUTHORIZED',
      },
      { status: 403 },
    )
  }

  // Per-transaction cap
  if (amountNumber > Number(authorization.per_tx_cap_usd)) {
    return Response.json(
      {
        error: `Amount exceeds per-transaction cap`,
        requested: amountNumber,
        per_tx_cap_usd: Number(authorization.per_tx_cap_usd),
        code: 'PER_TX_CAP_EXCEEDED',
      },
      { status: 403 },
    )
  }

  // Per-day cap
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

  const employer = await getEmployerById(employerId)
  if (!employer) {
    return Response.json({ error: 'Employer not found' }, { status: 404 })
  }

  const onchain = getEmployerOnchainIdentity(employer)
  if (!onchain) {
    return Response.json(getEmployerOnchainIdentityError(employer), { status: 409 })
  }

  const amountUnits = parseUnits(amount, 6)

  const available = (await treasury.read.getAvailableBalance([onchain.employerAccountId])) as bigint
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

  // Build a single-recipient memo. Cost center 1000 denotes agent-pay payments
  // (distinct from scheduled payroll runs which use 0).
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

  // Record the call for audit + per-day cap accounting
  await recordPayCall({
    authorization_id: authorization.id,
    employer_id: employerId,
    recipient_wallet: recipient,
    usd_amount: amountNumber,
    tx_hash: txHash,
    reference: reference ?? null,
  })

  return Response.json({
    success: true,
    tx_hash: txHash,
    recipient,
    amount,
    employer_id: employerId,
    employer_account_id: onchain.employerAccountId,
    authorization: {
      id: authorization.id,
      label: authorization.label,
      per_tx_cap_usd: Number(authorization.per_tx_cap_usd),
      per_day_cap_usd: Number(authorization.per_day_cap_usd),
      spent_today_after: spentToday + amountNumber,
    },
    reference: reference ?? null,
    explorer_url: `https://explore.moderato.tempo.xyz/tx/${txHash}`,
    memo,
    timestamp: new Date().toISOString(),
  })
})
