'use client'

import Link from 'next/link'
import { ArrowUpRight, Clock3, Wallet } from 'lucide-react'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { GasSponsored } from '@/components/wallet/GasSponsored'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployee, useEmployeeBalance, useEmployerForEmployee } from '@/lib/hooks/useEmployee'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function WalletPage() {
  const { data: employee, isLoading } = useEmployee()
  const { data: balance } = useEmployeeBalance(employee?.id)
  const { data: employer } = useEmployerForEmployee(employee?.employer_id)

  if (isLoading) {
    return <div className="mx-auto h-80 max-w-[640px] animate-pulse rounded-2xl bg-[var(--bg-subtle)] px-4 pt-6" />
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-6 px-4 pb-24 pt-6">
      <SectionHeader
        title="Wallet"
        description="Your embedded Tempo wallet is where Remlo salary funding, streaming accrual, and card spend authorization are anchored."
      />

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Available balance</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{formatCurrency(balance?.available_usd ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Employer</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{employer?.company_name ?? 'Your company'}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Wallet address</p>
            {employee?.wallet_address ? (
              <div className="mt-2 space-y-3">
                <AddressDisplay address={employee.wallet_address} />
                <GasSponsored />
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Your wallet will appear here after invite acceptance and embedded wallet provisioning.</p>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 text-[var(--text-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {employee?.pay_frequency === 'stream' ? 'Streaming salary enabled' : 'Scheduled payroll cadence'}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {employee?.pay_frequency === 'stream'
                    ? 'Your salary can accrue every second through StreamVesting.'
                    : `Payroll is configured on a ${employee?.pay_frequency ?? 'monthly'} basis.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {employee?.wallet_address ? (
          <Button asChild variant="outline" className="mt-5 w-full">
            <a href={`${TEMPO_EXPLORER_URL}/address/${employee.wallet_address}`} target="_blank" rel="noreferrer">
              View on Tempo Explorer
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
