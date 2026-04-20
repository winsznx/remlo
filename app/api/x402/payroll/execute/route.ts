// TODO: gate with x402 Solana USDC payment ($1.00) once x402 HTTP adapter is ready

import { NextRequest, NextResponse } from 'next/server'
import { keccak256, toBytes, parseUnits } from 'viem'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { getCallerEmployer } from '@/lib/auth'
import { getAgentDecisionById, markDecisionExecuted } from '@/lib/queries/agent-decisions'
import { createServerClient } from '@/lib/supabase-server'
import { payrollBatcher, getServerWalletClient } from '@/lib/contracts'
import { getEmployerOnchainIdentity, getEmployerOnchainIdentityError } from '@/lib/employer-onchain'
import { encodeMemo, memoHexToBytea } from '@/lib/memo'
import { PATHUSD_ADDRESS } from '@/lib/constants'
import { buildBatchUsdcTransfer } from '@/lib/solana-payroll'
import { SOLANA_CLUSTER, SOLANA_RPC_URL } from '@/lib/solana-constants'
import {
  getRemloAgentWallets,
  signSolanaTransaction,
  PrivyPolicyRejectedError,
} from '@/lib/privy-server'
import {
  enqueuePaymentCompletedAttestation,
  enqueueEmployerVerifiedAttestationOnce,
  SCHEMA_EMPLOYER_VERIFIED,
} from '@/lib/reputation/sas'
import {
  enqueuePayrollCompletedFeedback,
  computeFeedbackHash,
} from '@/lib/reputation/erc8004'

const AGENT_KEY = process.env.REMLO_AGENT_PRIVATE_KEY as `0x${string}` | undefined

interface DecisionPayment {
  employee_id: string
  amount: number
  chain: 'tempo' | 'solana'
  address: string
}

interface SolanaBroadcastResult {
  signatures: string[]
  policyRejectedPayments: { payment: DecisionPayment; reason: string }[]
  otherError: string | null
}

/**
 * Broadcasts a Solana batch via Privy server wallet signing.
 * Policy rejections on a specific chunk are surfaced per-payment so the caller
 * can mark affected payment_items rows as 'policy_rejected' without failing the run.
 */
async function broadcastSolanaBatch(
  walletId: string,
  walletAddress: string,
  payments: DecisionPayment[],
  employerId: string,
  payPeriod: string,
): Promise<SolanaBroadcastResult> {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')

  const recipients = payments.map((p) => ({
    address: p.address,
    amount: p.amount,
    memo: JSON.stringify({
      t: 'remlo-payroll',
      employer: employerId.slice(0, 8),
      employee: p.employee_id.slice(0, 8),
      period: payPeriod,
    }),
  }))

  const payerPublicKey = new PublicKey(walletAddress)
  const unsignedTransactions = await buildBatchUsdcTransfer(
    recipients,
    payerPublicKey,
    SOLANA_CLUSTER,
  )

  const signatures: string[] = []
  const policyRejectedPayments: { payment: DecisionPayment; reason: string }[] = []
  let otherError: string | null = null

  // buildBatchUsdcTransfer chunks into groups of 8 recipients. Map each chunk's
  // result back to the underlying payment rows so per-item policy rejections
  // can be recorded accurately.
  const CHUNK_SIZE = 8
  for (let i = 0; i < unsignedTransactions.length; i++) {
    const tx = unsignedTransactions[i]
    const chunkPayments = payments.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)

    try {
      const signed = (await signSolanaTransaction(walletId, tx)) as Transaction
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(
        {
          signature,
          blockhash: tx.recentBlockhash!,
          lastValidBlockHeight: tx.lastValidBlockHeight!,
        },
        'confirmed',
      )
      signatures.push(signature)
    } catch (err) {
      if (err instanceof PrivyPolicyRejectedError) {
        for (const payment of chunkPayments) {
          policyRejectedPayments.push({ payment, reason: err.reason })
        }
      } else {
        // Non-policy errors stop the run — we don't want to silently swallow
        // RPC outages or network failures.
        otherError = err instanceof Error ? err.message : 'unknown broadcast error'
        break
      }
    }
  }

  return { signatures, policyRejectedPayments, otherError }
}

