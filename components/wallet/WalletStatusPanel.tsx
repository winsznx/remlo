'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, CircleDashed, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'

interface WalletStatusPanelProps {
  title: string
  description: string
  sessionLabel: string
  sessionAddress?: string | null
  storedLabel: string
  storedAddress?: string | null
  syncedCopy: string
  missingStoredCopy: string
  mismatchCopy: string
  missingSessionCopy: string
  footer?: string
}

type WalletSyncState = 'synced' | 'missing-stored' | 'mismatch' | 'missing-session' | 'missing-both'

function getWalletSyncState(sessionAddress?: string | null, storedAddress?: string | null): WalletSyncState {
  if (sessionAddress && storedAddress) {
    return sessionAddress.toLowerCase() === storedAddress.toLowerCase() ? 'synced' : 'mismatch'
  }

  if (sessionAddress && !storedAddress) return 'missing-stored'
  if (!sessionAddress && storedAddress) return 'missing-session'
  return 'missing-both'
}

function getStateMeta(
  state: WalletSyncState,
  copy: Pick<
    WalletStatusPanelProps,
    'syncedCopy' | 'missingStoredCopy' | 'mismatchCopy' | 'missingSessionCopy'
  >
) {
  switch (state) {
    case 'synced':
      return {
        label: 'Ready',
        variant: 'success' as const,
        icon: CheckCircle2,
        body: copy.syncedCopy,
      }
    case 'missing-stored':
      return {
        label: 'Sync Needed',
        variant: 'warning' as const,
        icon: CircleDashed,
        body: copy.missingStoredCopy,
      }
    case 'mismatch':
      return {
        label: 'Review',
        variant: 'warning' as const,
        icon: AlertTriangle,
        body: copy.mismatchCopy,
      }
    case 'missing-session':
      return {
        label: 'Session Missing',
        variant: 'warning' as const,
        icon: CircleDashed,
        body: copy.missingSessionCopy,
      }
    case 'missing-both':
      return {
        label: 'Missing',
        variant: 'error' as const,
        icon: AlertTriangle,
        body: copy.missingStoredCopy,
      }
    default:
      return {
        label: 'Review',
        variant: 'neutral' as const,
        icon: CircleDashed,
        body: copy.missingStoredCopy,
      }
  }
}

export function WalletStatusPanel({
  title,
  description,
  sessionLabel,
  sessionAddress,
  storedLabel,
  storedAddress,
  syncedCopy,
  missingStoredCopy,
  mismatchCopy,
  missingSessionCopy,
  footer,
}: WalletStatusPanelProps) {
  const state = getWalletSyncState(sessionAddress, storedAddress)
  const meta = getStateMeta(state, { syncedCopy, missingStoredCopy, mismatchCopy, missingSessionCopy })
  const Icon = meta.icon

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        <Badge variant={meta.variant} className="gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{sessionLabel}</p>
          {sessionAddress ? (
            <div className="mt-3">
              <AddressDisplay address={sessionAddress} showFull />
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">No wallet surfaced in the current Privy session.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{storedLabel}</p>
          {storedAddress ? (
            <div className="mt-3">
              <AddressDisplay address={storedAddress} showFull />
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">No wallet has been saved in Remlo yet.</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">What this means</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{meta.body}</p>
        {footer ? <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{footer}</p> : null}
      </div>
    </div>
  )
}
