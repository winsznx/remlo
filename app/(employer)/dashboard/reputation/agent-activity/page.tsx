'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

interface AgentAggregate {
  authorization_id: string
  agent_identifier: string
  label: string
  call_count: number
  total_usd: number
  success_count: number
  latest_call_at: string | null
}

interface ActivityResponse {
  totals: {
    external_agent_count: number
    total_calls: number
    total_usd: number
  }
  agents: AgentAggregate[]
}

export default function AgentActivityPage() {
  const { data: employer } = useEmployer()
  const fetchJson = usePrivyAuthedJson()

  const activityQuery = useQuery({
    queryKey: ['agent-activity', employer?.id],
    enabled: Boolean(employer?.id),
    refetchInterval: 30_000,
    queryFn: () =>
      fetchJson<ActivityResponse>(`/api/employers/${employer!.id}/agent-activity`),
  })

  const activity = activityQuery.data

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/reputation"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to reputation
      </Link>

      <SectionHeader
        title="External agent activity"
        description="Agents that have transacted with your treasury via /api/mpp/agent/pay — the reputation you're building in the external agent graph."
      />

      {activityQuery.isLoading ? (
        <div className="text-sm text-[var(--text-muted)]">Loading…</div>
      ) : !activity || activity.agents.length === 0 ? (
        <EmptyState
          title="No external agent activity yet"
          description="When external agents authorize against your employer and call /api/mpp/agent/pay, they show up here with their call count, routed volume, and success rate."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="External agents" value={activity.totals.external_agent_count} />
            <StatCard label="Total calls" value={activity.totals.total_calls} />
            <StatCard
              label="Total USD routed"
              value={`$${activity.totals.total_usd.toFixed(2)}`}
            />
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-subtle)]">
                <tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Calls</th>
                  <th className="px-4 py-3">USD routed</th>
                  <th className="px-4 py-3">Success rate</th>
                  <th className="px-4 py-3">Latest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {activity.agents.map((a) => {
                  const successRate =
                    a.call_count > 0
                      ? Math.round((a.success_count / a.call_count) * 100)
                      : 0
                  return (
                    <tr key={a.authorization_id} className="text-[var(--text-primary)]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.label}</div>
                        <div className="text-xs font-mono text-[var(--text-muted)]">
                          {a.agent_identifier}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{a.call_count}</td>
                      <td className="px-4 py-3 tabular-nums">
                        ${a.total_usd.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{successRate}%</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {a.latest_call_at
                          ? new Date(a.latest_call_at).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Your treasury&apos;s transactions have contributed to{' '}
            <strong>{activity.totals.external_agent_count}</strong> external agent
            reputation{activity.totals.external_agent_count === 1 ? '' : 's'} on
            ERC-8004. Every successful{' '}
            <code className="font-mono">/api/mpp/agent/pay</code> call writes a
            mutual feedback attestation on Tempo.
          </p>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
        {value}
      </div>
    </div>
  )
}
