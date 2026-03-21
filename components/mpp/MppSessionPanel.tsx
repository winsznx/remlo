'use client'

import * as React from 'react'
import { Zap, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MppSession {
  id: string
  agent_wallet: string
  max_deposit: number
  total_spent: number
  status: 'open' | 'closed' | 'expired'
  opened_at: string
  last_action?: string | null
}

interface MppSessionPanelProps {
  sessions: MppSession[]
  className?: string
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function truncateAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function StatusDot({ status }: { status: MppSession['status'] }) {
  return (
    <span className={cn(
      'h-2 w-2 rounded-full shrink-0',
      status === 'open' ? 'bg-[var(--status-success)] animate-pulse' : status === 'closed' ? 'bg-[var(--status-neutral)]' : 'bg-[var(--status-error)]',
    )} />
  )
}

export function MppSessionPanel({ sessions, className }: MppSessionPanelProps) {
  if (sessions.length === 0) {
    return (
      <div className={cn('rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center', className)}>
        <Zap className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm font-medium text-[var(--text-primary)]">No active sessions</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          MPP payment sessions will appear here when agents connect.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden', className)}>
      <div className="divide-y divide-[var(--border-default)]">
        {sessions.map((session) => {
          const remaining = session.max_deposit - session.total_spent
          const usedPct = session.max_deposit > 0 ? (session.total_spent / session.max_deposit) * 100 : 0

          return (
            <div key={session.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={session.status} />
                  <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">{session.status}</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {truncateAddress(session.agent_wallet)}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{formatDate(session.opened_at)}</span>
              </div>

              {/* Spend progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)]">Spent</span>
                    <span className="font-mono font-semibold text-[var(--text-primary)]">${session.total_spent.toFixed(2)}</span>
                  </div>
                  <span className="text-[var(--text-muted)] font-mono">${remaining.toFixed(2)} remaining</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${Math.min(100, usedPct)}%` }}
                  />
                </div>
              </div>

              {session.last_action && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Clock className="h-3 w-3" />
                  Last action: {session.last_action}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
