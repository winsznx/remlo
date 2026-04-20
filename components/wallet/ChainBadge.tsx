import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ChainBadgeProps {
  chain?: string
  className?: string
}

export function ChainBadge({ chain = 'Tempo', className }: ChainBadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]',
        className,
      )}
    >
      <Image src="/chains/tempo.svg" alt="" width={12} height={12} className="shrink-0" />
      {chain}
    </span>
  )
}
