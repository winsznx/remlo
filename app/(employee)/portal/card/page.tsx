'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Snowflake, AlertTriangle, ArrowDownRight } from 'lucide-react'
import { useEmployee } from '@/lib/hooks/useEmployee'
import { VisaCardDisplay } from '@/components/card/VisaCardDisplay'
import { CardTransactions, type CardTransaction } from '@/components/card/CardTransactions'
import { OffRampPanel } from '@/components/card/OffRampPanel'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// ─── Mock card transactions (T40 will wire to Bridge API) ─────────────────────

const MOCK_TRANSACTIONS: CardTransaction[] = [
  { id: '1', merchant: 'Spotify', category: 'internet', amount: -9.99, currency: 'USD', date: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'completed' },
  { id: '2', merchant: 'Whole Foods Market', category: 'food', amount: -67.43, currency: 'USD', date: new Date(Date.now() - 4 * 86400000).toISOString(), status: 'completed' },
  { id: '3', merchant: 'Uber', category: 'transport', amount: -12.50, currency: 'USD', date: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'completed' },
  { id: '4', merchant: 'Amazon', category: 'shopping', amount: -134.99, currency: 'USD', date: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'completed' },
  { id: '5', merchant: 'Netflix', category: 'internet', amount: -15.49, currency: 'USD', date: new Date(Date.now() - 8 * 86400000).toISOString(), status: 'pending' },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="max-w-[640px] mx-auto px-4 pt-6 pb-24 space-y-5 animate-pulse">
      <div className="h-52 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]" />
        <div className="h-12 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]" />
      </div>
      <div className="h-64 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)]" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CardPage() {
  const { data: employee, isLoading } = useEmployee()
  const [frozen, setFrozen] = React.useState(false)
  const [offRampOpen, setOffRampOpen] = React.useState(false)

  const hasCard = Boolean(employee?.bridge_card_id)
  const cardStatus = frozen ? 'frozen' : hasCard ? 'active' : 'pending'

  async function handleTransfer(amount: number) {
    const res = await fetch('/api/mpp/bridge/offramp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, employeeId: employee?.id }),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Transfer failed: ${res.status}`)
  }

  if (isLoading) return <CardSkeleton />

  return (
    <>
      <div className="max-w-[640px] mx-auto px-4 pt-6 pb-28 space-y-5">
        {/* Card display */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <VisaCardDisplay
            last4={employee?.bridge_card_id ? '4242' : undefined}
            holderName={
              employee?.first_name && employee?.last_name
                ? `${employee.first_name} ${employee.last_name}`.toUpperCase()
                : employee?.email?.split('@')[0]?.toUpperCase()
            }
            expiryMonth={12}
            expiryYear={28}
            status={cardStatus}
          />
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Freeze toggle */}
          <button
            onClick={() => setFrozen((v) => !v)}
            className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-colors ${
              frozen
                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Snowflake className="h-4 w-4" />
            {frozen ? 'Unfreeze Card' : 'Freeze Card'}
          </button>

          {/* Report lost */}
          <button
            className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <AlertTriangle className="h-4 w-4 text-[var(--status-pending)]" />
            Report Lost
          </button>
        </motion.div>

        {/* Card transactions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CardTransactions transactions={MOCK_TRANSACTIONS} />
        </motion.div>
      </div>

      {/* Persistent Transfer to Bank button */}
      <div className="fixed bottom-[70px] md:bottom-6 inset-x-0 px-4 pointer-events-none">
        <div className="max-w-[640px] mx-auto pointer-events-auto">
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            onClick={() => setOffRampOpen(true)}
            className="w-full h-12 rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition-opacity shadow-lg"
          >
            <ArrowDownRight className="h-4 w-4" />
            Transfer to Bank
          </motion.button>
        </div>
      </div>

      {/* Off-ramp sheet */}
      <Sheet open={offRampOpen} onOpenChange={setOffRampOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-w-[640px] mx-auto pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle>Transfer to Bank</SheetTitle>
          </SheetHeader>
          <OffRampPanel
            availableBalance={0}
            bankName={employee?.bridge_bank_account_id ? 'Connected bank' : 'No bank connected'}
            onTransfer={handleTransfer}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
