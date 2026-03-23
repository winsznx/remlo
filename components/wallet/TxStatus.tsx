'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'

type TxStatusState = 'pending' | 'confirming' | 'confirmed' | 'failed'

interface TxStatusProps {
  status: TxStatusState
  hash?: string
  txHash?: string
  confirmTime?: number
  className?: string
}

export function TxStatus({ status, hash, txHash, confirmTime, className }: TxStatusProps) {
  const resolvedHash = txHash ?? hash

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <AnimatePresence mode="wait">
        {status === 'pending' && (
          <motion.span
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[var(--text-muted)]"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--text-muted)] animate-pulse" />
            Pending
          </motion.span>
        )}

        {status === 'confirming' && (
          <motion.span
            key="confirming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[var(--status-pending)]"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--status-pending)] animate-pulse" />
            Confirming...
          </motion.span>
        )}

        {status === 'confirmed' && (
          <motion.span
            key="confirmed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[var(--status-success)]"
          >
            <CheckCircle className="h-4 w-4" />
            {confirmTime != null
              ? `Confirmed in ${confirmTime.toFixed(1)}s`
              : 'Confirmed'}
            {resolvedHash && (
              <a
                href={`${TEMPO_EXPLORER_URL}/tx/${resolvedHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </motion.span>
        )}

        {status === 'failed' && (
          <motion.span
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[var(--status-error)]"
          >
            <XCircle className="h-4 w-4" />
            Failed
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
