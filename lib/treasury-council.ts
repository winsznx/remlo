/**
 * lib/treasury-council.ts — Ship 7 J3 specialist treasury council.
 *
 * Reuses Ship 6's consensus primitive (lib/validators/consensus.ts) with a
 * second decision_type discriminator. Three specialists vote in parallel;
 * simple_majority over 3 yields council_approved when 2+ specialists agree.
 *
 * Supported action_type values (Ship 7 scope):
 *   - yield_route_change: DB-only (updates employer yield preference)
 *   - allocation_rebalance: no-op stub (TODO: wire to yield router)
 *   - large_payroll_approval: flags a payroll_run as council-approved; the
 *     execute path sets payroll_runs.council_approved_at which the payroll
 *     executor reads as a gate when amount > LARGE_PAYROLL_THRESHOLD.
 */
import { createServerClient } from '@/lib/supabase-server'
import {
  CLAUDE_MODEL,
  extractTextContent,
  getAnthropicClient,
} from '@/lib/claude'
import {
  DEFAULT_CONSENSUS,
  evaluateConsensus,
  type ConsensusConfig,
  type ValidatorVote,
} from '@/lib/validators/consensus'
import {
  ALL_SPECIALISTS,
  type SpecialistConfig,
} from '@/lib/agents/specialists'
import type { Database } from '@/lib/database.types'

export type TreasuryDecisionRow =
  Database['public']['Tables']['treasury_decisions']['Row']
export type TreasuryDecisionInsert =
  Database['public']['Tables']['treasury_decisions']['Insert']

export type TreasuryActionType = TreasuryDecisionRow['action_type']
export type TreasuryActionStatus = TreasuryDecisionRow['status']

// ─── Consensus config for the council ───────────────────────────────────────
// 3 specialists, simple_majority — approve on 2/3, reject on 2/3.
const COUNCIL_CONSENSUS: ConsensusConfig = {
  ...DEFAULT_CONSENSUS,
  strategy: 'simple_majority',
  requiredVotes: ALL_SPECIALISTS.length,
  tiebreaker: 'reject',
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ProposeTreasuryActionParams {
  employerId: string
  actionType: TreasuryActionType
  actionPayload: Record<string, unknown>
  rationale: string
  proposerUserId?: string | null
}

/**
 * Inserts a new decision row in `pending_council` status and fires the
 * council validation in the background. Caller receives the decision_id and
 * polls the GET endpoint to observe the verdict.
 */
export async function proposeTreasuryAction(
  params: ProposeTreasuryActionParams,
): Promise<TreasuryDecisionRow> {
  if (!params.rationale.trim()) {
    throw new Error('rationale is required')
  }
  if (params.rationale.length > 4000) {
    throw new Error('rationale exceeds 4000 characters')
  }

  const sb = createServerClient()
  const insert: TreasuryDecisionInsert = {
    employer_id: params.employerId,
    action_type: params.actionType,
    action_payload: params.actionPayload,
    rationale: params.rationale,
    status: 'pending_council',
    proposer_user_id: params.proposerUserId ?? null,
  }
  const { data, error } = await sb
    .from('treasury_decisions')
    .insert(insert)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(`Failed to insert treasury decision: ${error?.message ?? 'unknown'}`)
  }

  // Fire council validation async — don't block the proposer's response.
  void runCouncilValidation(data.id).catch((err) => {
    console.error(
      `[treasury-council ${data.id}] runCouncilValidation failed:`,
      err instanceof Error ? err.message : err,
    )
  })

  return data
}

/**
 * Runs all three specialists in parallel, inserts their votes with
 * decision_type='treasury_action', evaluates consensus, and updates the
 * decision row's status accordingly.
 */
