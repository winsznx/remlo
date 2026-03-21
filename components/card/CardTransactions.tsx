'use client'

import * as React from 'react'
import {
  ShoppingCart,
  Utensils,
  Car,
  Wifi,
  ShoppingBag,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CardTransaction {
  id: string
  merchant: string
  category: string
  amount: number
  currency: string
  date: string
  status: 'completed' | 'pending' | 'declined'
}

interface CardTransactionsProps {
  transactions: CardTransaction[]
  className?: string
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: Utensils,
  transport: Car,
  shopping: ShoppingCart,
  clothing: ShoppingBag,
  internet: Wifi,
  other: CreditCard,
}

function CategoryIcon({ category }: { category: string }) {
  const Icon = CATEGORY_ICONS[category.toLowerCase()] ?? MoreHorizontal
  return (
    <div className="h-9 w-9 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-[var(--text-muted)]" />
    </div>
  )
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount))
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function CardTransactions({ transactions, className }: CardTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className={cn('rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center', className)}>
        <p className="text-sm text-[var(--text-muted)]">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden', className)}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-default)]">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Recent transactions</p>
      </div>

      {/* List */}
      <div className="divide-y divide-[var(--border-default)]">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
            <CategoryIcon category={tx.category} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{tx.merchant}</p>
              <p className="text-xs text-[var(--text-muted)]">{formatDate(tx.date)}</p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={cn(
                  'text-sm font-semibold',
                  tx.status === 'declined'
                    ? 'text-[var(--status-error)] line-through'
                    : tx.amount < 0
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--status-success)]',
                )}
              >
                {tx.amount < 0 ? '-' : '+'}
                {formatAmount(tx.amount, tx.currency)}
              </p>
              {tx.status === 'pending' && (
                <p className="text-xs text-[var(--status-pending)]">Pending</p>
              )}
              {tx.status === 'declined' && (
                <p className="text-xs text-[var(--status-error)]">Declined</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
