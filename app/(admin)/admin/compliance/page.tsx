'use client'

import { SectionHeader } from '@/components/ui/SectionHeader'
import { useAdminScope, type AdminComplianceResponse } from '@/lib/hooks/useAdmin'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default function AdminCompliancePage() {
  const { data, isLoading } = useAdminScope<AdminComplianceResponse>('compliance')

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Compliance Feed"
        description="Cross-employer audit trail for KYC state changes, TIP-403 checks, and exceptions that may block payroll execution."
      />

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="divide-y divide-[var(--border-default)]">
          {(data?.events ?? []).length > 0 ? (
            data?.events.map((event) => (
              <div key={event.id} className="flex gap-3 px-5 py-4">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${event.result === 'BLOCKED' ? 'bg-[var(--status-error)]' : 'bg-[var(--status-success)]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{event.companyName}</p>
                    <span className="text-xs text-[var(--text-muted)]">•</span>
                    <p className="text-xs text-[var(--text-muted)]">{event.employeeName}</p>
                    <span className="text-xs text-[var(--text-muted)]">•</span>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{event.event_type.replaceAll('_', ' ')}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{event.description}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDate(event.created_at)}</p>
                </div>
                <span className={`text-xs font-medium ${event.result === 'BLOCKED' ? 'text-[var(--status-error)]' : 'text-[var(--status-success)]'}`}>
                  {event.result}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-sm text-[var(--text-muted)]">No compliance events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
