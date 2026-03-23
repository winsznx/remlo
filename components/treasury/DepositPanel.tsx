'use client'

import * as React from 'react'
import { Copy, Check, Building2, X, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'

interface DepositPanelProps {
  bankName?: string
  accountNumber?: string
  routingNumber?: string
  swiftCode?: string
  walletAddress?: string
  onClose?: () => void
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
    <div className="flex items-center justify-between py-3 px-4 border-b border-[var(--border-default)] last:border-0">
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
  walletAddress,
  onClose,
  className,
}: DepositPanelProps) {
  const [tab, setTab] = React.useState<'bank' | 'crypto'>('bank')
  const hasCryptoTab = Boolean(walletAddress)

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center">
            {tab === 'bank' ? (
              <Building2 className="h-5 w-5 text-[var(--text-muted)]" />
            ) : (
              <Wallet className="h-5 w-5 text-[var(--text-muted)]" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {tab === 'bank' ? 'Deposit via Bank Transfer' : 'Deposit via Crypto'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {tab === 'bank' ? bankName : 'Direct stablecoin deposit'}
            </p>
          </div>
        </div>
        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            aria-label="Close deposit panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {hasCryptoTab ? (
        <div className="inline-flex rounded-lg bg-[var(--bg-subtle)] p-1">
          <button
            onClick={() => setTab('bank')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === 'bank' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            )}
          >
            Bank Transfer
          </button>
          <button
            onClick={() => setTab('crypto')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === 'crypto' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            )}
          >
            Crypto
          </button>
        </div>
      ) : null}

      {tab === 'bank' ? (
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
      ) : (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
          {walletAddress ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">Send supported stablecoins directly to this treasury address.</p>
              <AddressDisplay address={walletAddress} showFull />
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              Crypto deposit details will appear when a treasury wallet is available
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        {tab === 'bank'
          ? 'Funds convert to pathUSD automatically on receipt. Typical settlement: same business day.'
          : 'Crypto deposits settle on Tempo immediately and can be used in payroll as soon as they confirm.'}
      </p>
    </div>
  )
}
