'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type SolanaStatus = 'pending' | 'confirmed' | 'finalized' | 'failed'

interface SolanaTxStatusProps {
  signature: string
  cluster: 'devnet' | 'mainnet-beta'
  status?: SolanaStatus
  className?: string
}

function truncateSig(sig: string): string {
  if (sig.length < 20) return sig
  return `${sig.slice(0, 8)}…${sig.slice(-8)}`
}

export function SolanaTxStatus({ signature, cluster, status = 'confirmed', className }: SolanaTxStatusProps) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(signature)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <AnimatePresence mode="wait">
        {status === 'pending' && (
          <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="h-2 w-2 rounded-full bg-[var(--status-pending)] animate-pulse" />
        )}
        {(status === 'confirmed' || status === 'finalized') && (
          <motion.span key="confirmed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <CheckCircle className="h-4 w-4 text-[var(--status-success)]" />
          </motion.span>
        )}
        {status === 'failed' && (
          <motion.span key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <XCircle className="h-4 w-4 text-[var(--status-error)]" />
          </motion.span>
        )}
      </AnimatePresence>

      <span className="font-mono text-xs text-[var(--mono)]">{truncateSig(signature)}</span>

      <button
        onClick={() => void handleCopy()}
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        aria-label="Copy signature"
      >
        {copied
          ? <Check className="h-3.5 w-3.5 text-[var(--status-success)]" />
          : <Copy className="h-3.5 w-3.5" />}
      </button>

      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        aria-label="View on Solana Explorer"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </span>
  )
}
