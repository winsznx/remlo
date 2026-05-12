import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import {
  aggregateTempoReputation,
  fetchAgentURI,
  type TempoReputationSummary,
} from '@/lib/reputation/erc8004'
import {
  listAgentProfiles,
  attachReputation,
  type AgentProfileWithReputation,
} from '@/lib/queries/agent-profiles'
import { WaitlistForm } from '@/components/marketing/WaitlistForm'

/**
 * /agents — public discovery page.
 *
 * Renders Remlo's on-chain agent identities (Payroll Agent + Validator Agent)
 * with live ERC-8004 reputation summaries. External agents use this to learn
 * Remlo's agent IDs, register their own counterparty agents, and inspect the
 * reputation graph Remlo's payments are building.
 *
 * Ship 7 Part 5A — page is cached with unstable_cache (5-min TTL) to survive
 * traffic spikes without hammering the Tempo RPC on every request. The cache
 * response body includes `updated_at` so callers understand staleness.
 */

export const revalidate = 300

async function loadAgentSummary(agentId: string): Promise<{
  agentId: string
  agentUri: string | null
  reputation: TempoReputationSummary
  updated_at: string
}> {
  const [agentUri, reputation] = await Promise.all([
    fetchAgentURI(agentId),
    aggregateTempoReputation(agentId),
  ])
  return {
    agentId,
    agentUri,
    reputation,
    updated_at: new Date().toISOString(),
  }
}

const getCachedAgentSummary = unstable_cache(
  async (agentId: string) => loadAgentSummary(agentId),
  ['agents-page-summary'],
  { revalidate: 300 },
)

