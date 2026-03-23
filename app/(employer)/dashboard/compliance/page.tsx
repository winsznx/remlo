'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ComplianceBadge } from '@/components/employee/ComplianceBadge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { useEmployerCompliance } from '@/lib/hooks/useDashboard'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function SummaryCard({
  label,
  count,
  total,
  icon,
  color,
}: {
  label: string
  count: number
  total: number
  icon: React.ReactNode
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{count}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{pct}% of active team</p>
    </div>
  )
}

export default function CompliancePage() {
  const queryClient = useQueryClient()
  const { data: employer } = useEmployer()
  const { data, isLoading, isError, error } = useEmployerCompliance(employer?.id)

  const handleRefresh = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['employer-compliance', employer?.id] })
  }, [employer?.id, queryClient])

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Compliance"
          description={error instanceof Error ? error.message : 'Unable to load compliance data.'}
        />
      </div>
    )
  }

  const displayedLog = data.auditLog.slice(0, 12)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Compliance"
        description="Monitor employee verification, TIP-403 checks, and audit events across the team."
        action={
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Verified"
          count={data.summary.verified}
          total={data.summary.total}
          icon={<ShieldCheck className="h-4 w-4 text-[var(--status-success)]" />}
          color="bg-[var(--accent-subtle)]"
        />
        <SummaryCard
          label="Pending KYC"
          count={data.summary.pending}
          total={data.summary.total}
          icon={<Clock className="h-4 w-4 text-[var(--status-pending)]" />}
          color="bg-amber-500/10"
        />
        <SummaryCard
          label="Action Required"
          count={data.summary.actionRequired}
          total={data.summary.total}
          icon={<AlertTriangle className="h-4 w-4 text-[var(--status-error)]" />}
          color="bg-red-500/10"
        />
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">TIP-403 policy</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{data.policy.description}</p>
          </div>
          <a
            href={`${TEMPO_EXPLORER_URL}/address/${data.policy.address}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            View registry
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Policy ID</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              {data.policy.policyId ? `#${data.policy.policyId}` : 'Not set'}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Type</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{data.policy.type}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Authorized wallets</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{data.policy.authorizedCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Registry address</p>
            <p className="mt-2 font-mono text-sm text-[var(--mono)]">
              {data.policy.address.slice(0, 10)}…{data.policy.address.slice(-6)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Team compliance status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-base)] text-left">
                {['Employee', 'KYC', 'TIP-403', 'Last checked', 'Profile'].map((label) => (
                  <th
                    key={label}
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {data.employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-[var(--bg-base)]">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--text-primary)]">{employee.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{employee.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <ComplianceBadge status={employee.kyc_status as 'approved' | 'pending' | 'rejected' | 'expired'} />
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                      employee.tip403 === 'authorized'
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : employee.tip403 === 'blocked'
                          ? 'bg-red-500/10 text-[var(--status-error)]'
                          : 'bg-[var(--bg-base)] text-[var(--text-secondary)]'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        employee.tip403 === 'authorized'
                          ? 'bg-[var(--accent)]'
                          : employee.tip403 === 'blocked'
                            ? 'bg-[var(--status-error)]'
                            : 'bg-[var(--text-muted)]'
                      }`} />
                      {employee.tip403}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--text-muted)]">{formatDate(employee.lastChecked)}</td>
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/team/${employee.id}`} className="text-xs font-medium text-[var(--accent)] hover:underline">
                      View employee
                    </Link>
                  </td>
                </tr>
              ))}
              {data.employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">
                    No employees are available in this workspace yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Audit log</h2>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {displayedLog.length === 0 ? (
            <div className="p-8 text-sm text-[var(--text-muted)]">No compliance events have been recorded yet.</div>
          ) : (
            displayedLog.map((entry) => (
              <div key={entry.id} className="flex gap-3 px-5 py-4">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${entry.result === 'CLEAR' ? 'bg-[var(--status-success)]' : 'bg-[var(--status-error)]'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-primary)]">{entry.employee_name}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{entry.description}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {entry.event_type.replaceAll('_', ' ')} · {formatDate(entry.created_at)}
                  </p>
                </div>
                <span className={`text-xs font-medium ${entry.result === 'CLEAR' ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                  {entry.result}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
