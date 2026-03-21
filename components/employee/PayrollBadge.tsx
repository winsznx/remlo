import * as React from 'react'
import { cn } from '@/lib/utils'

type PayrollStatus = 'draft' | 'pending' | 'processing' | 'completed' | 'failed'

interface PayrollBadgeProps {
  status: PayrollStatus
  className?: string
}

const STATUS_CONFIG: Record<
  PayrollStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  draft: {
    label: 'Draft',
    dot: 'bg-[var(--status-neutral)]',
    text: 'text-[var(--status-neutral)]',
    bg: 'bg-[var(--bg-subtle)]',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-[var(--status-pending)]',
    text: 'text-[var(--status-pending)]',
    bg: 'bg-amber-500/10',
  },
  processing: {
    label: 'Processing',
    dot: 'bg-[var(--status-pending)] animate-pulse',
    text: 'text-[var(--status-pending)]',
    bg: 'bg-amber-500/10',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-[var(--status-success)]',
    text: 'text-[var(--status-success)]',
    bg: 'bg-[var(--accent-subtle)]',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-[var(--status-error)]',
    text: 'text-[var(--status-error)]',
    bg: 'bg-red-500/10',
  },
}

export function PayrollBadge({ status, className }: PayrollBadgeProps) {
  const cfg = STATUS_CONFIG[status]

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
