'use client'

import * as React from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'

interface AddressDisplayProps {
  address: string
  label?: string
  showFull?: boolean
  showExplorer?: boolean
  explorerUrl?: string
  className?: string
}

function truncateAddress(address: string): string {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function AddressDisplay({
  address,
  label,
  showFull = false,
  showExplorer = true,
  explorerUrl,
  className,
}: AddressDisplayProps) {
  const resolvedExplorerUrl = explorerUrl ?? `${TEMPO_EXPLORER_URL}/address/${address}`
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={label ? `${label}: ${address}` : address}>
      {label ? <span className="text-xs text-[var(--text-muted)]">{label}</span> : null}
      <span className="font-mono text-sm text-[var(--mono)]">
        {showFull ? address : truncateAddress(address)}
      </span>
      <button
        onClick={handleCopy}
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        aria-label="Copy address"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[var(--status-success)]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {showExplorer && (
        <a
          href={resolvedExplorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          aria-label="View on Tempo Explorer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  )
}
