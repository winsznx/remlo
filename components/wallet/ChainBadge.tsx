import * as React from 'react'
import { cn } from '@/lib/utils'

interface ChainBadgeProps {
  chain?: string
  className?: string
}

export function ChainBadge({ chain = 'Tempo Moderato', className }: ChainBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]',
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      {chain}
    </span>
  )
}
