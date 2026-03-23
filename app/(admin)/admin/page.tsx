'use client'

import { Activity, AlertTriangle, Building2, Users } from 'lucide-react'
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

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminScope<AdminOverviewResponse>('overview')

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Platform Overview"
        description="Cross-employer operational view for payroll volume, compliance risk, and active MPP session state."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Employers', value: data?.metrics.employers ?? 0, icon: Building2 },
          { label: 'Employees', value: data?.metrics.employees ?? 0, icon: Users },
          { label: 'Payroll Runs', value: data?.metrics.payrollRuns ?? 0, icon: Activity },
          { label: 'Open Sessions', value: data?.metrics.activeSessions ?? 0, icon: Activity },
          { label: 'Blocked Events', value: data?.metrics.blockedEvents ?? 0, icon: AlertTriangle },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{metric.label}</p>
                <Icon className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">{metric.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="border-b border-[var(--border-default)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent operational alerts</h2>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {(data?.recentAlerts ?? []).length > 0 ? (
              data?.recentAlerts.map((alert) => (
                <div key={alert.id} className="flex gap-3 px-5 py-4">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${alert.result === 'BLOCKED' ? 'bg-[var(--status-error)]' : 'bg-[var(--status-success)]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{alert.companyName}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{alert.description}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{alert.employeeName} · {formatDate(alert.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-sm text-[var(--text-muted)]">No recent alerts recorded.</div>
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
