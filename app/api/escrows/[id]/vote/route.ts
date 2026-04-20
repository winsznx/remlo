import { NextRequest, NextResponse } from 'next/server'
import { getPrivyClaims, isPlatformAdminUserId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { tryFinalizeConsensus, settleOrRefund } from '@/lib/escrow'

/**
 * POST /api/escrows/[id]/vote
 *
 * Ship 6 — human / external-oracle validator vote endpoint. Caller must be
 * a registered validator for the escrow's employer (row in
 * `escrow_validator_configs` where validator_id = caller's Privy user id)
 * OR a platform admin.
 *
 * On successful vote:
 *   1. Inserts into validator_votes (one per validator per escrow — enforced
 *      by the UNIQUE constraint)
 *   2. Re-evaluates consensus
 *   3. If consensus reached → writeVerdict on-chain + settle/refund
 *   4. Returns { voted, consensus } so the caller UI can reflect state
 *
 * Body: { verdict: 'approved' | 'rejected', reasoning?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: escrowId } = await params
  const claims = getPrivyClaims(req)
  if (!claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { verdict?: string; reasoning?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (body.verdict !== 'approved' && body.verdict !== 'rejected') {
    return NextResponse.json(
      { error: "verdict must be 'approved' or 'rejected'" },
      { status: 400 },
    )
  }

  const supabase = createServerClient()

  // Look up escrow
  const { data: escrow } = await supabase
    .from('escrows')
    .select('id, employer_id, status, verdict_signature')
    .eq('id', escrowId)
    .single()
  if (!escrow) {
    return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
  }
  if (escrow.verdict_signature) {
    return NextResponse.json(
      { error: 'Escrow verdict already finalized on-chain' },
      { status: 409 },
    )
  }

  // Authorize: caller must be a registered validator for this employer OR admin.
  const isAdmin = isPlatformAdminUserId(claims.sub)
  let validatorConfig: {
    validator_id: string
    validator_address: string
    validator_type: 'llm_claude' | 'llm_gpt4' | 'human' | 'oracle'
  } | null = null

  if (!isAdmin) {
    const { data } = await supabase
      .from('escrow_validator_configs')
      .select('validator_id, validator_address, validator_type')
      .eq('employer_id', escrow.employer_id)
      .eq('validator_id', claims.sub)
      .eq('active', true)
      .maybeSingle()
    if (!data) {
      return NextResponse.json(
        { error: 'Caller is not a registered validator for this escrow' },
        { status: 403 },
      )
    }
    validatorConfig = data
  } else {
    // Platform admin path — record the admin Privy user id as the validator
    // identity so the vote is traceable. Address uses the user id (no Solana
    // pubkey required for admin overrides).
    validatorConfig = {
      validator_id: claims.sub,
      validator_address: `admin:${claims.sub}`,
      validator_type: 'human',
    }
  }

  // Cast the vote (UNIQUE constraint prevents double-voting)
  const { error: insertError } = await supabase.from('validator_votes').insert({
    escrow_id: escrowId,
    validator_id: validatorConfig.validator_id,
    validator_address: validatorConfig.validator_address,
    validator_type: validatorConfig.validator_type,
    verdict: body.verdict,
    confidence: null, // human votes don't carry a model confidence
    reasoning: body.reasoning?.slice(0, 2000) ?? null,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'You have already voted on this escrow' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: `Failed to record vote: ${insertError.message}` },
      { status: 500 },
    )
  }

  // Re-evaluate consensus. If reached, tryFinalizeConsensus broadcasts
  // post_verdict on-chain + returns consensus_reached=true; then we settle.
  const result = await tryFinalizeConsensus(escrowId)
  if (result.consensus_reached) {
    try {
      await settleOrRefund(escrowId, result.verdict)
    } catch (err) {
      console.error(
        `[vote ${escrowId}] settle failed after consensus:`,
        err instanceof Error ? err.message : err,
      )
      // Don't fail the vote — on-chain verdict is already written; settle
      // cron will pick it up.
    }
  }

  return NextResponse.json({
    voted: true,
    consensus: {
      reached: result.consensus_reached,
      verdict: result.verdict,
      confidence: result.confidence,
      reasoning: result.reasoning,
    },
  })
}
