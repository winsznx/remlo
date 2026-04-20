import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SolanaBadgeProps {
  className?: string
}

export function SolanaBadge({ className }: SolanaBadgeProps): React.ReactElement {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]',
      className,
    )}>
      <Image src="/chains/solana.svg" alt="" width={12} height={12} className="shrink-0" />
      Solana
    </span>
  )
}
