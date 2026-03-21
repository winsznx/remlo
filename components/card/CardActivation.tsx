'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActivationState = 'idle' | 'activating' | 'success' | 'error'

interface CardActivationProps {
  onActivate?: () => Promise<void>
  className?: string
}

export function CardActivation({ onActivate, className }: CardActivationProps) {
  const [state, setState] = React.useState<ActivationState>('idle')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  async function handleActivate() {
    setState('activating')
    setErrorMsg(null)
    try {
      await onActivate?.()
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Activation failed')
      setState('error')
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-center space-y-4',
        className,
      )}
    >
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center">
              <CreditCard className="h-7 w-7 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Activate your card</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Your Visa Prepaid Debit card is ready to activate
              </p>
            </div>
            <Button onClick={handleActivate} className="w-full">
              Activate card
            </Button>
          </motion.div>
        )}

        {state === 'activating' && (
          <motion.div
            key="activating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4 py-4"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center">
              <CreditCard className="h-7 w-7 text-[var(--accent)] animate-pulse" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">Activating your card...</p>
          </motion.div>
        )}

        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4 py-4"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Card activated!</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Your card is ready to use anywhere Visa is accepted
              </p>
            </div>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-[var(--status-error)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Activation failed</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">{errorMsg}</p>
            </div>
            <Button variant="outline" onClick={() => setState('idle')} className="w-full">
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
