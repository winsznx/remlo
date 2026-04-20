import { NextResponse } from 'next/server'

/**
 * GET /.well-known/agent-registration/payroll
 *
 * Per-agent ERC-8004 registration detail for the Remlo Payroll Agent. The
 * on-chain IdentityRegistry entry's agentURI points to this URL. Readers
 * (other protocols, explorers, x402 clients) dereference it to learn what
 * the agent does and how to reach it.
 */
export async function GET(): Promise<NextResponse> {
  const identityRegistry = process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY ?? ''
  const payrollAgentId = process.env.REMLO_PAYROLL_AGENT_ID ?? ''

  return NextResponse.json(
    {
      type: 'erc8004-agent-registration',
      name: 'Remlo Payroll Agent',
      description:
        'Autonomous payroll execution agent for Remlo employers. Broadcasts USDC payments ' +
        'on Solana devnet and pathUSD payments on Tempo L1 after LLM-reasoned plan review. ' +
        'Gated by employer-granted authorization with per-tx and per-day spend caps. Every ' +
        'successful disbursement writes reputation (SAS on Solana, ERC-8004 feedback on Tempo).',
      image: 'https://remlo.xyz/og/payroll-agent.png',
      registrations: [
        {
          agentRegistry: identityRegistry,
          agentId: payrollAgentId ? Number(payrollAgentId) : null,
        },
      ],
      services: [
        { type: 'A2A', endpoint: 'https://remlo.xyz/api/mpp/agent/pay', version: '1' },
        { type: 'MPP', endpoint: 'https://remlo.xyz/api/mpp', version: '1' },
        { type: 'web', endpoint: 'https://remlo.xyz/dashboard/agent' },
      ],
      supportedTrust: ['reputation'],
      x402Support: true,
      active: true,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
