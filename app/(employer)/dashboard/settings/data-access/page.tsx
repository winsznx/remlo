'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  ScrollText,
  ShieldCheck,
} from 'lucide-react'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { SectionHeader } from '@/components/ui/SectionHeader'

interface DataAccessItem {
  id: string
  action: string
  actionLabel: string
  result: string
  reason: string | null
  actor: string
  created_at: string
}

interface DataAccessResponse {
  items: DataAccessItem[]
  summary: {
    total: number
    reads: number
    writes: number
  }
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} h ago`
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)} d ago`
  return formatTime(iso)
}

export default function DataAccessPage(): React.ReactElement {
  const { data: employer, isLoading: employerLoading } = useEmployer()
  const fetchJson = usePrivyAuthedJson()

  const list = useQuery<DataAccessResponse>({
    queryKey: ['employer-data-access', employer?.id],
    queryFn: () => fetchJson(`/api/employers/${employer!.id}/data-access`),
    enabled: Boolean(employer?.id),
  })

  if (employerLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  const summary = list.data?.summary ?? { total: 0, reads: 0, writes: 0 }
  const items = list.data?.items ?? []

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <SectionHeader
        title="Data access log"
        description="Every time Remlo staff opens your company data — for support, security review, or operational fixes — we record it. This is your view of those events."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Tile
          label="Total accesses"
          value={summary.total}
          hint="Across all your data scopes"
          icon={ScrollText}
        />
        <Tile
          label="Reads"
          value={summary.reads}
          hint="Staff opened a sensitive view"
          icon={Eye}
        />
        <Tile
          label="Writes"
          value={summary.writes}
          hint="Staff changed something operationally"
          icon={Pencil}
        />
      </div>

      <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div className="text-sm leading-6 text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">How this log works</p>
            <p className="mt-1">
              When a Remlo staff member opens a sensitive view of your data, they have to type a
              reason — a support ticket reference or a short explanation. The reason is stored
              with the access event and is shown to you here. We anonymize the staffer&rsquo;s
              identity in this view; if you want to know who specifically accessed your data,
              email{' '}
              <a href="mailto:privacy@remlo.xyz" className="text-[var(--accent)] hover:underline">
                privacy@remlo.xyz
              </a>{' '}
              and we&rsquo;ll respond with the named record.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <header className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Access events</h2>
          <span className="text-xs text-[var(--text-muted)]">
            Most recent {items.length}
          </span>
        </header>
        {list.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center text-xs text-[var(--text-muted)]">
            <CheckCircle2 className="h-5 w-5 text-[var(--status-success)]" />
            <p>No staff has accessed your data.</p>
            <p>This panel updates the moment any access event happens.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-default)]">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)]">
                    {item.action.endsWith('.view') ? (
                      <Eye className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-primary)]">{item.actionLabel}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {item.actor} · {relative(item.created_at)} ·{' '}
                      <span title={formatTime(item.created_at)}>{formatTime(item.created_at)}</span>
                    </p>
                    {item.reason && (
                      <div className="mt-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-[11px] leading-5 text-[var(--text-secondary)]">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          Reason given
                        </span>
                        <br />
                        {item.reason}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Tile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: number
  hint?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
        <Icon className="h-4 w-4 text-[var(--text-muted)]" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  )
}
