'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ShieldAlert, AlertTriangle, Loader2, ScrollText, Search } from 'lucide-react'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Input } from '@/components/ui/input'

interface AuditEntry {
  id: string
  actor_user_id: string
  action: string
  resource: string | null
  result: 'success' | 'forbidden' | 'error'
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const RESULT_META: Record<
  AuditEntry['result'],
  { label: string; tint: string; icon: React.ComponentType<{ className?: string }> }
> = {
  success: { label: 'OK', tint: 'text-[var(--status-success)]', icon: CheckCircle2 },
  forbidden: { label: 'Forbidden', tint: 'text-[var(--status-pending)]', icon: ShieldAlert },
  error: { label: 'Error', tint: 'text-[var(--status-error)]', icon: AlertTriangle },
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

export default function AuditLogPage(): React.ReactElement {
  const fetchJson = usePrivyAuthedJson()
  const [actorFilter, setActorFilter] = React.useState('')
  const [actionFilter, setActionFilter] = React.useState('')
  const [resultFilter, setResultFilter] = React.useState<'' | AuditEntry['result']>('')

  const params = new URLSearchParams()
  if (actorFilter.trim()) params.set('actor', actorFilter.trim())
  if (actionFilter.trim()) params.set('action', actionFilter.trim())
  if (resultFilter) params.set('result', resultFilter)
  const queryString = params.toString()

  const list = useQuery<{ items: AuditEntry[] }>({
    queryKey: ['admin-audit-log', queryString],
    queryFn: () => fetchJson(`/api/admin/audit-log${queryString ? `?${queryString}` : ''}`),
    refetchOnWindowFocus: false,
  })

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Audit log"
        description="Append-only record of platform-admin actions. Every announcement create/edit/delete and every email-suppression change writes one row here."
      />

      <div className="grid gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Actor (Privy user id)
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="did:privy:..."
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Action prefix
          </label>
          <Input
            placeholder="announcement. or email_suppression."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Result
          </label>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)}
            className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="forbidden">Forbidden</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <header className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
          <span className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[var(--text-muted)]" />
            Recent admin actions
          </span>
          {list.data && (
            <span className="text-xs font-normal text-[var(--text-muted)]">
              {list.data.items.length} {list.data.items.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </header>
        {list.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        ) : !list.data?.items.length ? (
          <div className="px-5 py-10 text-center text-xs text-[var(--text-muted)]">
            No audit entries match the current filters.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-default)]">
            {list.data.items.map((entry) => {
              const meta = RESULT_META[entry.result] ?? RESULT_META.error
              const Icon = meta.icon
              return (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tint}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-[var(--text-primary)]">{entry.action}</span>
                        <span className={`text-[10px] uppercase tracking-wider rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-1.5 py-0.5 ${meta.tint}`}>
                          {meta.label}
                        </span>
                        {entry.resource && (
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            {entry.resource}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Actor: <span className="font-mono">{entry.actor_user_id}</span>
                        {entry.ip_address && (
                          <>
                            {' · '}IP: <span className="font-mono">{entry.ip_address}</span>
                          </>
                        )}
                        {' · '}
                        {formatTime(entry.created_at)}
                      </p>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-[11px] leading-5 text-[var(--text-secondary)]">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
