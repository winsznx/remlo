'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, Download, ExternalLink } from 'lucide-react'
import { useEmployee, useEmployeePayments, type PaymentWithRun } from '@/lib/hooks/useEmployee'
import { TxStatus } from '@/components/wallet/TxStatus'
import { SolanaTxStatus } from '@/components/wallet/SolanaTxStatus'
import { ChainBadge } from '@/components/wallet/ChainBadge'
import { SolanaBadge } from '@/components/wallet/SolanaBadge'
import { MemoDecoder } from '@/components/payroll/MemoDecoder'
import { cn } from '@/lib/utils'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'
import { byteaMemoToHex } from '@/lib/memo'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function formatMonth(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(iso))
}

function decodeMemoLabel(memoDecoded: unknown): string {
  if (!memoDecoded || typeof memoDecoded !== 'object') return 'Salary payment'
  const m = memoDecoded as Record<string, unknown>
  const period = m.payPeriod as string | undefined
  if (period && period.length === 8) {
    const mo = period.slice(4, 6)
    const y = period.slice(0, 4)
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = months[parseInt(mo, 10) - 1] ?? mo
    return `${monthName} ${y} Salary`
  }
  return 'Salary payment'
}

function statusBadge(status: string): React.ReactNode {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Confirmed', cls: 'bg-[var(--status-success)]/10 text-[var(--status-success)]' },
    pending:   { label: 'Pending',   cls: 'bg-[var(--status-pending)]/10 text-[var(--status-pending)]' },
    failed:    { label: 'Failed',    cls: 'bg-[var(--status-error)]/10 text-[var(--status-error)]' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-[var(--bg-subtle)] text-[var(--text-muted)]' }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', s.cls)}>{s.label}</span>
  )
}

// ─── Payment card ─────────────────────────────────────────────────────────────

function PaymentCard({ payment }: { payment: PaymentWithRun }) {
  const [expanded, setExpanded] = React.useState(false)
  const run = Array.isArray(payment.payroll_run) ? payment.payroll_run[0] : payment.payroll_run
  const settlementMs = run?.settlement_time_ms
  const memoHex = byteaMemoToHex(payment.memo_bytes)
  const hasMemo = Boolean(memoHex)
  const isSolana = payment.chain === 'solana' || Boolean(payment.solana_signature)
  const solanaSig = payment.solana_signature

  return (
    <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden">
      {/* Main row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="number-lg text-[var(--text-primary)] text-lg leading-none">
              {formatUsd(payment.amount)}
            </span>
            {statusBadge(payment.status)}
            {isSolana ? <SolanaBadge /> : <ChainBadge />}
          </div>
          <p className="text-sm text-[var(--text-secondary)] truncate">
            {decodeMemoLabel(payment.memo_decoded)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDate(payment.created_at)}</p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-[var(--text-muted)] shrink-0 ml-3 transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[var(--border-default)]"
          >
            <div className="p-5 space-y-4">
              {/* Status chip */}
              <div className="flex items-center gap-3">
                {isSolana && solanaSig ? (
                  <SolanaTxStatus
                    signature={solanaSig}
                    cluster={SOLANA_CLUSTER}
                    status={
                      payment.status === 'confirmed' ? 'confirmed'
                        : payment.status === 'failed' ? 'failed'
                        : 'pending'
                    }
                  />
                ) : (
                  <TxStatus
                    status={
                      payment.status === 'confirmed' ? 'confirmed'
                        : payment.status === 'failed' ? 'failed'
                        : payment.status === 'pending' ? 'pending'
                        : 'confirming'
                    }
                    txHash={payment.tx_hash ?? undefined}
                    confirmTime={settlementMs ? settlementMs / 1000 : undefined}
                  />
                )}
              </div>

              {/* Tx hash / signature */}
              {isSolana && solanaSig ? (
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">Solana signature</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-[var(--mono)] truncate flex-1">{solanaSig}</p>
                    <a
                      href={`https://explorer.solana.com/tx/${solanaSig}?cluster=${SOLANA_CLUSTER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--text-muted)] hover:text-[var(--accent)] shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ) : payment.tx_hash && (
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">Transaction hash</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-[var(--mono)] truncate flex-1">{payment.tx_hash}</p>
                    <a
                      href={`${TEMPO_EXPLORER_URL}/tx/${payment.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--text-muted)] hover:text-[var(--accent)] shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Block number (Tempo only) */}
              {!isSolana && run?.block_number && (
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">Block</p>
                  <p className="font-mono text-xs text-[var(--text-secondary)]">#{run.block_number}</p>
                </div>
              )}

              {/* Settlement time */}
              {settlementMs && (
                <p className="text-xs text-[var(--status-success)]">
                  Confirmed in {(settlementMs / 1000).toFixed(2)}s
                </p>
              )}

              {/* Memo decoder — Tempo ISO 20022 only */}
              {!isSolana && hasMemo && memoHex && (
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">Payment memo</p>
                  <MemoDecoder memoHex={memoHex} />
                </div>
              )}

              {isSolana && solanaSig ? (
                <a
                  href={`https://explorer.solana.com/tx/${solanaSig}?cluster=${SOLANA_CLUSTER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-[var(--accent)] hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  View on Solana Explorer
                </a>
              ) : payment.tx_hash ? (
                <a
                  href={`${TEMPO_EXPLORER_URL}/tx/${payment.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-[var(--accent)] hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  View settlement on Tempo Explorer
                </a>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PaymentsSkeleton() {
  return (
    <div className="max-w-[640px] mx-auto px-4 pt-6 pb-24 space-y-4 animate-pulse">
      <div className="h-10 bg-[var(--bg-subtle)] rounded-xl" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)]" />
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { data: employee, isLoading: employeeLoading } = useEmployee()
  const { data: payments, isLoading } = useEmployeePayments(employee?.id, 50)

  const [search, setSearch] = React.useState('')

  const filtered = React.useMemo(() => {
    if (!payments) return []
    if (!search.trim()) return payments
    const q = search.toLowerCase()
    return payments.filter((p) => {
      const label = decodeMemoLabel(p.memo_decoded).toLowerCase()
      const amount = formatUsd(p.amount)
      return label.includes(q) || amount.includes(q) || p.tx_hash?.toLowerCase().includes(q)
    })
  }, [payments, search])

  // Group by month
  const grouped = React.useMemo(() => {
    const map = new Map<string, PaymentWithRun[]>()
    for (const p of filtered) {
      const key = formatMonth(p.created_at)
      const arr = map.get(key) ?? []
      arr.push(p)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  if (isLoading || employeeLoading) return <PaymentsSkeleton />

  return (
    <div className="max-w-[640px] mx-auto px-4 pt-6 pb-24 space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search payments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-shadow"
        />
      </div>

      {/* Grouped payment cards */}
      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--text-muted)] text-sm">No payments found</p>
        </div>
      ) : (
        grouped.map(([month, items]) => (
          <div key={month} className="space-y-3">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{month}</h2>
            {items.map((payment, i) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <PaymentCard payment={payment} />
              </motion.div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
