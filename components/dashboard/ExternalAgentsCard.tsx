'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bot, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

interface ActivityResponse {
  totals: {
    external_agent_count: number
    total_calls: number
    total_usd: number
  }
}

export function ExternalAgentsCard() {
  const { data: employer } = useEmployer()
  const fetchJson = usePrivyAuthedJson()

  const query = useQuery({
    queryKey: ['agent-activity-summary', employer?.id],
    enabled: Boolean(employer?.id),
    refetchInterval: 60_000,
    queryFn: () =>
      fetchJson<ActivityResponse>(`/api/employers/${employer!.id}/agent-activity`),
  })

  const totals = query.data?.totals
  if (!totals || totals.external_agent_count === 0) return null

  return (
    <Link
      href="/dashboard/reputation/agent-activity"
      className="group rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 hover:border-[var(--accent)]/50 transition-colors flex items-start gap-3"
    >
      <div className="rounded-lg bg-[var(--accent-subtle)] p-2 shrink-0">
        <Bot className="h-4 w-4 text-[var(--accent)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          External agents reputation-built
        </div>
        <div className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
          {totals.external_agent_count}
        </div>
        <div className="mt-0.5 text-xs text-[var(--text-muted)]">
          {totals.total_calls} call{totals.total_calls === 1 ? '' : 's'} · $
          {totals.total_usd.toFixed(2)} routed
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
    </Link>
  )
}
