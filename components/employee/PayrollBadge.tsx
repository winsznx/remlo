import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Accepts any string. Real payroll_runs.status values in production include
 * `draft`, `pending`, `processing`, `completed`, `failed`, `confirmed`, and
 * ones added later. Unknown values fall back to a neutral config so the
 * render tree can't crash on a new enum value.
 */

interface StatusConfig {
  label: string
  dot: string
  text: string
  bg: string
}

const DRAFT: StatusConfig = {
  label: 'Draft',
  dot: 'bg-[var(--status-neutral)]',
  text: 'text-[var(--status-neutral)]',
  bg: 'bg-[var(--bg-subtle)]',
}

const PENDING: StatusConfig = {
  label: 'Pending',
  dot: 'bg-[var(--status-pending)]',
  text: 'text-[var(--status-pending)]',
  bg: 'bg-amber-500/10',
}

const PROCESSING: StatusConfig = {
  label: 'Processing',
  dot: 'bg-[var(--status-pending)] animate-pulse',
  text: 'text-[var(--status-pending)]',
  bg: 'bg-amber-500/10',
}

const COMPLETED: StatusConfig = {
  label: 'Completed',
  dot: 'bg-[var(--status-success)]',
  text: 'text-[var(--status-success)]',
  bg: 'bg-[var(--accent-subtle)]',
}

const FAILED: StatusConfig = {
  label: 'Failed',
  dot: 'bg-[var(--status-error)]',
  text: 'text-[var(--status-error)]',
  bg: 'bg-red-500/10',
}

const NEUTRAL: StatusConfig = {
  label: 'Unknown',
  dot: 'bg-[var(--status-neutral)]',
  text: 'text-[var(--text-muted)]',
  bg: 'bg-[var(--bg-subtle)]',
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: DRAFT,
  pending: PENDING,
  processing: PROCESSING,
  completed: COMPLETED,
  confirmed: { ...COMPLETED, label: 'Confirmed' },
  failed: FAILED,
}

interface PayrollBadgeProps {
  status: string | null | undefined
  className?: string
}

export function PayrollBadge({ status, className }: PayrollBadgeProps) {
  const key = (status ?? '').toString().toLowerCase()
  const cfg = STATUS_CONFIG[key] ?? {
    ...NEUTRAL,
    label: status ? String(status) : 'Unknown',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