/**
 * POST /api/x402/payroll/execute
 * Executes a previously planned payroll decision end-to-end:
 *   - Tempo payments broadcast via REMLO_AGENT_PRIVATE_KEY (legacy transitional path)
 *   - Solana payments broadcast via Privy server wallet with policy enforcement
 * Body: { employer_id: string, decision_id: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const employer = await getCallerEmployer(req)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!AGENT_KEY) {
    return NextResponse.json(
      { error: 'REMLO_AGENT_PRIVATE_KEY not configured on server' },
      { status: 503 },
    )
  }

  const body = (await req.json()) as { employer_id?: string; decision_id?: string }
  const { decision_id: decisionId } = body
  const employerId = body.employer_id ?? employer.id

  if (employerId !== employer.id) {
    return NextResponse.json({ error: 'Employer ID mismatch' }, { status: 403 })
  }
  if (!decisionId) {
    return NextResponse.json({ error: 'decision_id is required' }, { status: 400 })
  }

  const decision = await getAgentDecisionById(decisionId)
  if (!decision) {
    return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
  }
  if (decision.employer_id !== employerId) {
    return NextResponse.json({ error: 'Decision does not belong to this employer' }, { status: 403 })
  }
  if (decision.executed) {
    return NextResponse.json({ error: 'Decision already executed' }, { status: 409 })
  }

  const plan = decision.decision as unknown as {
    payments: DecisionPayment[]
    total_amount: number
  }

  if (!plan.payments?.length) {
    return NextResponse.json({ error: 'Decision has no payments to execute' }, { status: 422 })
  }

  const onchainIdentity = getEmployerOnchainIdentity(employer)
  if (!onchainIdentity) {
    return NextResponse.json(getEmployerOnchainIdentityError(employer), { status: 409 })
  }

  const tempoPayments = plan.payments.filter((p) => p.chain === 'tempo')
  const solanaPayments = plan.payments.filter((p) => p.chain === 'solana')

  const supabase = createServerClient()
  const payPeriod = new Date().toISOString().slice(0, 10)

  const runChain = tempoPayments.length > 0 && solanaPayments.length > 0
    ? 'mixed'
    : solanaPayments.length > 0 ? 'solana' : 'tempo'

  const { data: run } = await supabase
    .from('payroll_runs')
    .insert({
      employer_id: employerId,
      status: 'pending',
      total_amount: plan.total_amount,
      employee_count: plan.payments.length,
      token_address: PATHUSD_ADDRESS,
      chain: runChain,
      created_by: employer.owner_user_id,
    })
    .select('id')
    .single()

  if (!run) {
    return NextResponse.json({ error: 'Failed to create payroll run' }, { status: 500 })
  }

  const paymentItemRows = plan.payments.map((p) => {
    if (p.chain === 'tempo') {
      const memo = encodeMemo({
        employerId,
        employeeId: p.employee_id,
        payPeriod,
        costCenter: 0,
        recordHash: keccak256(toBytes(`${employerId}:${p.employee_id}:${payPeriod}`)).slice(2, 10),
      })
      return {
        payroll_run_id: run.id,
        employee_id: p.employee_id,
        amount: p.amount,
        chain: 'tempo',
        status: 'pending',
        memo_bytes: memoHexToBytea(memo),
      }
    }
    return {
      payroll_run_id: run.id,
      employee_id: p.employee_id,
      amount: p.amount,
      chain: 'solana',
      status: 'pending',
    }
  })

  await supabase.from('payment_items').insert(paymentItemRows)

  // ── Tempo broadcast (legacy transitional path, REMLO_AGENT_PRIVATE_KEY) ──
  let tempoTxHash: `0x${string}` | null = null
  let tempoBroadcastError: string | null = null

  if (tempoPayments.length > 0) {
    try {
      const recipients = tempoPayments.map((p) => p.address as `0x${string}`)
      const amounts = tempoPayments.map((p) => parseUnits(p.amount.toFixed(6), 6))
      const memos = tempoPayments.map((p) =>
        encodeMemo({
          employerId,
          employeeId: p.employee_id,
          payPeriod,
          costCenter: 0,
          recordHash: keccak256(toBytes(`${employerId}:${p.employee_id}:${payPeriod}`)).slice(2, 10),
        }),
      )

      const walletClient = getServerWalletClient(AGENT_KEY)
      tempoTxHash = await walletClient.writeContract({
        address: payrollBatcher.address,
        abi: payrollBatcher.abi,
        functionName: 'executeBatchPayroll',
        args: [recipients, amounts, memos, onchainIdentity.employerAccountId],
      })
    } catch (err) {
      tempoBroadcastError = err instanceof Error ? err.message : 'unknown error'
    }
  }

  // ── Solana broadcast (Privy server wallet with policy enforcement) ────
  let solanaSignatures: string[] = []
  let solanaBroadcastError: string | null = null
  let solanaPolicyRejections: { employee_id: string; reason: string }[] = []

  if (solanaPayments.length > 0) {
    const { solanaWallet } = getRemloAgentWallets()
    if (!solanaWallet) {
      solanaBroadcastError =
        'Solana agent wallet not configured. Set PRIVY_SOLANA_AGENT_WALLET_ID and PRIVY_SOLANA_AGENT_WALLET_ADDRESS in the environment.'
    } else {
      try {
        const result = await broadcastSolanaBatch(
          solanaWallet.id,
          solanaWallet.address,
          solanaPayments,
          employerId,
          payPeriod,
        )
        solanaSignatures = result.signatures
        solanaPolicyRejections = result.policyRejectedPayments.map((r) => ({
          employee_id: r.payment.employee_id,
          reason: r.reason,
        }))
        if (result.otherError) solanaBroadcastError = result.otherError
      } catch (err) {
        solanaBroadcastError = err instanceof Error ? err.message : 'unknown error'
      }
    }
  }

  // ── Persist broadcast results ────────────────────────────────────────
  await supabase
    .from('agent_decisions')
    .update({ payroll_run_id: run.id })
    .eq('id', decisionId)

  if (tempoTxHash) {
    await Promise.all([
      supabase
        .from('payroll_runs')
        .update({ status: 'processing', tx_hash: tempoTxHash })
        .eq('id', run.id),
      supabase
        .from('payment_items')
        .update({ tx_hash: tempoTxHash, status: 'pending' })
        .eq('payroll_run_id', run.id)
        .eq('chain', 'tempo'),
    ])
  }

  if (solanaSignatures.length > 0) {
    await Promise.all([
      supabase
        .from('payroll_runs')
        .update({ solana_signatures: solanaSignatures, status: 'processing' })
        .eq('id', run.id),
      supabase
        .from('payment_items')
        .update({ solana_signature: solanaSignatures[0], status: 'pending' })
        .eq('payroll_run_id', run.id)
        .eq('chain', 'solana')
        .is('policy_rejection_reason', null),
    ])
  }

  // Mark per-item policy rejections
  for (const rejection of solanaPolicyRejections) {
    await supabase
      .from('payment_items')
      .update({ status: 'policy_rejected', policy_rejection_reason: rejection.reason })
      .eq('payroll_run_id', run.id)
      .eq('chain', 'solana')
      .eq('employee_id', rejection.employee_id)
  }

  // ── Enqueue reputation writes (Ship 3) ───────────────────────────────
  // Non-blocking: failures are logged but never propagate to the payment flow.
  // The /api/cron/process-reputation-writes worker drains the queue.
  try {
    const { data: committedSolana } = await supabase
      .from('payment_items')
      .select('id, employee_id, amount, memo_bytes')
      .eq('payroll_run_id', run.id)
      .eq('chain', 'solana')
      .not('solana_signature', 'is', null)

    for (const item of committedSolana ?? []) {
      const emp = solanaPayments.find((p) => p.employee_id === item.employee_id)
      if (!emp) continue
      const memoStr = JSON.stringify({
        t: 'remlo-payroll',
        employer: employerId.slice(0, 8),
        employee: emp.employee_id.slice(0, 8),
        period: payPeriod,
      })
      const memoHash = Buffer.from(
        keccak256(toBytes(memoStr)).slice(2),
        'hex',
      )
      await enqueuePaymentCompletedAttestation({
        payload: {
          subject_address: emp.address,
          employer_id: employerId,
          amount_base_units: BigInt(Math.round(emp.amount * 1_000_000)),
          currency: 'USDC',
          memo_hash: new Uint8Array(memoHash),
          settled_at: BigInt(Math.floor(Date.now() / 1000)),
          payroll_run_id: run.id,
          worker_agent_identifier: '',
        },
        source_id: item.id,
      })
    }

    if (tempoTxHash) {
      const feedbackBody = JSON.stringify({
        kind: 'payroll_completed',
        run_id: run.id,
        employer: employerId,
        count: tempoPayments.length,
        tx_hash: tempoTxHash,
      })
      await enqueuePayrollCompletedFeedback({
        payload: {
          target_agent_id: process.env.REMLO_PAYROLL_AGENT_ID ?? '0',
          value: 100,
          value_decimals: 0,
          tag1: 'payroll',
          tag2: 'usd_path',
          endpoint: 'https://remlo.xyz/api/x402/payroll/execute',
          feedback_uri: `https://remlo.xyz/dashboard/payroll/${run.id}`,
          feedback_hash_hex: computeFeedbackHash(feedbackBody),
          payroll_run_id: run.id,
          total_amount_base_units: String(
            tempoPayments.reduce((s, p) => s + BigInt(Math.round(p.amount * 1_000_000)), 0n),
          ),
          payment_count: tempoPayments.length,
        },
        source_id: run.id,
      })
    }

    // Employer-verified attestation — first successful run only (idempotent
    // at the queue layer via hasEmployerVerifiedAttestation guard).
    const { solanaWallet: employerReputationWallet } = getRemloAgentWallets()
    const employerSolanaAddr = employerReputationWallet?.address
    if (employerSolanaAddr && (tempoTxHash || solanaSignatures.length > 0)) {
      await enqueueEmployerVerifiedAttestationOnce({
        payload: {
          subject_address: employerSolanaAddr,
          employer_id: employerId,
          first_payroll_run_id: run.id,
          verified_at: BigInt(Math.floor(Date.now() / 1000)),
        },
        source_id: run.id,
      })
    }
    // Touch the import so tsc doesn't tree-shake the constant. The value is
    // the authoritative schema_id string used by hasEmployerVerifiedAttestation.
    void SCHEMA_EMPLOYER_VERIFIED
  } catch (err) {
    console.error(
      '[payroll-execute] reputation enqueue failed (non-fatal):',
      err instanceof Error ? err.message : err,
    )
  }

  const hadAnyBroadcast = Boolean(tempoTxHash) || solanaSignatures.length > 0
  const hadAnyError = tempoBroadcastError || solanaBroadcastError
  if (!hadAnyBroadcast && hadAnyError && solanaPolicyRejections.length === 0) {
    await supabase
      .from('payroll_runs')
      .update({ status: 'failed' })
      .eq('id', run.id)
  }

  await markDecisionExecuted(decisionId)

  return NextResponse.json({
    payroll_run_id: run.id,
    decision_id: decisionId,
    tempo_tx_hash: tempoTxHash,
    tempo_broadcast_error: tempoBroadcastError,
    tempo_explorer_url: tempoTxHash ? `https://explore.moderato.tempo.xyz/tx/${tempoTxHash}` : null,
    solana_signatures: solanaSignatures,
    solana_broadcast_error: solanaBroadcastError,
    solana_policy_rejections: solanaPolicyRejections,
    solana_explorer_urls: solanaSignatures.map(
      (sig) => `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_CLUSTER}`,
    ),
    total_amount: plan.total_amount,
    employee_count: plan.payments.length,
  })
}
