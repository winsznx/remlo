import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { settleOrRefund, refundExpiredEscrow } from '@/lib/escrow'

/**
 * POST /api/escrows/[id]/crank
 *
 * Employer-authenticated convenience endpoint — UI's "crank settlement"
 * button hits this. The on-chain settle/refund is already permissionless;
 * this route just lets the dashboard trigger it without an x402 payment.
 */
type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const employer = await getCallerEmployer(req)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params

  const supabase = createServerClient()
  const { data: row } = await supabase
    .from('escrows')
    .select('id, employer_id, status, expires_at, validator_verdict')
    .eq('id', id)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
  if (row.employer_id !== employer.id) {
    return NextResponse.json({ error: 'Escrow belongs to a different employer' }, { status: 403 })
  }

  try {
    let signature: string
    // If validated, settle/refund per verdict. If past expiry and never validated,
    // crank the expiry refund. Otherwise we have nothing to do.
    if (row.status === 'validating' || (row.status === 'delivered' && row.validator_verdict)) {
      signature = await settleOrRefund(id)
    } else if (
      ['posted', 'delivered', 'validating'].includes(row.status) &&
      new Date(row.expires_at).getTime() < Date.now()
    ) {
      signature = await refundExpiredEscrow(id)
    } else {
      return NextResponse.json(
        { error: `Escrow status is ${row.status}; nothing to crank` },
        { status: 409 },
      )
    }

    return NextResponse.json({
      escrow_id: id,
      signature,
      solana_explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    )
  }
}
