import { multiRailRoute } from '@/lib/mpp-route'
import {
  verifyRegistrationProof,
  verifySolanaRegistrationProof,
  validateProfileInput,
} from '@/lib/agent-registration'
import { upsertAgentProfile, getAgentProfile } from '@/lib/queries/agent-profiles'

/**
 * Two flavors share this endpoint:
 *
 *   1. ERC-8004 (default): { agent_id, owner_address, timestamp_ms, signature, ... }
 *   2. Solana       (new):  { solana_pubkey, timestamp_ms, signature, ... }
 *
 * Discrimination is by which identity field is present. When both are
 * present (shouldn't happen, but if so) we prefer ERC-8004 since that's
 * the default chain for Tier 2 today.
 */
interface RegisterBody {
  agent_id?: string
  owner_address?: string
  solana_pubkey?: string
  timestamp_ms?: string | number
  signature?: string
  display_name?: unknown
  description?: unknown
  endpoint?: unknown
  capabilities?: unknown
  contact_url?: unknown
}

/**
 * POST /api/mpp/agents/register
 * Multi-rail $0.10 — accepts Tempo (mpp) or Base / Solana (x402).
 *
 * Registers an agent's profile in the Remlo directory. Identity is anchored
 * to an ERC-8004 token on Tempo:
 *
 *   1. The agent must already own a token via the IdentityRegistry contract.
 *      Mint one at /agents/register or via direct contract call before
 *      hitting this endpoint.
 *
 *   2. The caller signs a canonical Remlo message (see
 *      `buildRegistrationMessage`) with the EOA that owns the token. The
 *      server verifies via on-chain `ownerOf` + ECDSA recovery — no key
 *      material leaves the agent's environment.
 *
 *   3. Profile metadata (display_name, description, endpoint, capabilities,
 *      contact_url) is stored in `remlo_agent_profiles` and surfaced to
 *      employers via /agents and /dashboard/settings/agents.
 *
 * Re-registering with the same agent_id updates the profile in place — no
 * delete/recreate, no reputation reset. Only the owning EOA can update,
 * because the signature check binds to the on-chain owner.
 */
