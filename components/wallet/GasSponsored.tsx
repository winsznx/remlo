import * as React from 'react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GasSponsoredProps {
  className?: string
}

export function GasSponsored({ className }: GasSponsoredProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        'bg-[var(--accent-subtle)] text-[var(--accent)]',
        className,
      )}
    >
      <Zap className="h-3 w-3" />
      Gasless
    </span>
  )
}
