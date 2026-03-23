'use client'

import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { ArrowUpRight, Clock3, Wallet } from 'lucide-react'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { GasSponsored } from '@/components/wallet/GasSponsored'
import { WalletStatusPanel } from '@/components/wallet/WalletStatusPanel'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployee, useEmployeeBalance, useEmployerForEmployee } from '@/lib/hooks/useEmployee'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'
import { getPrimaryPrivyEthereumWallet } from '@/lib/privy-wallet'

function formatCurrency(value: number) {
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

      <WalletStatusPanel
        title="Employee Wallet Status"
        description="This compares the wallet currently surfaced by your Privy session with the payroll wallet saved to your employee profile. Remlo salary and card flows anchor to the saved employee wallet."
        sessionLabel="Current session wallet"
        sessionAddress={sessionWallet}
        storedLabel="Saved payroll wallet"
        storedAddress={employee?.wallet_address}
        syncedCopy="Your current Privy session wallet matches the employee wallet saved in Remlo. Salary balance, payroll receipts, and card authorization should all reference the same wallet."
        missingStoredCopy="A Privy wallet is available in your session, but it has not been saved to your employee profile yet. This usually means invite claiming or wallet sync has not completed."
        mismatchCopy="The wallet saved in your employee profile differs from the wallet in your current session. Remlo payroll flows still reference the saved wallet, so ask your employer to confirm which wallet should receive salary."
        missingSessionCopy="Remlo has a saved employee wallet, but your current session did not surface a Privy wallet. Try signing in again with the same method you used when you accepted your invite."
        footer="For most users this should sync automatically during invite acceptance. If it does not, the saved payroll wallet should be treated as the source of truth until support or admin review updates it."
      />
    </div>
  )
}
