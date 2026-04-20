/**
 * lib/reputation-tiers.ts — Ship 7 J4 reputation-gated timelock.
 *
 * Pure application-layer function that maps a worker's SAS attestation count
 * onto a reputation tier and shortens requested escrow expiry accordingly.
 * The Anchor program is unchanged — it enforces whatever timestamp is passed
 * as long as it's within [MIN_EXPIRY, MAX_EXPIRY]. Tiering happens in
 * postEscrow before the tx is built.
 *
 * Policy (tiers are based on SAS attestation count):
 *   - unknown (0 attestations):       no floor — worker gets the full requested duration.
 *   - new (1-4):                       floor = max(requested, 24h)
 *   - established (5-19):              floor = max(requested * 0.75, 6h)
 *   - trusted (20+):                   floor = max(requested * 0.5, 2h)
 *
 * Intent: unknown workers get maximum protection (full waiting period). Highly
 * reputable workers (20+ attestations) have earned shorter floors — the
 * escrow can expire faster without exposing the requester to undue risk
 * because the worker's track record backs shorter timelines.
 *
 * Result is always bounded [minHours, maxHours] — regardless of what the
 * formula produces, we never return a value outside the Anchor program's
 * enforced range.
 */

export type ReputationTier = 'unknown' | 'new' | 'established' | 'trusted'

export interface ReputationTierInfo {
  tier: ReputationTier
  minAttestations: number
  description: string
}

export const TIER_INFO: Record<ReputationTier, ReputationTierInfo> = {
  unknown: {
    tier: 'unknown',
    minAttestations: 0,
    description: 'No prior SAS attestations. Maximum escrow waiting period applies.',
  },
  new: {
    tier: 'new',
    minAttestations: 1,
    description: '1-4 prior attestations. Standard waiting period floor of 24h.',
  },
  established: {
    tier: 'established',
    minAttestations: 5,
    description: '5-19 prior attestations. Reduced waiting period floor (6h).',
  },
  trusted: {
    tier: 'trusted',
    minAttestations: 20,
    description: '20+ prior attestations. Shortest waiting period floor (2h).',
  },
}

export function getTierForAttestationCount(count: number): ReputationTierInfo {
  if (!Number.isFinite(count) || count <= 0) return TIER_INFO.unknown
  if (count >= 20) return TIER_INFO.trusted
  if (count >= 5) return TIER_INFO.established
  return TIER_INFO.new
}

/**
 * Pure function. Given the worker's SAS attestation count + the requested
 * expiry hours, returns the hours to actually apply. Bounded to
 * [minHours, maxHours] — matches the Anchor program's MIN_EXPIRY / MAX_EXPIRY
 * (1h and 168h respectively at time of writing).
 *
 * Semantics:
 *   - unknown: applied = requested (bounded). Worker is unknown, so we give
 *     them the full waiting period the requester asked for. This is the most
 *     conservative choice — we don't shorten the expiry for an unproven worker.
 *   - new/established/trusted: applied = max(requested * mult, floor), bounded.
 *     The floor prevents an overly short expiry even if the requester asked for
 *     one too small; the multiplier scales down the waiting period for known
 *     workers.
 */
export function computeExpiryHoursForWorker(
  workerAttestationCount: number,
  requestedHours: number,
  minHours: number = 1,
  maxHours: number = 168,
): number {
  const tier = getTierForAttestationCount(workerAttestationCount).tier

  let effective: number
  switch (tier) {
    case 'unknown':
      effective = requestedHours
      break
    case 'new':
      effective = Math.max(requestedHours, 24)
      break
    case 'established':
      effective = Math.max(requestedHours * 0.75, 6)
      break
    case 'trusted':
      effective = Math.max(requestedHours * 0.5, 2)
      break
  }

  if (!Number.isFinite(effective) || effective <= 0) effective = requestedHours

  // Bound to the Anchor program's hard limits.
  const bounded = Math.max(minHours, Math.min(maxHours, effective))
  // Round to nearest hour so the UI + audit trail never show fractional hours.
  return Math.round(bounded)
}
