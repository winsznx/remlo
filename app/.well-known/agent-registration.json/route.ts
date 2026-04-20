import { NextResponse } from 'next/server'

/**
 * GET /.well-known/agent-registration.json
 *
 * Canonical ERC-8004 agent-registration file — the spec puts a single file at
 * this path per domain, with a `registrations` array listing every on-chain
 * identity the domain operates. Remlo operates two: the payroll agent and the
 * validator agent, both registered in the Tempo Moderato IdentityRegistry.
 *
 * Per-agent richer detail lives at /.well-known/agent-registration/{name}.
 */
export async function GET(): Promise<NextResponse> {
  const identityRegistry = process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY ?? ''
  const payrollAgentId = process.env.REMLO_PAYROLL_AGENT_ID ?? ''
  const validatorAgentId = process.env.REMLO_VALIDATOR_AGENT_ID ?? ''

  return NextResponse.json(
    {
      type: 'erc8004-agent-registration',
      name: 'Remlo',
      description:
        'Remlo operates two autonomous agents: a payroll agent that executes USDC and ' +
        'pathUSD disbursements, and a validator agent that judges escrow deliverables with ' +
        'LLM-reasoned verdicts. Both build portable on-chain reputation as a byproduct of work.',
      image: 'https://remlo.xyz/og/agents.png',
      registrations: [
        {
          agentRegistry: identityRegistry,
          agentId: payrollAgentId ? Number(payrollAgentId) : null,
          role: 'payroll',
          detail: 'https://remlo.xyz/.well-known/agent-registration/payroll',
        },
        {
          agentRegistry: identityRegistry,
          agentId: validatorAgentId ? Number(validatorAgentId) : null,
          role: 'validator',
          detail: 'https://remlo.xyz/.well-known/agent-registration/validator',
        },
      ],
      services: [
        { type: 'A2A', endpoint: 'https://remlo.xyz/api/mpp/agent/pay' },
        { type: 'MPP', endpoint: 'https://remlo.xyz/api/mpp' },
        { type: 'reputation', endpoint: 'https://remlo.xyz/api/reputation' },
        { type: 'web', endpoint: 'https://remlo.xyz/dashboard/agent' },
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
