'use client'

import * as React from 'react'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MppReceiptBadgeProps {
  amount: string
  route: string
  receiptHash?: string
  createdAt: string
  className?: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

export function MppReceiptBadge({ amount, route, receiptHash, createdAt, className }: MppReceiptBadgeProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2',
      className,
    )}>
      <CheckCircle className="h-3.5 w-3.5 text-[var(--status-success)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">${amount}</span>
          <span className="text-xs text-[var(--text-muted)] truncate">{route}</span>
        </div>
        {receiptHash && (
          <p className="font-mono text-xs text-[var(--text-muted)] truncate">{receiptHash.slice(0, 16)}…</p>
        )}
      </div>
      <span className="text-xs text-[var(--text-muted)] shrink-0">{timeAgo(createdAt)}</span>
    </div>
  )
}
