'use client'

import { usePrivy } from '@privy-io/react-auth'
import { ArrowUpRight, Clock3, AlertCircle } from 'lucide-react'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { GasSponsored } from '@/components/wallet/GasSponsored'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployee, useEmployeeBalance, useEmployerForEmployee } from '@/lib/hooks/useEmployee'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'
import { getPrimaryPrivyEthereumWallet } from '@/lib/privy-wallet'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function WalletPage() {
  const { user } = usePrivy()
  const { data: employee, isLoading } = useEmployee()
  const { data: balance } = useEmployeeBalance(employee?.id)
  const { data: employer } = useEmployerForEmployee(employee?.employer_id)
  const sessionWallet = getPrimaryPrivyEthereumWallet(user)

  if (isLoading) {
    return <div className="mx-auto h-80 max-w-[640px] animate-pulse rounded-2xl bg-[var(--bg-subtle)] px-4 pt-6" />
  }

  const storedWallet = employee?.wallet_address
  const hasMismatch = Boolean(sessionWallet && storedWallet && sessionWallet.toLowerCase() !== storedWallet.toLowerCase())

  return (
    <div className="mx-auto max-w-[640px] space-y-6 px-4 pb-24 pt-6">
      <SectionHeader
        title="Wallet"
        description="Your embedded wallet holds salary funding and card authorization."
      />

      {hasMismatch && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--status-pending)]/30 bg-[var(--status-pending)]/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-pending)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">We&apos;re syncing your wallet</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              If this persists, sign out and sign back in using the method you used to accept your invite.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Available balance</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] tabular-nums">
              {formatCurrency(balance?.available_usd ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Employer</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{employer?.company_name ?? 'Your company'}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Wallet address</p>
          {storedWallet ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <AddressDisplay address={storedWallet} />
              <GasSponsored />
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Your wallet will appear here once your invite is accepted.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-muted)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {employee?.pay_frequency === 'stream' ? 'Streaming salary enabled' : 'Scheduled payroll'}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                {employee?.pay_frequency === 'stream'
                  ? 'Your salary accrues every second while you work.'
                  : `You are paid on a ${employee?.pay_frequency ?? 'monthly'} basis.`}
              </p>
            </div>
          </div>
        </div>

        {storedWallet && (
          <Button asChild variant="outline" className="w-full">
            <a href={`${TEMPO_EXPLORER_URL}/address/${storedWallet}`} target="_blank" rel="noreferrer">
              View on Tempo Explorer
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
