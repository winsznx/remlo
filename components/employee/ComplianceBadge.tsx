import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type ComplianceStatus = 'approved' | 'pending' | 'rejected' | 'expired'

interface ComplianceBadgeProps {
  status: ComplianceStatus
  tooltip?: string
  className?: string
}

const STATUS_CONFIG: Record<
  ComplianceStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  approved: {
    label: 'Approved',
    dot: 'bg-[var(--status-success)]',
    text: 'text-[var(--status-success)]',
    bg: 'bg-[var(--accent-subtle)]',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-[var(--status-pending)]',
    text: 'text-[var(--status-pending)]',
    bg: 'bg-amber-500/10',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-[var(--status-error)]',
    text: 'text-[var(--status-error)]',
    bg: 'bg-red-500/10',
  },
  expired: {
    label: 'Expired',
    dot: 'bg-[var(--status-neutral)]',
    text: 'text-[var(--status-neutral)]',
    bg: 'bg-[var(--bg-subtle)]',
  },
}

export function ComplianceBadge({ status, tooltip, className }: ComplianceBadgeProps) {
  const cfg = STATUS_CONFIG[status]

  const badge = (
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

  if (!tooltip) return badge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
