'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Landmark } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { TreasuryCard } from '@/components/treasury/TreasuryCard'
import { YieldCard } from '@/components/treasury/YieldCard'
import { DepositPanel } from '@/components/treasury/DepositPanel'
import { FundingReadinessCard } from '@/components/treasury/FundingReadinessCard'
import { TxHistoryTable, type TxHistoryItem } from '@/components/treasury/TxHistoryTable'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/button'
import { useEmployer, usePaymentItemsRealtime, usePayrollRunsRealtime } from '@/lib/hooks/useEmployer'
import { useTransactions, useTreasury, useYield } from '@/lib/hooks/useDashboard'

const PAGE_SIZE = 8

export default function TreasuryPage() {
  const queryClient = useQueryClient()
  const { data: employer } = useEmployer()
  const [page, setPage] = React.useState(1)
  const [yieldModel, setYieldModel] = React.useState<'employer_keeps' | 'employee_bonus' | 'split'>('employer_keeps')

  const { data: treasuryData } = useTreasury(employer?.id)
  const { data: yieldData } = useYield()
  const { data: txData, refetch: refetchTx, isLoading: txLoading } = useTransactions({ page, limit: PAGE_SIZE })

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    void refetchTx()
  }, [queryClient, refetchTx])

  usePayrollRunsRealtime(employer?.id, invalidate)
  usePaymentItemsRealtime(employer?.id, invalidate)

  const liveItems: TxHistoryItem[] = (txData?.items ?? []).map((item) => ({
    id: item.id,
    type: 'payroll',
    description: item.description,
    amount: item.amount,
    txHash: item.tx_hash,
    createdAt: item.created_at,
    status: item.status,
  }))

  const totalPages = Math.max(1, Math.ceil((txData?.total ?? 0) / PAGE_SIZE))
  const displayApy = yieldData?.apy_percent ?? 0
  const displayEarned = yieldData ? Number.parseFloat(yieldData.accrued_usd) : 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Treasury"
        description="Track employer balances, deposit readiness, and payroll movement across the Tempo treasury."
        action={
          <Button asChild>
            <Link href="/dashboard/treasury/deposit">
              Open deposit page
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <TreasuryCard
        available={treasuryData?.available_usd ?? 0}
        locked={treasuryData?.locked_usd ?? 0}
        className="w-full"
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="border-b border-[var(--border-default)] px-5 py-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Deposit funds</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Bank rails are shown when Bridge virtual-account details are available locally.</p>
            </div>
            <div className="p-5">
              <DepositPanel bankName={employer?.company_name ? `${employer.company_name} treasury` : 'Remlo employer treasury'} />
            </div>
          </div>

          <FundingReadinessCard
            companyName={employer?.company_name ?? 'Employer workspace'}
            bridgeCustomerId={employer?.bridge_customer_id ?? null}
            virtualAccountId={employer?.bridge_virtual_account_id ?? null}
            treasuryContract={employer?.treasury_contract ?? null}
            subscriptionTier={employer?.subscription_tier ?? 'starter'}
          />
        </div>

        <YieldCard
          apy={displayApy}
          earned={displayEarned}
          model={yieldData?.yield_model ?? yieldModel}
          onModelChange={setYieldModel}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Treasury movement</h2>
        </div>
        {txLoading ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-muted)]">
            Loading treasury activity…
          </div>
        ) : (
          <TxHistoryTable items={liveItems} page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
