'use client'

import * as React from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { TrendingUp, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TreasuryCardProps {
  available: number
  locked: number
  currency?: string
  className?: string
}

function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const motionVal = useMotionValue(0)
  const display = useTransform(motionVal, (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v),
  )

  React.useEffect(() => {
    const controls = animate(motionVal, value, { duration: 1.2, ease: 'easeOut' })
    return controls.stop
  }, [value, motionVal])

  return <motion.span>{display}</motion.span>
}

export function TreasuryCard({ available, locked, currency = 'USD', className }: TreasuryCardProps) {
  const total = available + locked
  const availablePct = total > 0 ? (available / total) * 100 : 0

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-5',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-muted)]">Treasury Balance</p>
        <span className="text-xs text-[var(--text-muted)]">{currency}</span>
      </div>

      {/* Total balance */}
      <div>
        <p className="number-xl text-[var(--text-primary)]">
          $<AnimatedNumber value={total} />
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Total on-chain</p>
      </div>

      {/* Available / Locked split */}
      <div className="space-y-3">
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[var(--accent)]"
            initial={{ width: '0%' }}
            animate={{ width: `${availablePct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>

        {/* Labels */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="text-[var(--text-secondary)]">Available</span>
            <span className="font-semibold text-[var(--text-primary)]">
              $<AnimatedNumber value={available} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-[var(--status-pending)]" />
            <span className="text-[var(--text-secondary)]">Locked</span>
            <span className="font-semibold text-[var(--text-primary)]">
              $<AnimatedNumber value={locked} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
