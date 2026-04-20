import { NextRequest, NextResponse } from 'next/server'
import { PublicKey, Connection, Transaction } from '@solana/web3.js'
import { getCallerEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { insertAgentDecision } from '@/lib/queries/agent-decisions'
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
} from '@/lib/reputation/sas'

/**
 * POST /api/superteam/run
 *
 * Purpose-built endpoint for the Superteam chapter payroll wizard. Skips
 * the standard /api/x402/payroll/execute decision_id round-trip (which was
 * designed for AI-agent-sourced plans) and runs the contributor list
 * directly on the Solana branch.
 *
 * Idempotent nothing: each call creates a new payroll_run + broadcasts a
 * fresh Solana batch. Callers must de-duplicate.
 */

const MAX_CONTRIBUTORS = 50
const MAX_USDC_PER_CONTRIBUTOR = 500

interface ContributorInput {
  contributor_name: string
  solana_wallet: string
  usdc_amount: number
}

interface SuperteamRunRequest {
  chapter_name: string
  pay_frequency: 'weekly' | 'biweekly' | 'monthly'
  contributors: ContributorInput[]
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const employer = await getCallerEmployer(req)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: SuperteamRunRequest
  try {
    body = (await req.json()) as SuperteamRunRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.chapter_name?.trim()) {
    return NextResponse.json({ error: 'chapter_name required' }, { status: 400 })
  }
  if (!['weekly', 'biweekly', 'monthly'].includes(body.pay_frequency)) {
    return NextResponse.json({ error: 'invalid pay_frequency' }, { status: 400 })
  }
  if (!Array.isArray(body.contributors) || body.contributors.length === 0) {
    return NextResponse.json({ error: 'contributors required' }, { status: 400 })
  }
  if (body.contributors.length > MAX_CONTRIBUTORS) {
    return NextResponse.json(
      { error: `max ${MAX_CONTRIBUTORS} contributors per run` },
      { status: 400 },
    )
  }

  // Validate each contributor
  const validated: Array<ContributorInput & { pubkey: PublicKey }> = []
  for (const [i, c] of body.contributors.entries()) {
    if (!c.contributor_name?.trim()) {
      return NextResponse.json({ error: `row ${i + 1}: contributor_name required` }, { status: 400 })
    }
    let pubkey: PublicKey
    try {
      pubkey = new PublicKey(c.solana_wallet)
    } catch {
      return NextResponse.json(
        { error: `row ${i + 1}: solana_wallet is not a valid Solana pubkey` },
        { status: 400 },
      )
    }
    if (!Number.isFinite(c.usdc_amount) || c.usdc_amount <= 0) {
      return NextResponse.json({ error: `row ${i + 1}: usdc_amount must be > 0` }, { status: 400 })
    }
    if (c.usdc_amount > MAX_USDC_PER_CONTRIBUTOR) {
      return NextResponse.json(
        { error: `row ${i + 1}: usdc_amount exceeds ${MAX_USDC_PER_CONTRIBUTOR} USDC cap` },
        { status: 400 },
      )
    }
    validated.push({ ...c, pubkey })
  }

  const { solanaWallet } = getRemloAgentWallets()
  if (!solanaWallet) {
    return NextResponse.json(
      { error: 'Solana agent wallet not configured — set PRIVY_SOLANA_AGENT_WALLET_ID and PRIVY_SOLANA_AGENT_WALLET_ADDRESS in the environment' },
      { status: 503 },
    )
  }

  const totalUsdc = validated.reduce((sum, c) => sum + c.usdc_amount, 0)
  const payPeriod = new Date().toISOString().slice(0, 10)

  const supabase = createServerClient()

  // Create payroll_run (chain='solana', no token_address field needed for Solana)
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .insert({
      employer_id: employer.id,
      status: 'pending',
      total_amount: totalUsdc,
      employee_count: validated.length,
      chain: 'solana',
      created_by: employer.owner_user_id,
    })
    .select('id')
    .single()

  if (runError || !run) {
    return NextResponse.json(
      { error: `Failed to create payroll run: ${runError?.message ?? 'unknown'}` },
      { status: 500 },
    )
  }

