'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Megaphone,
  Wallet,
  ArrowDownRight,
} from 'lucide-react'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

type ActivityKind =
  | 'payment_received'
  | 'payment_pending'
  | 'payment_failed'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'announcement'
  | 'virtual_inflow'

type Severity = 'info' | 'success' | 'warning' | 'error'

interface ActivityItem {
  id: string
  kind: ActivityKind
  severity: Severity
  title: string
  body: string | null
  link: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
}

const LAST_SEEN_KEY = 'remlo-employee-activity-last-seen'

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const ICON_BY_KIND: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  payment_received: Wallet,
  payment_pending: Clock,
  payment_failed: AlertCircle,
  kyc_approved: CheckCircle2,
  kyc_rejected: AlertTriangle,
  announcement: Megaphone,
  virtual_inflow: ArrowDownRight,
}

const SEVERITY_TINT: Record<Severity, string> = {
  info: 'text-[var(--text-muted)]',
  success: 'text-[var(--status-success)]',
  warning: 'text-[var(--status-pending)]',
  error: 'text-[var(--status-error)]',
}

export default function ActivityPage(): React.ReactElement {
  const fetchJson = usePrivyAuthedJson()
  const queryClient = useQueryClient()
  const query = useQuery<{ items: ActivityItem[] }>({
    queryKey: ['portal-activity'],
    queryFn: () => fetchJson('/api/portal/activity'),
    staleTime: 30_000,
  })

  const items = query.data?.items ?? []
  const newestIso = items[0]?.created_at ?? null

  // On view: bump last-seen to the newest item we just rendered. The bell
  // reads the same key to compute its unread count.
  React.useEffect(() => {
    if (!newestIso) return
    window.localStorage.setItem(LAST_SEEN_KEY, newestIso)
    void queryClient.invalidateQueries({ queryKey: ['portal-activity-unread'] })
  }, [newestIso, queryClient])

  return (
    <div className="mx-auto max-w-[640px] space-y-4 px-4 pb-24 pt-6">
      <header className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-subtle)]">
          <Bell className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Activity</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Payroll, identity, and messages from your employer.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-[var(--text-muted)]">
            Nothing yet. Payments, identity updates, and messages from your employer will land here.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-default)]">
            {items.map((item) => {
              const Icon = ICON_BY_KIND[item.kind] ?? Info
              const tint = SEVERITY_TINT[item.severity]
              const Wrapper: React.ElementType = item.link ? Link : 'div'
              const wrapperProps = item.link
                ? item.link.startsWith('/')
                  ? { href: item.link }
                  : { href: item.link, target: '_blank', rel: 'noopener noreferrer' }
                : {}
              return (
                <li key={item.id}>
                  <Wrapper
                    {...wrapperProps}
                    className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] ${tint}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                      {item.body && (
                        <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">{item.body}</p>
                      )}
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{timeAgo(item.created_at)}</p>
                    </div>
                    {item.link && (
                      <ChevronRight className="h-4 w-4 shrink-0 self-center text-[var(--text-muted)]" />
                    )}
                  </Wrapper>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
