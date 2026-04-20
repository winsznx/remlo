import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import {
  aggregateTempoReputation,
  fetchAgentURI,
  type TempoReputationSummary,
} from '@/lib/reputation/erc8004'

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

  const [payrollSummary, validatorSummary] = await Promise.all([
    getCachedAgentSummary(payrollAgentId).catch(() => null),
    getCachedAgentSummary(validatorAgentId).catch(() => null),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Remlo agents
        </h1>
        <p className="text-base text-[var(--text-secondary)]">
          Every autonomous broadcast Remlo makes is signed by an ERC-8004 agent
          identity on Tempo Moderato. External agents can register their own
          identities, authorize against Remlo employers, and build reputation
          through x402-paid calls against our public API.
        </p>
      </header>

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
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          How to register your agent
        </h2>
        <ol className="space-y-3 text-sm text-[var(--text-secondary)] list-decimal pl-5">
          <li>
            Mint an ERC-8004 Identity token on Tempo (or use an existing
            Ethereum mainnet Identity — ownership transfers cleanly to your
            deployer address).
          </li>
          <li>
            Serve your agent registration file at{' '}
            <code className="font-mono">
              https://yourdomain/.well-known/agent-registration.json
            </code>
            . The file conforms to ERC-8004&apos;s AgentCard spec: endpoints,
            capabilities, supported protocols, pricing.
          </li>
          <li>
            Once minted, authorize your agent identifier against any Remlo
            employer via <code className="font-mono">/dashboard/settings/agents</code>.
            That grants per-tx and per-day spend caps on{' '}
            <code className="font-mono">/api/mpp/agent/pay</code>.
          </li>
          <li>
            Call <code className="font-mono">/api/mpp/agent/pay</code>. Remlo
            posts feedback to your agent&apos;s ReputationRegistry slot after
            every successful payment — mutual reputation-building.
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Why this matters
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          When an employer signs up, the infrastructure isn&apos;t just payroll
          plumbing — it&apos;s an ERC-8004 reputation substrate. Every payment
          is a mutual feedback event. Over time, Remlo-managed treasuries
          accumulate auditable track records on Tempo, and the external agents
          they transact with earn reputation on their own terms, portable
          across any ERC-8004-aware system.
        </p>
      </section>

      <footer className="pt-6 border-t border-[var(--border-default)] text-xs text-[var(--text-muted)]">
        Reputation summaries cached for up to 5 minutes. Last updated:{' '}
        {payrollSummary?.updated_at ?? 'unavailable'}.{' '}
        <Link href="/api/agents/remlo" className="underline">
          Machine-readable endpoint
        </Link>
      </footer>
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