export default async function AgentsPage() {
  const payrollAgentId = process.env.REMLO_PAYROLL_AGENT_ID ?? '0'
  const validatorAgentId = process.env.REMLO_VALIDATOR_AGENT_ID ?? '0'
  const identityRegistry =
    process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY ?? 'not-deployed'
  const reputationRegistry =
    process.env.NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY ?? 'not-deployed'

  const [payrollSummary, validatorSummary, directory] = await Promise.all([
    getCachedAgentSummary(payrollAgentId).catch(() => null),
    getCachedAgentSummary(validatorAgentId).catch(() => null),
    listAgentProfiles({ limit: 24 }).catch(() => ({ items: [], nextCursor: null })),
  ])
  const directoryWithReputation = await attachReputation(directory.items).catch(() => [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Remlo agents
        </h1>
        <p className="text-base text-[var(--text-secondary)]">
          Most paid endpoints accept payment on three chains in parallel. Pay $0.01 to $1.00 in USDC on Tempo, Base, or Solana. AgentCash, raw <code className="font-mono">@x402/core</code>, Coinbase Agent Kit, or any HTTP client that handles 402 retries can reach the same API surface.
        </p>
        <p className="text-base text-[var(--text-secondary)]">
          Every autonomous broadcast Remlo makes is signed by an ERC-8004 agent identity on Tempo. External agents register their own identities, authorize against Remlo employers, and accumulate on-chain reputation with every payment.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Three rails, one API surface
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <RailCard chain="Tempo" caip="eip155:4217" protocol="mpp" stable="USDC.e" facilitator="Embedded (mppx)" />
          <RailCard chain="Base" caip="eip155:8453" protocol="x402" stable="USDC" facilitator="CDP" />
          <RailCard chain="Solana" caip="solana:5eykt4..." protocol="x402" stable="USDC" facilitator="CDP" />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          State mutating endpoints that touch Tempo treasury balances (payroll execute, fiat off-ramp) accept Tempo only. Reads, queries, escrow lifecycle, and agent-to-agent payments accept all three.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Calling a paid endpoint
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          The simplest path is AgentCash. It detects which chain has balance, signs the right protocol&apos;s payload, and retries automatically.
        </p>
        <pre className="rounded-md bg-[var(--bg-subtle)] p-3 text-xs overflow-x-auto">
          {`# Browse what's available
npx -y agentcash@latest discover https://www.remlo.xyz

# Call any endpoint. AgentCash auto-picks a rail you have balance on.
npx -y agentcash@latest fetch https://www.remlo.xyz/api/mpp/treasury/yield-rates

# Force a chain
npx -y agentcash@latest fetch \\
  https://www.remlo.xyz/api/mpp/escrow/post \\
  --payment-network solana`}
        </pre>
        <p className="text-sm text-[var(--text-secondary)]">
          Without AgentCash, use <code className="font-mono">@x402/core</code> + <code className="font-mono">@x402/evm</code> or <code className="font-mono">@x402/svm</code> for Base / Solana. Use <code className="font-mono">mppx/client</code> for Tempo. Both libraries handle the 402 challenge, signature, and retry. See the <a href="https://docs.remlo.xyz/docs/mpp-api/multi-rail" className="text-[var(--accent)] hover:underline">Multi-Rail Payments</a> guide for full code samples.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Our agents on-chain
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <AgentCard
            name="Payroll Agent"
            description="Broadcasts payroll batches, x402 agent-pay calls, and Solana payroll streams on behalf of Remlo-managed employers."
            agentId={payrollAgentId}
            data={payrollSummary}
          />
          <AgentCard
            name="Validator Agent"
            description="Signs post_verdict on every remlo_escrow settlement after the consensus engine resolves. Authority bound to the Privy Solana server wallet."
            agentId={validatorAgentId}
            data={validatorSummary}
          />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Identity Registry: <code className="font-mono">{identityRegistry}</code>
          {' · '}
          Reputation Registry: <code className="font-mono">{reputationRegistry}</code>
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Registered agents
          </h2>
          <Link
            href="/agents/register"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Register your agent →
          </Link>
        </div>
        {directoryWithReputation.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            No external agents have registered yet. Be the first — mint an
            ERC-8004 token, then call <code className="font-mono">POST /api/mpp/agents/register</code> ($0.10 once) to appear here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {directoryWithReputation.map((agent) => (
              <RegisteredAgentCard key={agent.agent_identifier} agent={agent} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Register your own agent
        </h2>
        <ol className="space-y-3 text-sm text-[var(--text-secondary)] list-decimal pl-5">
          <li>
            Mint an ERC-8004 Identity token on Tempo, or use an existing Ethereum mainnet Identity. Ownership transfers cleanly to your deployer address.
          </li>
          <li>
            Serve your agent registration file at <code className="font-mono">https://yourdomain/.well-known/agent-registration.json</code>. The file conforms to ERC-8004&apos;s AgentCard spec: endpoints, capabilities, supported protocols, pricing.
          </li>
          <li>
            Authorize your agent identifier against any Remlo employer at <code className="font-mono">/dashboard/settings/agents</code>. The employer sets per-transaction and per-day spend caps that apply to <code className="font-mono">/api/mpp/agent/pay</code>.
          </li>
          <li>
            Call <code className="font-mono">/api/mpp/agent/pay</code>. Remlo writes feedback to your agent&apos;s ReputationRegistry slot after every successful payment. Reputation accumulates as you transact, portable across any ERC-8004-aware system.
          </li>
        </ol>

        <pre className="rounded-md bg-[var(--bg-subtle)] p-3 text-xs overflow-x-auto">
          {`// Remlo writes feedback about YOUR agent after you transact with us:
await reputationRegistry.giveFeedback({
  agentId: yourAgentId,
  value: 100,                 // int128, -100..100 scale
  valueDecimals: 0,
  tag1: 'agent_pay',
  tag2: 'usdc',
  endpoint: 'https://remlo.xyz/api/mpp/agent/pay',
  feedbackURI: 'https://remlo.xyz/agents/feedback/{tx_hash}',
  feedbackHash: keccak256(bodyText),
})`}
        </pre>
      </section>

      <section className="space-y-4">
        <WaitlistForm
          source="agents"
          variant="card"
          heading="Building an agent on Remlo?"
          description="We send a quarterly note covering new endpoints, schema changes, and reputation graph updates. Worth subscribing if your agent transacts here."
          ctaLabel="Keep me posted"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Why this matters
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          When an employer signs up, the infrastructure isn&apos;t just payroll plumbing. It&apos;s an ERC-8004 reputation substrate writing alongside Solana&apos;s SAS. Every payment is a mutual feedback event. Over time, Remlo-managed treasuries accumulate auditable track records on Tempo, and the external agents they transact with earn reputation on their own terms, portable across any system that reads either registry.
        </p>
      </section>

      <footer className="pt-6 border-t border-[var(--border-default)] text-xs text-[var(--text-muted)]">
        Reputation summaries cached for up to 5 minutes. Last updated:{' '}
        {payrollSummary?.updated_at ?? 'unavailable'}.{' '}
        <Link href="/api/agents/remlo" className="underline">
          Machine-readable endpoint
        </Link>
        {' · '}
        <a href="https://www.remlo.xyz/openapi.json" className="underline">OpenAPI spec</a>
        {' · '}
        <a href="https://docs.remlo.xyz" className="underline">Full docs</a>
      </footer>
    </div>
  )
}

function RailCard({ chain, caip, protocol, stable, facilitator }: {
  chain: string
  caip: string
  protocol: string
  stable: string
  facilitator: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{chain}</h3>
        <span className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
          {protocol}
        </span>
      </div>
      <p className="text-xs font-mono text-[var(--text-muted)]">{caip}</p>
      <div className="pt-2 border-t border-[var(--border-default)] space-y-1">
        <p className="text-xs"><span className="text-[var(--text-muted)]">Stablecoin:</span> <span className="text-[var(--text-primary)]">{stable}</span></p>
        <p className="text-xs"><span className="text-[var(--text-muted)]">Facilitator:</span> <span className="text-[var(--text-primary)]">{facilitator}</span></p>
      </div>
    </div>
  )
}

function AgentCard({
  name,
  description,
  agentId,
  data,
}: {
  name: string
  description: string
  agentId: string
  data: {
    agentUri: string | null
    reputation: TempoReputationSummary
  } | null
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-3">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{name}</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">agent ID: {agentId}</p>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      {data ? (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-default)]">
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)]">
              Feedback count
            </div>
            <div className="text-lg font-bold tabular-nums">
              {data.reputation.totalFeedbackCount}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)]">
              Avg value
            </div>
            <div className="text-lg font-bold tabular-nums">
              {data.reputation.averageScore !== null
                ? Math.round(data.reputation.averageScore)
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)]">
              Tags
            </div>
            <div className="text-sm">
              {Object.keys(data.reputation.feedbackByTag).length || '—'}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-default)]">
          Reputation unavailable (Tempo RPC unreachable).
        </p>
      )}
      {data?.agentUri && (
        <a
          href={data.agentUri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--accent)] hover:underline break-all"
        >
          {data.agentUri}
        </a>
      )}
    </div>
  )
}

