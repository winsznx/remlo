'use client'

import { Activity, Clock3, ShieldCheck, Wallet } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useAdminScope, type AdminMonitoringResponse } from '@/lib/hooks/useAdmin'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function AdminMonitoringPage() {
  const { data, isLoading } = useAdminScope<AdminMonitoringResponse>('monitoring')

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Monitoring"
        description="Operational pulse for webhook-derived events, pending payment backlog, open MPP sessions, and the most recent payroll submissions."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'KYC Events', value: data?.webhookSummary.kycEvents ?? 0, icon: ShieldCheck },
          { label: 'Blocked Events', value: data?.webhookSummary.blockedEvents ?? 0, icon: ShieldCheck },
          { label: 'Pending Payments', value: data?.webhookSummary.pendingPayments ?? 0, icon: Clock3 },
          { label: 'Open Sessions', value: data?.webhookSummary.openSessions ?? 0, icon: Wallet },
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

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="border-b border-[var(--border-default)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Session activity</h2>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {(data?.sessions ?? []).length > 0 ? (
              data?.sessions.map((session) => (
                <div key={session.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{session.companyName}</p>
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(session.opened_at)}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[var(--mono)]">{session.agent_wallet}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {session.status} · spent {formatCurrency(session.total_spent)}
                    {session.last_action ? ` · ${session.last_action}` : ''}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-sm text-[var(--text-muted)]">No active or recent sessions recorded.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="border-b border-[var(--border-default)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent payroll submissions</h2>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {(data?.payrollRuns ?? []).length > 0 ? (
              data?.payrollRuns.map((run) => (
                <div key={run.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{run.companyName}</p>
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(run.created_at)}</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {run.employee_count} employees · {formatCurrency(run.total_amount)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{run.status}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-sm text-[var(--text-muted)]">No payroll submissions recorded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