export async function runCouncilValidation(decisionId: string): Promise<void> {
  const sb = createServerClient()
  const { data: decision } = await sb
    .from('treasury_decisions')
    .select('*')
    .eq('id', decisionId)
    .single()
  if (!decision) throw new Error(`Treasury decision ${decisionId} not found`)
  if (decision.status !== 'pending_council') {
    // Already validated — idempotent no-op.
    return
  }

  const anthropic = getAnthropicClient()
  if (!anthropic) {
    await sb
      .from('treasury_decisions')
      .update({
        status: 'council_rejected',
        council_verdict: 'rejected',
        council_reasoning:
          'Council validation failed: no Anthropic API key configured on server. Auto-rejected to unblock decision pipeline.',
        finalized_at: new Date().toISOString(),
      })
      .eq('id', decisionId)
    return
  }

  // Run all three specialists in parallel. Each returns an independent verdict.
  const results = await Promise.all(
    ALL_SPECIALISTS.map((spec) =>
      runSpecialist(spec, decision.action_type, decision.action_payload, decision.rationale),
    ),
  )

  // Insert the three votes with decision_type='treasury_action'. escrow_id
  // carries the decision_id (repurposed column per migration 20260423 — the FK
  // was dropped to allow this dual-use).
  const voteRows = results.map((r, i) => {
    const spec = ALL_SPECIALISTS[i]
    return {
      escrow_id: decisionId,
      validator_id: spec.identifier,
      validator_address: spec.identifier,
      validator_type: spec.validatorType,
      verdict: r.verdict,
      confidence: Math.min(1, Math.max(0, r.confidence / 100)),
      reasoning: r.reasoning.slice(0, 4000),
      decision_type: 'treasury_action' as const,
    }
  })

  const { error: voteErr } = await sb.from('validator_votes').insert(voteRows)
  if (voteErr) {
    await sb
      .from('treasury_decisions')
      .update({
        status: 'council_rejected',
        council_verdict: 'rejected',
        council_reasoning: `Failed to persist specialist votes: ${voteErr.message}`,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', decisionId)
    return
  }

  // Evaluate consensus using Ship 6's pure engine. The votes are already
  // shape-compatible with ValidatorVote (plus decision_type, which evaluateConsensus ignores).
  const votesForConsensus: ValidatorVote[] = voteRows.map((v) => ({
    id: '', // not read by evaluateConsensus
    escrow_id: v.escrow_id,
    validator_id: v.validator_id,
    validator_address: v.validator_address,
    validator_type: v.validator_type,
    verdict: v.verdict,
    confidence: v.confidence,
    reasoning: v.reasoning,
    voted_at: new Date().toISOString(),
    decision_type: v.decision_type,
  }))
  const consensus = evaluateConsensus(votesForConsensus, COUNCIL_CONSENSUS)

  const councilReasoning = buildCouncilReasoning(
    ALL_SPECIALISTS,
    results,
    consensus.verdict,
    consensus.approveCount,
    consensus.rejectCount,
  )

  const newStatus: TreasuryActionStatus =
    consensus.verdict === 'approved' ? 'council_approved' : 'council_rejected'

  await sb
    .from('treasury_decisions')
    .update({
      status: newStatus,
      council_verdict: consensus.verdict === 'approved' ? 'approved' : 'rejected',
      council_confidence: consensus.confidence,
      council_reasoning: councilReasoning,
      finalized_at: new Date().toISOString(),
    })
    .eq('id', decisionId)
}

interface SpecialistResult {
  verdict: 'approved' | 'rejected'
  confidence: number
  reasoning: string
}

async function runSpecialist(
  spec: SpecialistConfig,
  actionType: TreasuryActionType,
  actionPayload: Record<string, unknown>,
  rationale: string,
): Promise<SpecialistResult> {
  const anthropic = getAnthropicClient()
  if (!anthropic) {
    return {
      verdict: 'rejected',
      confidence: 100,
      reasoning: `${spec.displayName}: no Anthropic API key configured — auto-reject.`,
    }
  }

  const userMessage = [
    `Proposed treasury action: ${actionType}`,
    '',
    'Action payload:',
    JSON.stringify(actionPayload, null, 2),
    '',
    'Proposer rationale:',
    rationale,
  ].join('\n')

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: spec.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    const text = extractTextContent(response.content)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        verdict: 'rejected',
        confidence: 100,
        reasoning: `${spec.displayName}: specialist did not return JSON — auto-reject.`,
      }
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      verdict?: string
      confidence?: number
      reasoning?: string
    }
    if (parsed.verdict !== 'approved' && parsed.verdict !== 'rejected') {
      return {
        verdict: 'rejected',
        confidence: 100,
        reasoning: `${spec.displayName}: invalid verdict '${parsed.verdict}' — auto-reject.`,
      }
    }
    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
        : 50
    return {
      verdict: parsed.verdict,
      confidence,
      reasoning: parsed.reasoning ?? `${spec.displayName}: no reasoning provided.`,
    }
  } catch (err) {
    return {
      verdict: 'rejected',
      confidence: 100,
      reasoning: `${spec.displayName}: call failed (${err instanceof Error ? err.message : 'unknown'}) — auto-reject.`,
    }
  }
}

function buildCouncilReasoning(
  specs: readonly SpecialistConfig[],
  results: SpecialistResult[],
  verdict: 'approved' | 'rejected' | 'pending',
  approveCount: number,
  rejectCount: number,
): string {
  const header = `Council verdict: ${verdict.toUpperCase()} — ${approveCount} approve / ${rejectCount} reject (${specs.length} specialists).`
  const specistLines = specs.map((spec, i) => {
    const r = results[i]
    return `  · ${spec.displayName}: ${r.verdict} @ ${r.confidence}% — ${r.reasoning.slice(0, 240)}`
  })
  return [header, ...specistLines].join('\n').slice(0, 6000)
}

