'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownRight, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type TransferState = 'idle' | 'submitting' | 'success' | 'error'

interface OffRampPanelProps {
  availableBalance: number
  bankAccountLast4?: string
  bankName?: string
  onTransfer?: (amount: number) => Promise<void>
  className?: string
}

export function OffRampPanel({
  availableBalance,
  bankAccountLast4,
  bankName = 'Bank account',
  onTransfer,
  className,
}: OffRampPanelProps) {
  const [amount, setAmount] = React.useState('')
  const [state, setState] = React.useState<TransferState>('idle')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const numericAmount = parseFloat(amount)
  const isValid =
    !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= availableBalance

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setState('submitting')
    setErrorMsg(null)
    try {
      await onTransfer?.(numericAmount)
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Transfer failed')
      setState('error')
    }
  }

  function reset() {
    setAmount('')
    setState('idle')
    setErrorMsg(null)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-center">
          <ArrowDownRight className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Transfer to Bank</p>
          <p className="text-xs text-[var(--text-muted)]">
            {bankAccountLast4 ? `${bankName} ••${bankAccountLast4}` : bankName}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state !== 'success' && (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">$</span>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  max={availableBalance}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Available: ${availableBalance.toFixed(2)}</span>
                <button
                  type="button"
                  className="text-[var(--accent)] hover:underline"
                  onClick={() => setAmount(availableBalance.toFixed(2))}
                >
                  Max
                </button>
              </div>
            </div>

            {/* Error */}
            {state === 'error' && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-[var(--status-error)]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={!isValid || state === 'submitting'}
              className="w-full"
            >
              {state === 'submitting' ? 'Submitting...' : 'Transfer funds'}
            </Button>

            <p className="text-xs text-center text-[var(--text-muted)]">
              Funds arrive in 1–2 business days via ACH
            </p>
          </motion.form>
        )}

        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-4 py-4"
          >
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Transfer initiated</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                ${numericAmount.toFixed(2)} will arrive in 1–2 business days
              </p>
            </div>
            <Button variant="outline" onClick={reset} className="w-full">
              Transfer again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
