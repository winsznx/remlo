'use client'

import * as React from 'react'
import { Building2, Wallet } from 'lucide-react'
import { OffRampPanel } from '@/components/card/OffRampPanel'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployee, useEmployeeBalance } from '@/lib/hooks/useEmployee'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'

export default function PortalOfframpSettingsPage() {
  const authedFetch = usePrivyAuthedFetch()
  const { data: employee, isLoading } = useEmployee()
  const { data: balance } = useEmployeeBalance(employee?.id)

  async function handleTransfer(amount: number) {
    if (!employee?.id) {
      throw new Error('Employee profile not found')
    }

    const response = await authedFetch(`/api/employees/${employee.id}/offramp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount.toFixed(2) }),
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `Transfer failed with status ${response.status}`)
    }
  }

  if (isLoading) {
    return <div className="mx-auto h-80 max-w-[640px] animate-pulse rounded-2xl bg-[var(--bg-subtle)] px-4 pt-6" />
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-6 px-4 pb-24 pt-6">
      <SectionHeader
        title="Off-ramp Settings"
        description="Move available PATHUSD balance into a connected bank account when your employee profile is ready."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Wallet className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.14em]">Available balance</p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            ${Number(balance?.available_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Building2 className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.14em]">Bank connection</p>
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
            {employee?.bridge_bank_account_id ? 'Connected and ready' : 'No bank account linked yet'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <OffRampPanel
          availableBalance={balance?.available_usd ?? 0}
          bankName={employee?.bridge_bank_account_id ? 'Connected bank account' : 'No bank account connected'}
          onTransfer={handleTransfer}
        />
      </div>
    </div>
  )
}
