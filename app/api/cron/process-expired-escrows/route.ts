import { NextRequest, NextResponse } from 'next/server'
import { processExpiredEscrows } from '@/lib/escrow'

/**
 * POST /api/cron/process-expired-escrows
 *
 * Cranks expired escrows into the `expired_refunded` state by broadcasting
 * the permissionless refund(Expired) instruction. Refund destinations are
 * fixed by the on-chain escrow account (requester ATA); the server just
 * submits the tx. Vercel Cron hits this every 15 minutes per vercel.json.
 *
 * Auth: either X-Cron-Secret header matching CRON_SECRET env (ops invocation)
 * OR the Vercel-signed header `authorization: Bearer <CRON_SECRET>` (Vercel
 * Cron pattern). If CRON_SECRET is not configured, returns 501 rather than
 * leaving the endpoint open.
 */
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

  const result = await processExpiredEscrows()
  return NextResponse.json(result)
}

// Vercel Cron uses GET by default. Accept both.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req)
}
