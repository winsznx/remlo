import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Badge accepts any string — the DB column `employees.kyc_status` is typed
 * `text` with no enum constraint and different code paths write different
 * values (`verified`, `blocked`, `approved`, `pending`, `rejected`, `expired`).
 * Unknown values fall through to a neutral fallback instead of crashing the
 * render tree.
 */

interface StatusConfig {
  label: string
  dot: string
  text: string
  bg: string
}

const APPROVED: StatusConfig = {
  label: 'Approved',
  dot: 'bg-[var(--status-success)]',
  text: 'text-[var(--status-success)]',
  bg: 'bg-[var(--accent-subtle)]',
}

const PENDING: StatusConfig = {
  label: 'Pending',
  dot: 'bg-[var(--status-pending)]',
  text: 'text-[var(--status-pending)]',
  bg: 'bg-amber-500/10',
}

const REJECTED: StatusConfig = {
  label: 'Rejected',
  dot: 'bg-[var(--status-error)]',
  text: 'text-[var(--status-error)]',
  bg: 'bg-red-500/10',
}

const EXPIRED: StatusConfig = {
  label: 'Expired',
  dot: 'bg-[var(--status-neutral)]',
  text: 'text-[var(--status-neutral)]',
  bg: 'bg-[var(--bg-subtle)]',
}

const NEUTRAL: StatusConfig = {
  label: 'Unknown',
  dot: 'bg-[var(--status-neutral)]',
  text: 'text-[var(--text-muted)]',
  bg: 'bg-[var(--bg-subtle)]',
}

// Maps every real DB value to a config. Aliases are intentional — `verified`
// is semantically the same as `approved`, `blocked` is semantically the same
// as `rejected`. Both surfaces end up in live code paths (see seed-24-employees
// and lib/agent/tools/compliance-report.ts).
const STATUS_CONFIG: Record<string, StatusConfig> = {
  approved: APPROVED,
  verified: { ...APPROVED, label: 'Verified' },
  pending: PENDING,
  rejected: REJECTED,
  blocked: { ...REJECTED, label: 'Blocked' },
  expired: EXPIRED,
}

interface ComplianceBadgeProps {
  status: string | null | undefined
  tooltip?: string
  className?: string
}

export function ComplianceBadge({ status, tooltip, className }: ComplianceBadgeProps) {
  const key = (status ?? '').toString().toLowerCase()
  const cfg = STATUS_CONFIG[key] ?? {
    ...NEUTRAL,
    label: status ? String(status) : 'Unknown',
  }

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
