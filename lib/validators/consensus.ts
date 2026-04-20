/**
 * lib/validators/consensus.ts
 *
 * Ship 6 — evaluates whether a set of validator votes satisfies a consensus
 * rule. Pure functions, no DB or chain side effects; callers are responsible
 * for reading votes + acting on the result.
 *
 * Current strategies:
 *   - simple_majority — approve wins if approveCount > rejectCount once
 *     totalVotes >= requiredVotes. Ties fall back to the `tiebreaker`.
 *   - unanimous — all votes must be `approved`; any reject fails the set.
 *   - weighted — same as simple_majority but sums `weight` instead of count.
 *     (Requires votes to carry `weight`; callers hydrate from
 *     escrow_validator_configs before invoking.)
 */
import type { Database } from '@/lib/database.types'

export type ValidatorVote = Database['public']['Tables']['validator_votes']['Row']

export type ConsensusStrategy = 'simple_majority' | 'unanimous' | 'weighted'

export interface ConsensusConfig {
  strategy: ConsensusStrategy
  /** Minimum votes before consensus is callable. 1 = single-validator fast path. */
  requiredVotes: number
  /** Seconds to wait before falling back to `tiebreaker` on a stalled vote set. */
  timeoutSeconds: number
  /** Default when consensus can't resolve cleanly (strict tie, unanimous failure). */
  tiebreaker: 'approve' | 'reject'
}

export const DEFAULT_CONSENSUS: ConsensusConfig = {
  strategy: 'simple_majority',
  requiredVotes: 1,
  timeoutSeconds: 300,
  tiebreaker: 'reject',
}

export interface ConsensusResult {
  reached: boolean
  verdict: 'approved' | 'rejected' | 'pending'
  approveCount: number
  rejectCount: number
  totalVotes: number
  requiredVotes: number
  /** Average confidence of the winning side (0.0–1.0). 0 if no votes on that side. */
  confidence: number
}

interface VoteWithWeight extends ValidatorVote {
  weight?: number
}

export function evaluateConsensus(
  votes: ValidatorVote[],
  config: ConsensusConfig = DEFAULT_CONSENSUS,
): ConsensusResult {
  const approves = votes.filter((v) => v.verdict === 'approved')
  const rejects = votes.filter((v) => v.verdict === 'rejected')
  const totalVotes = votes.length

  const result: ConsensusResult = {
    reached: false,
    verdict: 'pending',
    approveCount: approves.length,
    rejectCount: rejects.length,
    totalVotes,
    requiredVotes: config.requiredVotes,
    confidence: 0,
  }

  if (totalVotes < config.requiredVotes) {
    return result
  }

  const winner = pickWinner(votes, config)
  if (!winner) {
    // Tie (simple_majority with even split, or unanimous with any reject)
    result.reached = true
    result.verdict = config.tiebreaker === 'approve' ? 'approved' : 'rejected'
    const fallbackSide = result.verdict === 'approved' ? approves : rejects
    result.confidence = averageConfidence(fallbackSide)
    return result
  }

  result.reached = true
  result.verdict = winner
  const winningSide = winner === 'approved' ? approves : rejects
  result.confidence = averageConfidence(winningSide)
  return result
}

export function isConsensusReached(
  votes: ValidatorVote[],
  config: ConsensusConfig = DEFAULT_CONSENSUS,
): boolean {
  return evaluateConsensus(votes, config).reached
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickWinner(
  votes: VoteWithWeight[],
  config: ConsensusConfig,
): 'approved' | 'rejected' | null {
  if (config.strategy === 'unanimous') {
    // Any reject fails the approval; all-approved passes.
    return votes.every((v) => v.verdict === 'approved') ? 'approved' : null
  }

  const approveWeight = sumWeight(
    votes.filter((v) => v.verdict === 'approved'),
    config.strategy,
  )
  const rejectWeight = sumWeight(
    votes.filter((v) => v.verdict === 'rejected'),
    config.strategy,
  )

  if (approveWeight > rejectWeight) return 'approved'
  if (rejectWeight > approveWeight) return 'rejected'
  return null
}

function sumWeight(subset: VoteWithWeight[], strategy: ConsensusStrategy): number {
  if (strategy === 'weighted') {
    return subset.reduce((sum, v) => sum + (v.weight ?? 1), 0)
  }
  return subset.length
}

function averageConfidence(subset: ValidatorVote[]): number {
  if (subset.length === 0) return 0
  const withConfidence = subset.filter(
    (v): v is ValidatorVote & { confidence: number } =>
      typeof v.confidence === 'number' && Number.isFinite(v.confidence),
  )
  if (withConfidence.length === 0) return 0
  return (
    withConfidence.reduce((sum, v) => sum + v.confidence, 0) / withConfidence.length
  )
}
