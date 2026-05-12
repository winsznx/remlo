import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  ExternalLink,
  Radio,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ForceDark, FadeInUp } from './components'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Traction | Remlo',
  description:
    'Live Remlo usage snapshot: paid API sessions, agent wallets, waitlist demand, payroll settlement, and verifiable chain evidence.',
  alternates: {
    canonical: '/traction',
  },
}

const GITHUB_REPO_URL = 'https://github.com/winsznx/remlo'
const TELEGRAM_URL = 'https://t.me/remlo_xyz'
const MPPSCAN_URL = process.env.NEXT_PUBLIC_MPPSCAN_URL ?? 'https://mppscan.com'
const TEMPO_MPP_FEE_RECEIVER_URL = process.env.REMLO_TREASURY_ADDRESS
  ? `https://explore.moderato.tempo.xyz/address/${process.env.REMLO_TREASURY_ADDRESS}`
  : null
const TEMPO_BATCHER_URL =
  'https://explore.moderato.tempo.xyz/address/0xeEBa523F0AB45838F4e2c2872cEd0d5512bb4e88'
const SOLANA_ESCROW_URL =
  'https://explorer.solana.com/address/2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA?cluster=devnet'

type RecentPayrollRun = {
  id: string
  chain: string
  employee_count: number
  finalized_at: string | null
  settlement_time_ms: number | null
  solana_signatures: string[] | null
  total_amount: number
  tx_hash: string | null
}

type RecentAgentProfile = {
  agent_identifier: string
  display_name: string
  erc8004_chain: string
  last_refreshed_at: string
  registered_via: string
}

type RecentReputationWrite = {
  chain: string
  subject_address: string
  tx_signature: string | null
  attestation_pda: string | null
  written_at: string | null
}

