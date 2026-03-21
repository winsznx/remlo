'use client'

import * as React from 'react'
import { ShieldCheck, Clock, AlertTriangle, ExternalLink, RefreshCw, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComplianceBadge } from '@/components/employee/ComplianceBadge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'

// ─── Mock data (replaced in T35 with TanStack Query) ─────────────────────────

const MOCK_SUMMARY = { verified: 23, pending: 4, actionRequired: 1, total: 28 }

const MOCK_EMPLOYEES_COMPLIANCE = [
  { id: 'emp-1', name: 'Sofia Mendez', email: 'sofia.mendez@acme.com', kyc_status: 'approved' as const, tip403: 'authorized', lastChecked: '2026-03-15T09:55:00Z' },
  { id: 'emp-2', name: 'James Okonkwo', email: 'james.okonkwo@acme.com', kyc_status: 'pending' as const, tip403: 'pending', lastChecked: null },
  { id: 'emp-3', name: 'Priya Sharma', email: 'priya.sharma@acme.com', kyc_status: 'approved' as const, tip403: 'authorized', lastChecked: '2026-03-15T09:55:00Z' },
  { id: 'emp-4', name: 'Carlos Rodriguez', email: 'carlos.rodriguez@acme.com', kyc_status: 'approved' as const, tip403: 'authorized', lastChecked: '2026-02-15T09:45:00Z' },
  { id: 'emp-5', name: 'Amara Osei', email: 'amara.osei@acme.com', kyc_status: 'rejected' as const, tip403: 'blocked', lastChecked: '2026-03-10T14:00:00Z' },
]

const MOCK_AUDIT_LOG = [
  { id: 'ce-1', employee_name: 'Sofia Mendez', event_type: 'mpp_check', result: 'CLEAR', description: 'TIP-403 policy check passed during payroll run.', created_at: '2026-03-15T09:55:00Z' },
  { id: 'ce-2', employee_name: 'Priya Sharma', event_type: 'mpp_check', result: 'CLEAR', description: 'TIP-403 policy check passed during payroll run.', created_at: '2026-03-15T09:55:00Z' },
  { id: 'ce-3', employee_name: 'Sofia Mendez', event_type: 'kyc_approved', result: 'CLEAR', description: 'KYC verification approved via Bridge.', created_at: '2026-01-10T12:00:00Z' },
  { id: 'ce-4', employee_name: 'Amara Osei', event_type: 'kyc_rejected', result: 'BLOCKED', description: 'KYC documents insufficient — document expired.', created_at: '2026-03-10T14:00:00Z' },
  { id: 'ce-5', employee_name: 'Priya Sharma', event_type: 'kyc_approved', result: 'CLEAR', description: 'KYC verification approved via Bridge.', created_at: '2026-01-20T09:00:00Z' },
]

const MOCK_POLICY = {
  policyId: 1,
  type: 'BLACKLIST',
  address: '0x403c000000000000000000000000000000000000',
  authorizedCount: 23,
  description: 'Standard blacklist policy — blocks sanctioned addresses and OFAC-listed wallets.',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{count}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">{pct}% of team</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [refreshing, setRefreshing] = React.useState(false)
  const [expandedLog, setExpandedLog] = React.useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 1200))
    setRefreshing(false)
  }

  const displayedLog = expandedLog ? MOCK_AUDIT_LOG : MOCK_AUDIT_LOG.slice(0, 3)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Compliance"
        description="Monitor team KYC status, TIP-403 policy enforcement, and compliance events."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Verified"
          count={MOCK_SUMMARY.verified}
          total={MOCK_SUMMARY.total}
          icon={<ShieldCheck className="h-4 w-4 text-[var(--status-success)]" />}
          color="bg-[var(--accent-subtle)]"
        />
        <SummaryCard
          label="Pending KYC"
          count={MOCK_SUMMARY.pending}
          total={MOCK_SUMMARY.total}
          icon={<Clock className="h-4 w-4 text-[var(--status-pending)]" />}
          color="bg-amber-500/10"
        />
        <SummaryCard
          label="Action Required"
          count={MOCK_SUMMARY.actionRequired}
          total={MOCK_SUMMARY.total}
          icon={<AlertTriangle className="h-4 w-4 text-[var(--status-error)]" />}
          color="bg-red-500/10"
        />
      </div>

      {/* TIP-403 Policy Panel */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">TIP-403 Policy</h2>
          <a
            href={`${TEMPO_EXPLORER_URL}/address/${MOCK_POLICY.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
          >
            View on Tempo Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Policy ID</p>
            <p className="font-mono text-sm font-semibold text-[var(--text-primary)]">#{MOCK_POLICY.policyId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Type</p>
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              {MOCK_POLICY.type}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Authorized wallets</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{MOCK_POLICY.authorizedCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Contract address</p>
            <p className="font-mono text-xs text-[var(--mono)]">
              {MOCK_POLICY.address.slice(0, 10)}…{MOCK_POLICY.address.slice(-6)}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">{MOCK_POLICY.description}</p>
      </div>

      {/* Compliance table */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Team Compliance Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                {['Employee', 'KYC Status', 'TIP-403', 'Last Checked', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {MOCK_EMPLOYEES_COMPLIANCE.map((emp) => (
                <tr key={emp.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{emp.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{emp.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <ComplianceBadge status={emp.kyc_status} />
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      emp.tip403 === 'authorized'
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : emp.tip403 === 'blocked'
                          ? 'bg-red-500/10 text-[var(--status-error)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        emp.tip403 === 'authorized' ? 'bg-[var(--accent)]' : emp.tip403 === 'blocked' ? 'bg-[var(--status-error)]' : 'bg-[var(--status-neutral)]'
                      }`} />
                      {emp.tip403.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                    {emp.lastChecked ? formatDate(emp.lastChecked) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        title="Refresh compliance check"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--status-pending)] transition-colors"
                        title="Flag for review"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit log */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Compliance Audit Log</h2>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {displayedLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-5 py-4">
              <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${entry.result === 'CLEAR' ? 'bg-[var(--status-success)]' : 'bg-[var(--status-error)]'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{entry.employee_name}</p>
                  <span className="text-xs text-[var(--text-muted)]">·</span>
                  <span className="text-xs text-[var(--text-muted)]">{entry.event_type}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{entry.description}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDate(entry.created_at)}</p>
              </div>
              <span className={`text-xs font-medium shrink-0 ${entry.result === 'CLEAR' ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                {entry.result}
              </span>
            </div>
          ))}
        </div>
        {MOCK_AUDIT_LOG.length > 3 && (
          <div className="px-5 py-3 border-t border-[var(--border-default)]">
            <button
              onClick={() => setExpandedLog((v) => !v)}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {expandedLog ? '↑ Show less' : `↓ Show all ${MOCK_AUDIT_LOG.length} events`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