function RegisteredAgentCard({ agent }: { agent: AgentProfileWithReputation }) {
  const idLabel = `${agent.erc8004_chain}:${agent.erc8004_agent_id}`
  const rep = agent.reputation
  return (
    <div
      id={agent.agent_identifier}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
            {agent.display_name}
          </h3>
          <p className="mt-1 text-[11px] font-mono text-[var(--text-muted)]">{idLabel}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
          ERC-8004
        </span>
      </div>
      {rep && rep.total_feedback_count > 0 && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Feedback</div>
            <div className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
              {rep.total_feedback_count}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Avg score</div>
            <div className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
              {rep.average_score !== null ? Math.round(rep.average_score) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Tags</div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {Object.keys(rep.feedback_by_tag).length}
            </div>
          </div>
        </div>
      )}
      {agent.description && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{agent.description}</p>
      )}
      {agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]"
            >
              {cap}
            </span>
          ))}
        </div>
      )}
      <div className="pt-2 border-t border-[var(--border-default)] grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-[10px] uppercase text-[var(--text-muted)]">Owner</div>
          <div className="font-mono text-[var(--text-primary)] truncate">{agent.owner_address}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[var(--text-muted)]">Last refreshed</div>
          <div className="text-[var(--text-primary)]">
            {new Date(agent.last_refreshed_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      {(agent.endpoint || agent.contact_url) && (
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          {agent.endpoint && (
            <a
              href={agent.endpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              Endpoint
            </a>
          )}
          {agent.contact_url && (
            <a
              href={agent.contact_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              Contact
            </a>
          )}
        </div>
      )}
    </div>
  )
}
