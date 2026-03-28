'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export type BatchStatus = 'idle' | 'signing' | 'submitting' | 'confirming' | 'success' | 'error'

interface BatchProgressProps {
  status: BatchStatus
  employeeCount: number
  txHash?: string
  error?: string
}

const STEPS: Array<{ key: BatchStatus; label: string }> = [
  { key: 'signing', label: 'Signing transaction' },
  { key: 'submitting', label: 'Broadcasting to Tempo' },
  { key: 'confirming', label: 'Confirming on-chain' },
  { key: 'success', label: 'Payroll complete' },
]

const ORDER: Record<BatchStatus, number> = {
  idle: -1, signing: 0, submitting: 1, confirming: 2, success: 3, error: 3,
}

export function BatchProgress({ status, employeeCount, txHash, error }: BatchProgressProps) {
  const currentOrder = ORDER[status]

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const stepOrder = i
          const isDone = currentOrder > stepOrder || status === 'success'
          const isActive = currentOrder === stepOrder && status !== 'error'
          const isFailed = status === 'error' && currentOrder === stepOrder
          const isPending = currentOrder < stepOrder

          return (
            <div key={step.key} className="flex items-center gap-3">
              {/* Icon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle className="h-6 w-6 text-[var(--status-success)]" />
                  </motion.div>
                ) : isFailed ? (
                  <XCircle className="h-6 w-6 text-[var(--status-error)]" />
                ) : isActive ? (
                  <Loader2 className="h-6 w-6 text-[var(--accent)] animate-spin" />
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-[var(--border-strong)] opacity-40" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm font-medium transition-colors ${
                  isDone
                    ? 'text-[var(--status-success)]'
                    : isActive
                      ? 'text-[var(--text-primary)]'
                      : isFailed
                        ? 'text-[var(--status-error)]'
                        : 'text-[var(--text-muted)]'
                }`}
              >
                {step.label}
              </span>

              {/* Pulse for active */}
              {isActive && (
                <span className="ml-auto flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  In progress
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {status === 'error' && error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-[var(--status-error)]/30 bg-red-500/10 p-4 text-sm text-[var(--status-error)]"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success summary */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)] p-5 text-center space-y-2"
          >
            <p className="text-2xl">🎉</p>
            <p className="font-semibold text-[var(--text-primary)]">
              {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'} paid successfully
            </p>
            {txHash && (
              <a
                href={`https://explore.moderato.tempo.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-mono text-xs text-[var(--accent)] hover:underline"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-8)}
              </a>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              Settlement in 0.4s · Gasless · ISO 20022 memos attached
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
