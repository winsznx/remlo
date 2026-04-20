import { NextResponse } from 'next/server'
import {
  aggregateTempoReputation,
  fetchAgentURI,
} from '@/lib/reputation/erc8004'

/**
 * GET /api/agents/remlo
 *
 * Public machine-readable endpoint — other protocols discovering Remlo
 * (e.g. ERC-8004-aware indexers, x402 catalog crawlers) can fetch this to
 * learn about Remlo's agent IDs and endpoints. Response includes cached
 * Tempo reputation summaries + an `updated_at` timestamp.
 *
 * Cached at the Next data layer (revalidate = 300) so RPC pressure stays low
 * under discovery-crawler volume.
 */
export const revalidate = 300

export async function GET() {
  const payrollAgentId = process.env.REMLO_PAYROLL_AGENT_ID ?? '0'
  const validatorAgentId = process.env.REMLO_VALIDATOR_AGENT_ID ?? '0'
  const identityRegistry =
    process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY ?? null

  const [payroll, validator] = await Promise.all([
    buildAgentEntry({
      agentId: payrollAgentId,
      name: 'Remlo Payroll Agent',
      description:
        'Broadcasts payroll batches, x402 agent-pay calls, and Solana payroll streams on behalf of Remlo-managed employers.',
      services: [
        { name: 'agent_pay', endpoint: 'https://remlo.xyz/api/mpp/agent/pay' },
        { name: 'payroll_status', endpoint: 'https://remlo.xyz/api/mpp/payroll/status' },
      ],
    }),
    buildAgentEntry({
      agentId: validatorAgentId,
      name: 'Remlo Validator Agent',
      description:
        'Signs post_verdict on every remlo_escrow settlement after the consensus engine resolves. Authority bound to the Privy Solana server wallet.',
      services: [
        { name: 'escrow_post', endpoint: 'https://remlo.xyz/api/mpp/escrow/post' },
        { name: 'escrow_deliver', endpoint: 'https://remlo.xyz/api/mpp/escrow/deliver' },
        {
          name: 'escrow_deliver_signed',
          endpoint: 'https://remlo.xyz/api/mpp/escrow/deliver-signed',
        },
        { name: 'escrow_status', endpoint: 'https://remlo.xyz/api/mpp/escrow/{id}/status' },
      ],
    }),
  ])

  return NextResponse.json({
    agents: [payroll, validator],
    identity_registry: identityRegistry,
    chain: 'tempo',
    chain_id: 42431,
    well_known_registration: 'https://remlo.xyz/.well-known/agent-registration.json',
    updated_at: new Date().toISOString(),
    cache_ttl_seconds: 300,
  })
}

async function buildAgentEntry(input: {
  agentId: string
  name: string
  description: string
  services: Array<{ name: string; endpoint: string }>
}) {
  const [agentUri, reputation] = await Promise.all([
    fetchAgentURI(input.agentId).catch(() => null),
    aggregateTempoReputation(input.agentId).catch(() => null),
  ])
  return {
    agent_id: input.agentId,
    name: input.name,
    description: input.description,
    agent_uri: agentUri,
    services: input.services,
    reputation_summary: reputation
      ? {
          total_feedback_count: reputation.totalFeedbackCount,
          average_score: reputation.averageScore,
          feedback_by_tag: reputation.feedbackByTag,
          first_feedback_at: reputation.firstFeedbackAt,
          latest_feedback_at: reputation.latestFeedbackAt,
        }
      : null,
  }
}
