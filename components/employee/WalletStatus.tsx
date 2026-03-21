import * as React from 'react'
import { cn } from '@/lib/utils'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'

type WalletState = 'connected' | 'pending' | 'none'

interface WalletStatusProps {
  address?: string | null
  status: WalletState
  className?: string
}

const STATE_CONFIG: Record<WalletState, { label: string; dot: string; text: string }> = {
  connected: {
    label: 'Connected',
    dot: 'bg-[var(--status-success)]',
    text: 'text-[var(--status-success)]',
  },
  pending: {
    label: 'Invite sent',
    dot: 'bg-[var(--status-pending)]',
    text: 'text-[var(--status-pending)]',
  },
  none: {
    label: 'No account',
    dot: 'bg-[var(--status-neutral)]',
    text: 'text-[var(--status-neutral)]',
  },
}

export function WalletStatus({ address, status, className }: WalletStatusProps) {
  const cfg = STATE_CONFIG[status]

  if (status === 'connected' && address) {
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
        <AddressDisplay address={address} showExplorer={false} />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        cfg.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