// ─── Execution ──────────────────────────────────────────────────────────────

/**
 * Execute a council-approved action. Idempotent: re-execution on an already-
 * executed decision is a no-op that returns the prior signature.
 */
export async function executeTreasuryAction(decisionId: string): Promise<{
  signature: string | null
  message: string
}> {
  const sb = createServerClient()
  const { data: decision } = await sb
    .from('treasury_decisions')
    .select('*')
    .eq('id', decisionId)
    .single()
  if (!decision) throw new Error(`Treasury decision ${decisionId} not found`)
  if (decision.status === 'executed') {
    return {
      signature: decision.execution_signature,
      message: 'Decision already executed — returning existing signature.',
    }
  }
  if (decision.status !== 'council_approved') {
    throw new Error(
      `Decision status is '${decision.status}' — execute requires 'council_approved'`,
    )
  }

  let signature: string | null = null
  let message = ''
  try {
    const outcome = await dispatchAction(decision)
    signature = outcome.signature
    message = outcome.message
    await sb
      .from('treasury_decisions')
      .update({
        status: 'executed',
        execution_signature: signature,
        execution_error: null,
        executed_at: new Date().toISOString(),
      })
      .eq('id', decisionId)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown error'
    await sb
      .from('treasury_decisions')
      .update({
        status: 'execution_failed',
        execution_error: errMsg.slice(0, 2000),
      })
      .eq('id', decisionId)
    throw err
  }

  return { signature, message }
}

async function dispatchAction(
  decision: TreasuryDecisionRow,
): Promise<{ signature: string | null; message: string }> {
  const sb = createServerClient()
  switch (decision.action_type) {
    case 'yield_route_change': {
      // DB-only: update employer yield preference.
      const payload = decision.action_payload as {
        target_route?: string
      }
      if (!payload.target_route) {
        throw new Error('yield_route_change requires action_payload.target_route')
      }
      // We don't have a dedicated yield_route column on employers — store
      // intent as a JSON blob on employers.yield_preference for now. If that
      // column doesn't exist either, the DB rejects the update cleanly and
      // the caller sees execution_failed with the specific error.
      const { error } = await sb
        .from('employers')
        .update({ yield_preference: payload.target_route })
        .eq('id', decision.employer_id)
      if (error) throw new Error(`yield_preference update failed: ${error.message}`)
      return { signature: null, message: `Yield route set to ${payload.target_route}` }
    }
    case 'allocation_rebalance': {
      // Stub: rebalance logic is Ship 8+. Mark executed with null signature
      // and a descriptive message so the UI can show "flagged; no tx".
      return {
        signature: null,
        message:
          'Allocation rebalance recorded. On-chain execution is Ship 8+ scope — council approval captured for audit trail.',
      }
    }
    case 'large_payroll_approval': {
      const payload = decision.action_payload as { payroll_run_id?: string }
      if (!payload.payroll_run_id) {
        throw new Error('large_payroll_approval requires action_payload.payroll_run_id')
      }
      const { error } = await sb
        .from('payroll_runs')
        .update({
          council_approved_at: new Date().toISOString(),
        })
        .eq('id', payload.payroll_run_id)
        .eq('employer_id', decision.employer_id)
      if (error) throw new Error(`payroll_run approval failed: ${error.message}`)
      return {
        signature: null,
        message: `Payroll run ${payload.payroll_run_id} marked council-approved. The payroll executor will now release the run.`,
      }
    }
  }
}

// ─── Read helpers ───────────────────────────────────────────────────────────

export async function listTreasuryDecisions(
  employerId: string,
): Promise<TreasuryDecisionRow[]> {
  const sb = createServerClient()
  const { data } = await sb
    .from('treasury_decisions')
    .select('*')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export interface TreasuryDecisionDetail {
  decision: TreasuryDecisionRow
  votes: ValidatorVote[]
}

export async function getTreasuryDecisionDetail(
  decisionId: string,
  employerId: string,
): Promise<TreasuryDecisionDetail | null> {
  const sb = createServerClient()
  const { data: decision } = await sb
    .from('treasury_decisions')
    .select('*')
    .eq('id', decisionId)
    .eq('employer_id', employerId)
    .single()
  if (!decision) return null
  const { data: votes } = await sb
    .from('validator_votes')
    .select('*')
    .eq('escrow_id', decisionId)
    .eq('decision_type', 'treasury_action')
    .order('voted_at', { ascending: true })
  return { decision, votes: (votes ?? []) as ValidatorVote[] }
}
