import { NextResponse } from 'next/server'

/**
 * GET /.well-known/agent-registration/validator
 *
 * Per-agent ERC-8004 registration detail for the Remlo Validator Agent.
 * The validator is the LLM-reasoned judge that posts verdicts on Solana
 * escrows and signs attestations that approved settlements match the rubric.
 */
export async function GET(): Promise<NextResponse> {
  const identityRegistry = process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY ?? ''
  const validatorAgentId = process.env.REMLO_VALIDATOR_AGENT_ID ?? ''

  return NextResponse.json(
    {
      type: 'erc8004-agent-registration',
      name: 'Remlo Validator Agent',
      description:
        'LLM-reasoned validator for Remlo escrow deliverables. Reads the posted rubric, ' +
        'fetches the submitted deliverable, and posts an on-chain verdict (approved or ' +
        'rejected) with confidence. Accumulates ERC-8004 feedback as clients rate verdict ' +
        'quality post-settlement.',
      image: 'https://remlo.xyz/og/validator-agent.png',
      registrations: [
        {
          agentRegistry: identityRegistry,
          agentId: validatorAgentId ? Number(validatorAgentId) : null,
        },
      ],
      services: [
        { type: 'validation', endpoint: 'https://remlo.xyz/api/mpp/escrow/validate', version: '1' },
        { type: 'web', endpoint: 'https://remlo.xyz/dashboard/escrows' },
      ],
      supportedTrust: ['reputation', 'validation'],
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