export const POST = multiRailRoute({
  amount: '0.10',
  description: 'Register agent on Remlo directory',
  handler: async ({ req }) => {
    let body: RegisterBody
    try {
      body = (await req.json()) as RegisterBody
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // ── Identity proof ────────────────────────────────────────────────────
    // Discriminate by which identity field is present.
    const isSolana = typeof body.solana_pubkey === 'string' && !body.agent_id
    const isTempo = typeof body.agent_id === 'string'
    if (!isSolana && !isTempo) {
      return Response.json(
        {
          error:
            'Provide either { agent_id, owner_address, signature, timestamp_ms } for ERC-8004, ' +
            'or { solana_pubkey, signature, timestamp_ms } for Solana.',
          code: 'MISSING_PROOF_FIELDS',
        },
        { status: 400 },
      )
    }
    if (typeof body.signature !== 'string') {
      return Response.json(
        { error: 'signature is required.', code: 'MISSING_SIGNATURE' },
        { status: 400 },
      )
    }
    const timestampMs =
      typeof body.timestamp_ms === 'string'
        ? body.timestamp_ms
        : typeof body.timestamp_ms === 'number'
          ? String(body.timestamp_ms)
          : ''
    if (!timestampMs) {
      return Response.json(
        { error: 'timestamp_ms is required.', code: 'MISSING_TIMESTAMP' },
        { status: 400 },
      )
    }

    let identity:
      | {
          kind: 'tempo'
          agentIdentifier: string
          erc8004AgentId: string
          ownerAddress: string
        }
      | {
          kind: 'solana'
          agentIdentifier: string
          solanaPubkey: string
        }

    if (isTempo) {
      if (typeof body.owner_address !== 'string') {
        return Response.json(
          { error: 'owner_address is required for ERC-8004 registration.', code: 'MISSING_OWNER' },
          { status: 400 },
        )
      }
      const proof = await verifyRegistrationProof({
        agentId: body.agent_id!,
        ownerAddress: body.owner_address,
        timestampMs,
        signature: body.signature,
      })
      if (!proof.ok) {
        return Response.json({ error: proof.error, code: proof.code }, { status: proof.status })
      }
      identity = {
        kind: 'tempo',
        agentIdentifier: `erc8004:tempo:${body.agent_id}`,
        erc8004AgentId: body.agent_id!,
        ownerAddress: proof.onchainOwner,
      }
    } else {
      const proof = await verifySolanaRegistrationProof({
        solanaPubkey: body.solana_pubkey!,
        timestampMs,
        signature: body.signature,
      })
      if (!proof.ok) {
        return Response.json({ error: proof.error, code: proof.code }, { status: proof.status })
      }
      identity = {
        kind: 'solana',
        agentIdentifier: `solana:${proof.solanaPubkey}`,
        solanaPubkey: proof.solanaPubkey,
      }
    }

    // ── Profile metadata ──────────────────────────────────────────────────
    let cleaned: ReturnType<typeof validateProfileInput>
    try {
      cleaned = validateProfileInput({
        display_name: body.display_name,
        description: body.description,
        endpoint: body.endpoint,
        capabilities: body.capabilities,
        contact_url: body.contact_url,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid profile metadata.'
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'BAD_PROFILE_INPUT'
      return Response.json({ error: message, code }, { status: 400 })
    }

    // ── Detect rail used to pay (for analytics) ───────────────────────────
    const registeredVia: 'tempo' | 'base' | 'solana' = (() => {
      const authorization = req.headers.get('authorization')?.trim().toLowerCase()
      if (authorization?.startsWith('payment ') || authorization?.startsWith('mpp ')) {
        return 'tempo'
      }
      const xPayment = req.headers.get('x-payment')
      if (!xPayment) return 'tempo'
      try {
        const decoded = JSON.parse(Buffer.from(xPayment, 'base64').toString('utf-8')) as {
          accepted?: { network?: string }
        }
        const network = decoded.accepted?.network ?? ''
        if (network.toLowerCase() === 'eip155:8453') return 'base'
        if (network.toLowerCase().startsWith('solana:')) return 'solana'
        return 'tempo'
      } catch {
        return 'tempo'
      }
    })()

    // ── Persist ───────────────────────────────────────────────────────────
    const profile = await upsertAgentProfile({
      agent_identifier: identity.agentIdentifier,
      erc8004_agent_id: identity.kind === 'tempo' ? identity.erc8004AgentId : null,
      erc8004_chain: identity.kind === 'tempo' ? 'tempo' : 'solana',
      owner_address:
        identity.kind === 'tempo' ? identity.ownerAddress : identity.solanaPubkey,
      display_name: cleaned.display_name,
      description: cleaned.description,
      endpoint: cleaned.endpoint,
      capabilities: cleaned.capabilities,
      contact_url: cleaned.contact_url,
      registered_via: registeredVia,
    })

    if (!profile) {
      return Response.json(
        { error: 'Failed to persist agent profile.', code: 'PROFILE_PERSIST_FAILED' },
        { status: 500 },
      )
    }

    return Response.json({
      success: true,
      profile: {
        agent_identifier: profile.agent_identifier,
        agent_id: profile.erc8004_agent_id,
        chain: profile.erc8004_chain,
        owner_address: profile.owner_address,
        display_name: profile.display_name,
        description: profile.description,
        endpoint: profile.endpoint,
        capabilities: profile.capabilities,
        contact_url: profile.contact_url,
        registered_at: profile.registered_at,
        last_refreshed_at: profile.last_refreshed_at,
      },
      headers: {
        // Drop-in headers an agent can use against any Remlo MPP endpoint
        // once an employer authorizes them.
        'X-Agent-Identifier': identity.agentIdentifier,
      },
      directory_url: `https://www.remlo.xyz/agents#${encodeURIComponent(identity.agentIdentifier)}`,
      authorize_url: 'https://www.remlo.xyz/dashboard/settings/agents',
      registered_via: registeredVia,
    })
  },
})

export const GET = async (req: Request) => {
  const url = new URL(req.url)
  const agentIdentifier = url.searchParams.get('agent_identifier')?.trim()
  if (!agentIdentifier) {
    return Response.json(
      { error: 'agent_identifier query param required' },
      { status: 400 },
    )
  }
  const profile = await getAgentProfile(agentIdentifier)
  if (!profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 })
  }
  return Response.json({ profile })
}
