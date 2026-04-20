import { NextRequest, NextResponse } from 'next/server'
import {
  fetchPendingReputationWrites,
  markReputationWriteWritten,
  markReputationWriteFailed,
  type ReputationWrite,
} from '@/lib/queries/reputation-writes'
import { processSasReputationWrite } from '@/lib/reputation/sas'
import { processErc8004ReputationWrite } from '@/lib/reputation/erc8004'

/**
 * POST /api/cron/process-reputation-writes
 *
 * Drains the `reputation_writes` queue. For each pending or failed row
 * (attempts < 5), routes to the correct chain handler, broadcasts the
 * on-chain attestation / feedback, and marks the row as written.
 *
 * Non-blocking from the payment flow's perspective: failures here never roll
 * back the already-settled payment. Rows retry up to 5 times before being
 * marked 'giving_up'.
 *
 * Vercel Cron hits this every 10 minutes per vercel.json.
 *
 * Auth: same pattern as process-expired-escrows — X-Cron-Secret header or
 * Vercel's signed Authorization bearer.
 */
const MAX_PER_INVOCATION = 20

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured — endpoint disabled' },
      { status: 501 },
    )
  }

  const xCronHeader = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('authorization')
  const vercelAuthValid = authHeader === `Bearer ${cronSecret}`
  const xCronValid = xCronHeader === cronSecret
  if (!vercelAuthValid && !xCronValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pending = await fetchPendingReputationWrites(MAX_PER_INVOCATION, 5)

  let processed = 0
  let written = 0
  let failed = 0
  let gaveUp = 0
  const errors: { id: string; error: string }[] = []

  const solanaWalletId = process.env.PRIVY_SOLANA_AGENT_WALLET_ID
  const solanaWalletAddress = process.env.PRIVY_SOLANA_AGENT_WALLET_ADDRESS

  for (const row of pending) {
    processed++
    try {
      if (row.chain === 'solana') {
        if (!solanaWalletId || !solanaWalletAddress) {
          throw new Error('Privy Solana wallet not configured')
        }
        const result = await processSasReputationWrite(
          row,
          solanaWalletId,
          solanaWalletAddress,
        )
        await markReputationWriteWritten(row.id, {
          attestation_pda: result.attestationPda,
          tx_signature: result.signature,
        })
        written++
      } else if (row.chain === 'tempo') {
        const result = await processErc8004ReputationWrite(row)
        await markReputationWriteWritten(row.id, {
          tx_signature: result.txHash,
          signer_path: result.signerPath,
        })
        written++
      } else {
        throw new Error(`Unknown chain: ${(row as ReputationWrite).chain}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'unknown error'
      const nextAttempts = row.attempts + 1
      await markReputationWriteFailed(row.id, nextAttempts, errorMessage, 5, row.chain)
      if (nextAttempts >= 5) gaveUp++
      else failed++
      errors.push({ id: row.id, error: errorMessage })
    }
  }

  return NextResponse.json({
    processed,
    written,
    failed,
    gave_up: gaveUp,
    errors,
  })
}

// Vercel Cron uses GET by default. Accept both.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req)
}
