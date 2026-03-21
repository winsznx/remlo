'use client'

import * as React from 'react'
import { TreasuryCard } from '@/components/treasury/TreasuryCard'
import { YieldCard } from '@/components/treasury/YieldCard'
import { DepositPanel } from '@/components/treasury/DepositPanel'
import { TxHistoryTable, type TxHistoryItem } from '@/components/treasury/TxHistoryTable'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useYield, useTransactions } from '@/lib/hooks/useDashboard'
import { useEmployer, usePayrollRunsRealtime, usePaymentItemsRealtime } from '@/lib/hooks/useEmployer'
import { useQueryClient } from '@tanstack/react-query'

// ─── Mock data (replaced in T35 with TanStack Query) ─────────────────────────

const MOCK_TX_HISTORY: TxHistoryItem[] = [
  {
    id: 'tx-1', type: 'deposit', description: 'ACH deposit from Acme Corp checking',
    amount: 60000, txHash: '0xaabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344',
    createdAt: '2026-03-10T14:23:00Z', status: 'confirmed',
  },
  {
    id: 'tx-2', type: 'payroll', description: 'Payroll run — 28 employees (Mar 15)',
    amount: 52500, txHash: '0x9988776655443322998877665544332299887766554433229988776655443322',
    createdAt: '2026-03-15T10:01:22Z', status: 'confirmed',
  },
  {
    id: 'tx-3', type: 'yield', description: 'Yield distribution — employer_keeps model',
    amount: 184.50, txHash: '0x1122334455667788112233445566778811223344556677881122334455667788',
    createdAt: '2026-03-16T00:00:00Z', status: 'confirmed',
  },
  {
    id: 'tx-4', type: 'deposit', description: 'ACH deposit from Acme Corp checking',
    amount: 25000, txHash: '0xaabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223345',
    createdAt: '2026-02-05T09:14:00Z', status: 'confirmed',
  },
  {
    id: 'tx-5', type: 'payroll', description: 'Payroll run — 28 employees (Feb 15)',
    amount: 52500, txHash: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    createdAt: '2026-02-15T09:47:00Z', status: 'confirmed',
  },
  {
    id: 'tx-6', type: 'yield', description: 'Yield distribution — employer_keeps model',
    amount: 162.30, txHash: null, createdAt: '2026-02-16T00:00:00Z', status: 'pending',
  },
]

const PAGE_SIZE = 5

export default function TreasuryPage() {
  const [yieldModel, setYieldModel] = React.useState<'employer_keeps' | 'employee_bonus' | 'split'>('employer_keeps')
  const [page, setPage] = React.useState(1)
  const queryClient = useQueryClient()
  const { data: employer } = useEmployer()
  const { data: yieldData } = useYield()
  const { data: txData, refetch: refetchTx, isLoading: txLoading, isError: txError } = useTransactions({ page, limit: PAGE_SIZE })

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    void refetchTx()
  }, [queryClient, refetchTx])

  usePayrollRunsRealtime(employer?.id, invalidate)
  usePaymentItemsRealtime(employer?.id, invalidate)

  // Merge real tx data or fallback to mock
  const liveItems: TxHistoryItem[] = txData?.items.map((item) => ({
    id: item.id,
    type: item.type as TxHistoryItem['type'],
    description: item.description,
    amount: item.amount,
    txHash: item.tx_hash,
    createdAt: item.created_at,
    status: item.status,
  })) ?? []

  const displayItems = liveItems.length > 0 ? liveItems : MOCK_TX_HISTORY.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalItems = txData?.total ?? MOCK_TX_HISTORY.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)

  const displayApy = yieldData?.apy_percent ?? 3.7
  const displayEarned = yieldData ? parseFloat(yieldData.accrued_usd) : 184.5

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Treasury"
        description="Manage your on-chain payroll treasury and yield."
      />

      {/* TreasuryCard — full width prominent */}
      <TreasuryCard available={47250} locked={12750} className="w-full" />

      {/* Deposit + Yield */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-default)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Deposit Funds</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Fund your treasury via bank transfer or crypto.
            </p>
          </div>
          <div className="p-5">
            <DepositPanel
              bankName="Remlo Treasury Account"
              accountNumber="1234567890"
              routingNumber="021000021"
              swiftCode="CHASUS33"
            />
          </div>
        </div>
        <YieldCard
          apy={displayApy}
          earned={displayEarned}
          model={yieldData?.yield_model ?? yieldModel}
          onModelChange={setYieldModel}
        />
      </div>

      {/* Transaction History */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Transaction History</h2>
        {txError && (
          <p className="text-sm text-[var(--status-error)]">Failed to load transactions. Showing cached data.</p>
        )}
        {txLoading ? (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center text-sm text-[var(--text-muted)] animate-pulse">
            Loading transactions…
          </div>
        ) : (
          <TxHistoryTable
            items={displayItems}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
