'use client'

import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'

// ─── Types ─────────────────────────────────────────────────────────────────

type TxType = 'deposit' | 'payroll' | 'yield' | 'withdrawal'

export interface TxHistoryItem {
  id: string
  type: TxType
  description: string
  amount: number
  txHash?: string | null
  createdAt: string
  status: 'confirmed' | 'pending' | 'failed'
}

interface TxHistoryTableProps {
  items: TxHistoryItem[]
  page: number
  totalPages: number
  onPageChange: (p: number) => void
  className?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TxType, { label: string; color: string; sign: '+' | '-' }> = {
  deposit: { label: 'Deposit', color: 'text-[var(--status-success)] bg-[var(--accent-subtle)]', sign: '+' },
  payroll: { label: 'Payroll', color: 'text-[var(--status-pending)] bg-amber-500/10', sign: '-' },
  yield: { label: 'Yield', color: 'text-purple-400 bg-purple-500/10', sign: '+' },
  withdrawal: { label: 'Withdrawal', color: 'text-[var(--status-error)] bg-red-500/10', sign: '-' },
}

function TypeBadge({ type }: { type: TxType }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.label}
    </span>
  )
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function truncateHash(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-6)}`
}

// ─── Component ─────────────────────────────────────────────────────────────

export function TxHistoryTable({
  items,
  page,
  totalPages,
  onPageChange,
  className,
}: TxHistoryTableProps) {
  return (
    <div className={cn('rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden', className)}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Type
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Description
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Date
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Tx Hash
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {items.map((tx) => {
              const cfg = TYPE_CONFIG[tx.type]
              return (
                <tr key={tx.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-5 py-4">
                    <TypeBadge type={tx.type} />
                  </td>
                  <td className="px-5 py-4 text-[var(--text-primary)] max-w-xs truncate">
                    {tx.description}
                  </td>
                  <td className="px-5 py-4 text-[var(--text-muted)] whitespace-nowrap">
                    {formatDate(tx.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    {tx.txHash ? (
                      <a
                        href={`${TEMPO_EXPLORER_URL}/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-[var(--mono)] hover:underline"
                      >
                        {truncateHash(tx.txHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className={cn('px-5 py-4 text-right font-mono font-semibold', cfg.sign === '+' ? 'text-[var(--status-success)]' : 'text-[var(--text-primary)]')}>
                    {cfg.sign}{formatCurrency(tx.amount)}
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border-default)]">
          <p className="text-xs text-[var(--text-muted)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
