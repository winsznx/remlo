import { NextRequest, NextResponse } from 'next/server'
import { getPrivyClaims, isPlatformAdminUserId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import {
  evaluateConsensus,
  DEFAULT_CONSENSUS,
  type ValidatorVote,
} from '@/lib/validators/consensus'

/**
 * GET /api/escrows/[id]/votes
 *
 * Ship 6 — returns the full vote set + consensus summary + two flags the
 * UI uses to decide whether to surface the "Cast your vote" form:
 *   - caller_is_validator: true if the caller's Privy user id is in
 *     escrow_validator_configs for this escrow's employer (or admin)
 *   - caller_has_voted: true if they've already voted
 *
 * Auth: Privy JWT required (same as vote endpoint). The data returned
 * is scoped to what the caller can see — employer owners see their own
 * escrow's votes via RLS.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: escrowId } = await params
  const claims = getPrivyClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: escrow } = await supabase
    .from('escrows')
    .select('id, employer_id, status')
    .eq('id', escrowId)
    .single()
  if (!escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })

  const { data: votes } = await supabase
    .from('validator_votes')
    .select('*')
    .eq('escrow_id', escrowId)
    .order('voted_at', { ascending: true })

  const voteRows = (votes ?? []) as ValidatorVote[]
  const consensus = evaluateConsensus(voteRows, DEFAULT_CONSENSUS)

  const isAdmin = isPlatformAdminUserId(claims.sub)
  let callerIsValidator = isAdmin
  let callerHasVoted = false

  if (!isAdmin) {
    const { data: cfg } = await supabase
      .from('escrow_validator_configs')
      .select('validator_id')
      .eq('employer_id', escrow.employer_id)
      .eq('validator_id', claims.sub)
      .eq('active', true)
      .maybeSingle()
    callerIsValidator = !!cfg
  }

  if (callerIsValidator) {
    callerHasVoted = voteRows.some((v) => v.validator_id === claims.sub)
  }

  return NextResponse.json({
    votes: voteRows,
    consensus,
    caller_is_validator: callerIsValidator,
    caller_has_voted: callerHasVoted,
  })
}