  // Log a minimal decision for audit trail (source='superteam_wizard')
  const decision = await insertAgentDecision({
    employer_id: employer.id,
    payroll_run_id: run.id,
    decision_type: 'superteam_chapter_payroll',
    inputs: {
      chapter_name: body.chapter_name,
      pay_frequency: body.pay_frequency,
      contributor_count: validated.length,
      total_usdc: totalUsdc,
    },
    reasoning: `Superteam chapter "${body.chapter_name}" ${body.pay_frequency} payroll for ${validated.length} contributors.`,
    decision: {
      payments: validated.map((c) => ({
        employee_id: c.solana_wallet, // use wallet as identifier for Superteam flow
        amount: c.usdc_amount,
        chain: 'solana' as const,
        address: c.solana_wallet,
      })),
      total_amount: totalUsdc,
    },
    confidence: 1.0,
  })

  // Build Solana batch + sign + broadcast
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const recipients = validated.map((c) => ({
    address: c.solana_wallet,
    amount: c.usdc_amount,
    memo: JSON.stringify({
      t: 'remlo-superteam',
      employer: employer.id.slice(0, 8),
      chapter: body.chapter_name.slice(0, 16),
      period: payPeriod,
    }),
  }))

  const fromPubkey = new PublicKey(solanaWallet.address)
  const unsignedTransactions = await buildBatchUsdcTransfer(
    recipients,
    fromPubkey,
    SOLANA_CLUSTER,
  )

  const signatures: string[] = []
  const rejections: { contributor: string; reason: string }[] = []

  for (const [i, tx] of unsignedTransactions.entries()) {
    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash
      tx.feePayer = fromPubkey

      const signed = (await signSolanaTransaction(solanaWallet.id, tx)) as Transaction
      const sig = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        'confirmed',
      )
      signatures.push(sig)
    } catch (err) {
      const reason =
        err instanceof PrivyPolicyRejectedError
          ? err.reason
          : err instanceof Error
            ? err.message
            : 'unknown error'
      rejections.push({
        contributor: validated[i]?.contributor_name ?? `chunk ${i}`,
        reason,
      })
    }
  }

  // Persist the run result
  await supabase
    .from('payroll_runs')
    .update({
      solana_signatures: signatures,
      status: signatures.length > 0 ? 'processing' : 'failed',
    })
    .eq('id', run.id)

  // Enqueue reputation writes (Ship 3) — non-blocking
  if (signatures.length > 0) {
    void (async () => {
      try {
        const { randomBytes } = await import('crypto')
        for (const c of validated) {
          const memoStr = `remlo-superteam:${body.chapter_name}:${payPeriod}`
          await enqueuePaymentCompletedAttestation({
            payload: {
              subject_address: c.solana_wallet,
              employer_id: employer.id,
              amount_base_units: BigInt(Math.round(c.usdc_amount * 1_000_000)),
              currency: 'USDC',
              memo_hash: new Uint8Array(
                (await import('crypto')).createHash('sha256').update(memoStr).digest(),
              ),
              settled_at: BigInt(Math.floor(Date.now() / 1000)),
              payroll_run_id: run.id,
              worker_agent_identifier: `superteam:${body.chapter_name}`,
            },
            source_id: run.id,
          })
        }
        await enqueueEmployerVerifiedAttestationOnce({
          payload: {
            subject_address: solanaWallet.address,
            employer_id: employer.id,
            first_payroll_run_id: run.id,
            verified_at: BigInt(Math.floor(Date.now() / 1000)),
          },
          source_id: run.id,
        })
        void randomBytes // touch to prevent tree-shake
      } catch (err) {
        console.error(
          '[superteam/run] reputation enqueue failed (non-fatal):',
          err instanceof Error ? err.message : err,
        )
      }
    })()
  }

  return NextResponse.json({
    payroll_run_id: run.id,
    decision_id: decision?.id ?? null,
    chapter_name: body.chapter_name,
    contributor_count: validated.length,
    total_usdc: totalUsdc,
    solana_signatures: signatures,
    rejections,
    explorer_urls: signatures.map(
      (sig) => `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_CLUSTER}`,
    ),
  })
}
