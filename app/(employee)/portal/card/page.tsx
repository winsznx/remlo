'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowDownRight, CreditCard, EyeOff, Landmark, ShieldAlert, Snowflake } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { VisaCardDisplay } from '@/components/card/VisaCardDisplay'
import { CardTransactions } from '@/components/card/CardTransactions'
import { OffRampPanel } from '@/components/card/OffRampPanel'
import { useEmployee, useEmployeeBalance, useEmployeeCard } from '@/lib/hooks/useEmployee'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'

function CardSkeleton() {
  return (
    <div className="mx-auto max-w-[640px] animate-pulse space-y-5 px-4 pb-24 pt-6">
      <div className="h-52 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]" />
      <div className="h-24 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]" />
      <div className="h-64 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]" />
    </div>
  )
}

export default function CardPage() {
  const authedFetch = usePrivyAuthedFetch()
  const { data: employee, isLoading } = useEmployee()
  const { data: balanceData } = useEmployeeBalance(employee?.id)
  const { data: cardData } = useEmployeeCard(employee?.id)
  const [offRampOpen, setOffRampOpen] = React.useState(false)

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

  if (isLoading) return <CardSkeleton />

  const hasCard = Boolean(cardData?.hasCard)
  const canTransfer = Boolean(employee?.bridge_bank_account_id)
  const holderName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.email?.split('@')[0] || 'Remlo User'

  return (
    <>
      <div className="mx-auto max-w-[640px] space-y-5 px-4 pb-28 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <VisaCardDisplay
            last4={cardData?.card?.last4 ?? undefined}
            holderName={holderName.toUpperCase()}
            expiryMonth={cardData?.card?.expiryMonth ?? undefined}
            expiryYear={cardData?.card?.expiryYear ?? undefined}
            status={hasCard ? 'active' : 'pending'}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Card program</p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                {hasCard ? 'Issued through Bridge' : 'Not issued yet'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">KYC</p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{employee?.kyc_status ?? 'pending'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Bank off-ramp</p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                {canTransfer ? 'Connected' : 'No bank account linked'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {hasCard ? (
              <Button className="sm:flex-1" onClick={() => setOffRampOpen(true)} disabled={!canTransfer}>
                <ArrowDownRight className="h-4 w-4" />
                Transfer to Bank
              </Button>
            ) : (
              <Button asChild className="sm:flex-1">
                <Link href="/portal/card/activate">
                  <CreditCard className="h-4 w-4" />
                  Activate Card
                </Link>
              </Button>
            )}

            <Button asChild variant="outline" className="sm:flex-1">
              <Link href="/portal/settings/offramp">
                <Landmark className="h-4 w-4" />
                Off-ramp Settings
              </Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="justify-start" disabled>
              <Snowflake className="h-4 w-4" />
              {cardData?.card?.status === 'frozen' ? 'Unfreeze card' : 'Freeze card'}
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <ShieldAlert className="h-4 w-4" />
              Report lost card
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <EyeOff className="h-4 w-4" />
              Reveal PIN
            </Button>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
            Bridge-backed card controls will appear here as soon as freeze, lost-card, and secure PIN retrieval APIs are exposed in the current workspace. Card status, issuance, and transactions already stay live.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CardTransactions transactions={cardData?.transactions ?? []} />
        </motion.div>
      </div>

      <Sheet open={offRampOpen} onOpenChange={setOffRampOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-[640px] rounded-t-2xl pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle>Transfer to Bank</SheetTitle>
          </SheetHeader>
          <OffRampPanel
            availableBalance={balanceData?.available_usd ?? 0}
            bankName={employee?.bridge_bank_account_id ? 'Connected bank account' : 'No bank account connected'}
            onTransfer={handleTransfer}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
