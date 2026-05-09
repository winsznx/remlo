'use client'

import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Mail,
  Megaphone,
  Users,
  XCircle,
} from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useAdminScope, type AdminOverviewResponse } from '@/lib/hooks/useAdmin'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

const NOTIFICATION_KIND_LABEL: Record<string, string> = {
  payroll_finalized: 'Payroll finalized',
  payroll_failed: 'Payroll failed',
  escrow_settled: 'Escrow settled',
  escrow_refunded: 'Escrow refunded',
  council_decision: 'Council decision',
  kyc_update: 'KYC update',
  reputation_write_failed: 'Reputation write failed',
  agent_paused: 'Agent paused',
  agent_spike_detected: 'Agent spike detected',
}

interface MetricTileProps {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  hint?: string
  tone?: 'default' | 'warning' | 'error' | 'success'
  href?: string
}

function MetricTile({ label, value, icon: Icon, hint, tone = 'default', href }: MetricTileProps) {
  const valueClass =
    tone === 'error'
      ? 'text-[var(--status-error)]'
      : tone === 'warning'
        ? 'text-[var(--status-pending)]'
        : tone === 'success'
          ? 'text-[var(--status-success)]'
          : 'text-[var(--text-primary)]'
  const Wrapper: React.ElementType = href ? Link : 'div'
  const wrapperProps = href ? { href } : {}
  return (
    <Wrapper
      {...wrapperProps}
      className={`block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 transition-colors ${href ? 'hover:bg-[var(--bg-subtle)]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
        <Icon className="h-4 w-4 text-[var(--text-muted)]" />
      </div>
      <p className={`mt-4 text-3xl font-semibold ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </Wrapper>
  )
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminScope<AdminOverviewResponse>('overview')

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  const m = data?.metrics
  const notificationsByKind = data?.notificationsByKind ?? {}
  const sortedKinds = Object.entries(notificationsByKind).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Platform Overview"
        description="Cross-employer view of payroll volume, compliance risk, MPP sessions, and platform health."
      />

      {/* Top-row: core platform metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          label="Employers"
          value={m?.employers ?? 0}
          icon={Building2}
          href="/admin/employers"
        />
        <MetricTile label="Employees" value={m?.employees ?? 0} icon={Users} />
        <MetricTile label="Payroll runs" value={m?.payrollRuns ?? 0} icon={Activity} />
        <MetricTile label="Open sessions" value={m?.activeSessions ?? 0} icon={Activity} />
        <MetricTile
          label="Blocked events"
          value={m?.blockedEvents ?? 0}
          icon={AlertTriangle}
          tone={m && m.blockedEvents > 0 ? 'warning' : 'default'}
          href="/admin/compliance"
        />
      </div>

      {/* Second row: deliverability + ops health */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          label="Live banners"
          value={m?.activeBanners ?? 0}
          icon={Megaphone}
          hint="System announcements visible right now"
          href="/admin/announcements"
        />
        <MetricTile
          label="Failed payroll (30d)"
          value={m?.failedPayroll30d ?? 0}
          icon={XCircle}
          tone={m && m.failedPayroll30d > 0 ? 'error' : 'default'}
        />
        <MetricTile
          label="Email sent (7d)"
          value={m?.emailSent7d ?? 0}
          icon={Mail}
          hint="Resend deliveries"
        />
        <MetricTile
          label="Email bounced (7d)"
          value={m?.emailBounced7d ?? 0}
          icon={Mail}
          tone={m && m.emailBounced7d > 0 ? 'warning' : 'default'}
          href="/admin/monitoring/suppressions"
        />
        <MetricTile
          label="Complaints (7d)"
          value={m?.emailComplained7d ?? 0}
          icon={Mail}
          tone={m && m.emailComplained7d > 0 ? 'error' : 'default'}
          href="/admin/monitoring/suppressions"
        />
      </div>

      {/* Notifications fired (last 7 days), grouped by kind */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <header className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Notifications fired (last 7d)
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Total: {m?.notifications7d ?? 0}
          </span>
        </header>
        <div className="grid gap-px bg-[var(--border-default)] sm:grid-cols-2 xl:grid-cols-3">
          {sortedKinds.length === 0 ? (
            <div className="col-span-full bg-[var(--bg-surface)] px-5 py-8 text-center text-xs text-[var(--text-muted)]">
              No notifications fired in the last 7 days.
            </div>
          ) : (
            sortedKinds.map(([kind, count]) => (
              <div key={kind} className="flex items-center justify-between bg-[var(--bg-surface)] px-5 py-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  {NOTIFICATION_KIND_LABEL[kind] ?? kind}
                </span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Existing dual list */}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="border-b border-[var(--border-default)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent operational alerts</h2>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {(data?.recentAlerts ?? []).length > 0 ? (
              data?.recentAlerts.map((alert) => (
                <div key={alert.id} className="flex gap-3 px-5 py-4">
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      alert.result === 'BLOCKED' ? 'bg-[var(--status-error)]' : 'bg-[var(--status-success)]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{alert.companyName}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{alert.description}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {alert.employeeName} · {formatDate(alert.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-sm text-[var(--text-muted)] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--status-success)]" />
                No recent alerts.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="border-b border-[var(--border-default)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent MPP sessions</h2>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {(data?.recentSessions ?? []).length > 0 ? (
              data?.recentSessions.map((session) => (
                <div key={session.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{session.companyName}</p>
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(session.opened_at)}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[var(--mono)]">{session.agent_wallet}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Spent ${session.total_spent.toFixed(2)} · {session.status}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-sm text-[var(--text-muted)]">No MPP session activity yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
