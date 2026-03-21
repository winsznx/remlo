'use client'

import * as React from 'react'
import { Copy, Check, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DepositPanelProps {
  bankName?: string
  accountNumber?: string
  routingNumber?: string
  swiftCode?: string
  className?: string
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-default)] last:border-0">
      <div className="space-y-0.5">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="font-mono text-sm text-[var(--text-primary)]">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-[var(--status-success)]" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export function DepositPanel({
  bankName = 'Bridge Financial',
  accountNumber,
  routingNumber,
  swiftCode,
  className,
}: DepositPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center">
          <Building2 className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Deposit via Bank Transfer</p>
          <p className="text-xs text-[var(--text-muted)]">{bankName}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="rounded-lg border border-[var(--border-default)] divide-y divide-[var(--border-default)] overflow-hidden">
        {accountNumber && (
          <CopyField label="Account number" value={accountNumber} />
        )}
        {routingNumber && (
          <CopyField label="Routing number (ACH)" value={routingNumber} />
        )}
        {swiftCode && (
          <CopyField label="SWIFT / BIC" value={swiftCode} />
        )}
        {!accountNumber && !routingNumber && !swiftCode && (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">
            Bank details will appear after KYB verification
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Funds convert to pathUSD automatically on receipt. Typical settlement: same business day.
      </p>
    </div>
  )
}
