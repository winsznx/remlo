/**
 * lib/reputation.ts — cross-chain aggregator.
 *
 * Single read-side entry point for the dashboard and the public
 * /api/reputation/{address} endpoint. Composes SAS (Solana) + ERC-8004
 * (Tempo) reads into a unified view.
 */
import {
  aggregateSolanaReputation,
  type SolanaReputationSummary,
} from '@/lib/reputation/sas'
import {
  aggregateTempoReputation,
  type TempoReputationSummary,
} from '@/lib/reputation/erc8004'

export interface UnifiedReputationSummary {
  totalPayments: number
  totalValueMovedBaseUnits: string
  agentFeedbackScore: number | null
  agentFeedbackCount: number
  workerAttestationCount: number
  firstActivityAt: string | null
  latestActivityAt: string | null
}

export interface CrossChainReputation {
  subject: { solana?: string; tempo_agent_id?: string }
  solana: SolanaReputationSummary | null
  tempo: TempoReputationSummary | null
  unified: UnifiedReputationSummary
  last_updated: string
}

export async function getReputationForSolanaAddress(
  address: string,
): Promise<SolanaReputationSummary> {
  return aggregateSolanaReputation(address)
}

export async function getReputationForTempoAgent(
  agentId: string,
): Promise<TempoReputationSummary> {
  return aggregateTempoReputation(agentId)
}

export async function getCrossChainReputation(input: {
  solanaAddress?: string
  tempoAgentId?: string
}): Promise<CrossChainReputation> {
  const [solana, tempo] = await Promise.all([
    input.solanaAddress ? aggregateSolanaReputation(input.solanaAddress) : Promise.resolve(null),
    input.tempoAgentId ? aggregateTempoReputation(input.tempoAgentId) : Promise.resolve(null),
  ])

  const times: string[] = []
  if (solana?.firstAttestationAt) times.push(solana.firstAttestationAt)
  if (solana?.latestAttestationAt) times.push(solana.latestAttestationAt)
  if (tempo?.firstFeedbackAt) times.push(tempo.firstFeedbackAt)
  if (tempo?.latestFeedbackAt) times.push(tempo.latestFeedbackAt)
  times.sort()

  return {
    subject: {
      solana: input.solanaAddress,
      tempo_agent_id: input.tempoAgentId,
    },
    solana,
    tempo,
    unified: {
      totalPayments: solana?.totalPaymentsReceived ?? 0,
      totalValueMovedBaseUnits: (solana?.totalAmountBaseUnits ?? 0n).toString(),
      agentFeedbackScore: tempo?.averageScore ?? null,
      agentFeedbackCount: tempo?.totalFeedbackCount ?? 0,
      workerAttestationCount:
        (solana?.totalPaymentsReceived ?? 0) +
        (solana?.settledEscrows ?? 0) +
        (solana?.refundedEscrows ?? 0),
      firstActivityAt: times[0] ?? null,
      latestActivityAt: times[times.length - 1] ?? null,
    },
    last_updated: new Date().toISOString(),
  }
}