type TractionData = {
  activeAuthorizations: number
  agentProfiles: number
  confirmedWaitlist: number
  githubStars: number
  paidApiFeeVolume: number
  paidApiSessions: number
  payrollSettledVolume: number
  recentAgentProfiles: RecentAgentProfile[]
  recentPayrollRuns: RecentPayrollRun[]
  recentReputationWrites: RecentReputationWrite[]
  totalWaitlist: number
  uniquePaidWallets: number
  uniquePayees: number
  updatedAt: string
  writtenReputationCount: number
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatUsd(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(value)
}

function formatTime(iso: string | null) {
  if (!iso) return 'Pending'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function compact(value: string | null | undefined, head = 6, tail = 4) {
  if (!value) return 'Not recorded'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

function payrollExplorerUrl(run: RecentPayrollRun) {
  if (run.chain === 'solana') {
    const signature = run.solana_signatures?.[0] ?? run.tx_hash
    return signature ? `https://explorer.solana.com/tx/${signature}?cluster=devnet` : null
  }
  return run.tx_hash ? `https://explore.moderato.tempo.xyz/tx/${run.tx_hash}` : null
}

function reputationExplorerUrl(row: RecentReputationWrite) {
  if (row.chain === 'solana') {
    if (row.attestation_pda) {
      return `https://explorer.solana.com/address/${row.attestation_pda}?cluster=devnet`
    }
    return row.tx_signature ? `https://explorer.solana.com/tx/${row.tx_signature}?cluster=devnet` : null
  }
  return row.tx_signature ? `https://explore.moderato.tempo.xyz/tx/${row.tx_signature}` : null
}

async function getGithubStars() {
  try {
    const response = await fetch('https://api.github.com/repos/winsznx/remlo', {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return 0
    const json = (await response.json()) as { stargazers_count?: number }
    return Number(json.stargazers_count ?? 0)
  } catch {
    return 0
  }
}

async function getTractionData(): Promise<TractionData> {
  const supabase = createServerClient()

  const [
    sessionsResult,
    paymentItemsResult,
    payrollRunsResult,
    waitlistTotalResult,
    waitlistConfirmedResult,
    profileCountResult,
    profileRowsResult,
    authorizationResult,
    reputationCountResult,
    reputationRowsResult,
    githubStars,
  ] = await Promise.all([
    supabase.from('mpp_sessions').select('agent_wallet,total_spent,opened_at').order('opened_at', { ascending: false }),
    supabase.from('payment_items').select('employee_id,status').eq('status', 'confirmed'),
    supabase
      .from('payroll_runs')
      .select('id,chain,employee_count,finalized_at,settlement_time_ms,solana_signatures,total_amount,tx_hash,status,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('waitlist_subscribers')
      .select('email', { count: 'exact', head: true })
      .is('unsubscribed_at', null),
    supabase
      .from('waitlist_subscribers')
      .select('email', { count: 'exact', head: true })
      .not('confirmed_at', 'is', null)
      .is('unsubscribed_at', null),
    supabase.from('remlo_agent_profiles').select('agent_identifier', { count: 'exact', head: true }).eq('active', true),
    supabase
      .from('remlo_agent_profiles')
      .select('agent_identifier,display_name,erc8004_chain,last_refreshed_at,registered_via')
      .eq('active', true)
      .order('last_refreshed_at', { ascending: false })
      .limit(5),
    supabase
      .from('employer_agent_authorizations')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
      .is('revoked_at', null)
      .is('paused_at', null),
    supabase
      .from('reputation_writes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'written'),
    supabase
      .from('reputation_writes')
      .select('chain,subject_address,tx_signature,attestation_pda,written_at')
      .eq('status', 'written')
      .order('written_at', { ascending: false, nullsFirst: false })
      .limit(5),
    getGithubStars(),
  ])

  const sessions = sessionsResult.data ?? []
  const uniquePaidWallets = new Set(
    sessions
      .map((session) => session.agent_wallet?.toLowerCase())
      .filter((wallet): wallet is string => Boolean(wallet)),
  ).size
  const paidApiFeeVolume = sessions.reduce((sum, session) => sum + Number(session.total_spent ?? 0), 0)

  const uniquePayees = new Set(
    (paymentItemsResult.data ?? [])
      .map((item) => item.employee_id)
      .filter((id): id is string => Boolean(id)),
  ).size

  const settledRuns = (payrollRunsResult.data ?? []).filter((run) => {
    const hasExplorerEvidence =
      Boolean(run.tx_hash) || (Array.isArray(run.solana_signatures) && run.solana_signatures.length > 0)
    return hasExplorerEvidence && (run.status === 'completed' || Boolean(run.finalized_at))
  })

  return {
    activeAuthorizations: authorizationResult.count ?? 0,
    agentProfiles: profileCountResult.count ?? 0,
    confirmedWaitlist: waitlistConfirmedResult.count ?? 0,
    githubStars,
    paidApiFeeVolume,
    paidApiSessions: sessions.length,
    payrollSettledVolume: settledRuns.reduce((sum, run) => sum + Number(run.total_amount ?? 0), 0),
    recentAgentProfiles: (profileRowsResult.data ?? []) as RecentAgentProfile[],
    recentPayrollRuns: settledRuns.slice(0, 5) as RecentPayrollRun[],
    recentReputationWrites: (reputationRowsResult.data ?? []) as RecentReputationWrite[],
    totalWaitlist: waitlistTotalResult.count ?? 0,
    uniquePaidWallets,
    uniquePayees,
    updatedAt: new Date().toISOString(),
    writtenReputationCount: reputationCountResult.count ?? 0,
  }
}

function MetricCard({
  icon: Icon,
  label,
  note,
  value,
}: {
  icon: React.ElementType
  label: string
  note: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0D152B] p-5 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</p>
        <Icon className="h-4 w-4 text-[var(--accent)]" />
      </div>
      <p className="mt-4 font-mono text-3xl font-bold text-[var(--status-success)]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/40">{note}</p>
    </div>
  )
}

function EvidenceLink({
  href,
  label,
  title,
}: {
  href: string
  label: string
  title: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 transition-colors hover:border-[var(--accent)]/40 hover:bg-white/[0.05] hover:text-white"
    >
      <span>
        <span className="block text-xs uppercase tracking-[0.14em] text-white/35">{label}</span>
        <span className="mt-1 block font-medium">{title}</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-[var(--accent)]" />
    </a>
  )
}

export default async function TractionPage() {
  const data = await getTractionData()
  const waitlistInterest = data.totalWaitlist + data.githubStars

  return (
    <>
      <ForceDark />

      <div className="space-y-16 pb-16">
        <section className="pt-4 text-center">
          <FadeInUp>
            <p className="mb-4 text-xs font-mono uppercase tracking-[0.18em] text-[var(--accent)]">
              Live Traction Snapshot
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
              Remlo Proof Surface
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-7 text-white/55 md:text-lg">
              A live, source-labeled view of Remlo usage across paid API sessions, agent
              authorization, payroll settlement, waitlist demand, and on-chain reputation evidence.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/45">
              <Clock3 className="h-3.5 w-3.5" />
              Refreshed {formatTime(data.updatedAt)}
            </p>
          </FadeInUp>
        </section>

        <section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FadeInUp delay={0.05}>
              <MetricCard
                icon={Radio}
                label="Paid API sessions"
                value={formatInteger(data.paidApiSessions)}
                note={`${formatUsd(data.paidApiFeeVolume, 4)} total recorded API fees in mpp_sessions.`}
              />
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <MetricCard
                icon={Wallet}
                label="Unique payer wallets"
                value={formatInteger(data.uniquePaidWallets)}
                note="Distinct agent_wallet values that opened paid API sessions."
              />
            </FadeInUp>
            <FadeInUp delay={0.15}>
              <MetricCard
                icon={Zap}
                label="Settled payroll volume"
                value={formatUsd(data.payrollSettledVolume, 0)}
                note={`${formatInteger(data.uniquePayees)} confirmed employee payees with transaction evidence.`}
              />
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <MetricCard
                icon={Users}
                label="Waitlist + GitHub stars"
                value={formatInteger(waitlistInterest)}
                note={`${formatInteger(data.confirmedWaitlist)} confirmed waitlist signups, ${formatInteger(data.githubStars)} GitHub stars.`}
              />
            </FadeInUp>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <FadeInUp>
            <div className="rounded-2xl border border-white/10 bg-[#0A0F1E] p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[var(--accent)]">
                    Agent adoption
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Identity + authorization</h2>
                </div>
                <BadgeCheck className="h-5 w-5 text-[var(--status-success)]" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/35">Registered profiles</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-white">{formatInteger(data.agentProfiles)}</p>
                  <p className="mt-1 text-xs text-white/40">Global directory identities.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/35">Active authorizations</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-white">{formatInteger(data.activeAuthorizations)}</p>
                  <p className="mt-1 text-xs text-white/40">Employer-approved agents.</p>
                </div>
              </div>

              <div className="mt-5 divide-y divide-white/5 rounded-xl border border-white/10">
                {data.recentAgentProfiles.length > 0 ? (
                  data.recentAgentProfiles.map((agent) => (
                    <div key={agent.agent_identifier} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{agent.display_name}</p>
                          <p className="mt-1 truncate font-mono text-xs text-white/45">
                            {compact(agent.agent_identifier, 16, 8)}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-white/45">
                          {agent.erc8004_chain}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/35">
                        Paid via {agent.registered_via}; refreshed {formatTime(agent.last_refreshed_at)}.
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-sm text-white/45">No public agent profiles registered yet.</p>
                )}
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.05}>
            <div className="rounded-2xl border border-white/10 bg-[#0A0F1E] p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[var(--accent)]">
                    Reputation writes
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">On-chain proof queue</h2>
                </div>
                <ShieldCheck className="h-5 w-5 text-[var(--status-success)]" />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/35">Written attestations</p>
                <p className="mt-2 font-mono text-2xl font-bold text-white">{formatInteger(data.writtenReputationCount)}</p>
                <p className="mt-1 text-xs leading-5 text-white/40">
                  Rows with status=written in the reputation write ledger.
                </p>
              </div>

              <div className="mt-5 divide-y divide-white/5 rounded-xl border border-white/10">
                {data.recentReputationWrites.length > 0 ? (
                  data.recentReputationWrites.map((row, index) => {
                    const href = reputationExplorerUrl(row)
                    return (
                      <div key={`${row.subject_address}:${row.written_at ?? index}`} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-white/60">{compact(row.subject_address, 12, 8)}</p>
                            <p className="mt-1 text-xs text-white/35">
                              {row.chain} · {formatTime(row.written_at)}
                            </p>
                          </div>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                            >
                              Verify <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="p-4 text-sm text-white/45">No written reputation attestations yet.</p>
                )}
              </div>
            </div>
          </FadeInUp>
        </section>

        <section>
          <FadeInUp>
            <div className="rounded-2xl border border-white/10 bg-[#0A0F1E] p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[var(--accent)]">
                    Recent settlement evidence
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Payroll runs with explorer links</h2>
                </div>
                <p className="text-sm text-white/40">Only runs with transaction evidence are included.</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[720px] text-left text-sm text-white/70">
                  <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-[0.14em] text-white/40">
                    <tr>
                      <th className="px-4 py-3 font-medium">Run</th>
                      <th className="px-4 py-3 font-medium">Chain</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Employees</th>
                      <th className="px-4 py-3 font-medium">Settled</th>
                      <th className="px-4 py-3 font-medium">Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.recentPayrollRuns.length > 0 ? (
                      data.recentPayrollRuns.map((run) => {
                        const href = payrollExplorerUrl(run)
                        return (
                          <tr key={run.id} className="transition-colors hover:bg-white/[0.02]">
                            <td className="px-4 py-3 font-mono text-xs text-white">{compact(run.id, 8, 6)}</td>
                            <td className="px-4 py-3 capitalize">{run.chain}</td>
                            <td className="px-4 py-3 font-mono text-[var(--status-success)]">{formatUsd(run.total_amount)}</td>
                            <td className="px-4 py-3">{formatInteger(run.employee_count)}</td>
                            <td className="px-4 py-3">{formatTime(run.finalized_at)}</td>
                            <td className="px-4 py-3">
                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                                >
                                  Explorer <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-white/35">Unavailable</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-white/45">
                          No finalized payroll runs with transaction evidence yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeInUp>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FadeInUp delay={0.05}>
            <EvidenceLink href={MPPSCAN_URL} label="Paid API discovery" title="View Remlo on MPPscan" />
          </FadeInUp>
          <FadeInUp delay={0.1}>
            {TEMPO_MPP_FEE_RECEIVER_URL ? (
              <EvidenceLink href={TEMPO_MPP_FEE_RECEIVER_URL} label="Tempo MPP fees" title="Fee receiver wallet" />
            ) : (
              <EvidenceLink href={TEMPO_BATCHER_URL} label="Tempo MPP fees" title="Fee receiver not configured" />
            )}
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <EvidenceLink href={TEMPO_BATCHER_URL} label="Tempo contract" title="PayrollBatcher on Moderato" />
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <EvidenceLink href={SOLANA_ESCROW_URL} label="Solana program" title="Remlo escrow program" />
          </FadeInUp>
          <FadeInUp delay={0.25}>
            <EvidenceLink href={GITHUB_REPO_URL} label="Open source" title="GitHub repository" />
          </FadeInUp>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101A33] p-5 sm:p-6">
          <FadeInUp>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-[var(--accent)]">
                  How to add real traction
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">Use the live system</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                  Every paid endpoint call, employer authorization, payroll settlement, and written
                  reputation attestation updates this page from live database records. No manual leaderboard.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5">
                  <Link href="/agents">
                    Agent guide
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild className="bg-[var(--accent)] text-[#07111F] hover:bg-[var(--accent)]/90">
                  <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                    Join community
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </FadeInUp>
        </section>
      </div>
    </>
  )
}
