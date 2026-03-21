import * as React from 'react'
import { cn } from '@/lib/utils'

interface ChainBadgeProps {
  className?: string
}

export function ChainBadge({ className }: ChainBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]',
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      Tempo
    </span>
  )
}
