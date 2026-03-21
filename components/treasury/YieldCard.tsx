'use client'

import * as React from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type YieldModel = 'employer_keeps' | 'employee_bonus' | 'split'

const MODEL_LABELS: Record<YieldModel, string> = {
  employer_keeps: 'Employer keeps',
  employee_bonus: 'Employee bonus',
  split: '50/50 split',
}

interface YieldCardProps {
  apy: number
  earned: number
  model: YieldModel
  onModelChange?: (model: YieldModel) => void
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

export function YieldCard({ apy, earned, model, onModelChange, className }: YieldCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-5',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-muted)]">Treasury Yield</p>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--accent-subtle)] text-[var(--accent)]"
        >
          <Sparkles className="h-3 w-3" />
          {apy.toFixed(1)}% APY
        </span>
      </div>

      {/* Earned */}
      <div>
        <p className="number-lg text-[var(--text-primary)]">
          $<AnimatedNumber value={earned} />
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Earned this month</p>
      </div>

      {/* Model selector */}
      <div className="space-y-1.5">
        <p className="text-xs text-[var(--text-muted)]">Yield model</p>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--bg-subtle)] p-1">
          {(Object.keys(MODEL_LABELS) as YieldModel[]).map((m) => (
            <button
              key={m}
              onClick={() => onModelChange?.(m)}
              className={cn(
                'rounded-md px-2 py-1.5 text-xs font-medium transition-all',
                model === m
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
              )}
            >
              {MODEL_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
