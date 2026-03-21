'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type CardStatus = 'active' | 'inactive' | 'frozen' | 'pending'

interface VisaCardDisplayProps {
  last4?: string
  holderName?: string
  expiryMonth?: number
  expiryYear?: number
  status?: CardStatus
  className?: string
}

const STATUS_LABEL: Record<CardStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  frozen: 'Frozen',
  pending: 'Processing',
}

const STATUS_COLOR: Record<CardStatus, string> = {
  active: 'text-[var(--status-success)]',
  inactive: 'text-[var(--status-neutral)]',
  frozen: 'text-[var(--status-pending)]',
  pending: 'text-[var(--status-pending)]',
}

export function VisaCardDisplay({
  last4 = '••••',
  holderName = 'CARDHOLDER',
  expiryMonth,
  expiryYear,
  status = 'pending',
  className,
}: VisaCardDisplayProps) {
  const expiry =
    expiryMonth != null && expiryYear != null
      ? `${String(expiryMonth).padStart(2, '0')}/${String(expiryYear).slice(-2)}`
      : '••/••'

  return (
    <div className={cn('space-y-3', className)}>
      {/* Card face */}
      <div
        className={cn(
          'relative w-full max-w-sm rounded-2xl p-6 overflow-hidden select-none',
          'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]',
          'border border-white/10',
        )}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        {/* Top row: chip + Visa */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-10 rounded-md bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-90" />
          <span className="text-white/80 text-xl font-bold italic tracking-wider">VISA</span>
        </div>

        {/* Card number */}
        <p className="font-mono text-lg tracking-[0.25em] text-white/90 mb-6">
          •••• •••• •••• {last4}
        </p>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Card holder</p>
            <p className="font-mono text-sm text-white/90 uppercase tracking-wider">{holderName}</p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Expires</p>
            <p className="font-mono text-sm text-white/90">{expiry}</p>
          </div>
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-[var(--text-muted)]">Visa Prepaid Debit</p>
        <p className={cn('text-sm font-medium', STATUS_COLOR[status])}>
          {STATUS_LABEL[status]}
        </p>
      </div>
    </div>
  )
}
