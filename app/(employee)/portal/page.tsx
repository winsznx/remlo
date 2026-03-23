'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CreditCard, ArrowDownRight, Eye, Wallet, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEmployee, useEmployeeBalance, useEmployeePayments, useEmployerForEmployee } from '@/lib/hooks/useEmployee'
import { BalanceTicker } from '@/components/treasury/BalanceTicker'
import { TxStatus } from '@/components/wallet/TxStatus'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function decodeMemoLabel(memoDecoded: unknown): string {
  if (!memoDecoded || typeof memoDecoded !== 'object') return 'Salary payment'
  const m = memoDecoded as Record<string, unknown>
  const period = m.payPeriod as string | undefined
  if (period && period.length === 8) {
    const mo = period.slice(4, 6)
    const y = period.slice(0, 4)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = months[parseInt(mo, 10) - 1] ?? mo
    return `${monthName} ${y} Salary`
  }
  return 'Salary payment'
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PortalSkeleton() {
  return (
    <div className="max-w-[640px] mx-auto px-4 pt-8 pb-24 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 bg-[var(--bg-subtle)] rounded-lg w-56" />
        <div className="h-4 bg-[var(--bg-subtle)] rounded w-40" />
      </div>
      <div className="h-44 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)]" />
      <div className="h-28 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)]" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]" />
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortalHomePage() {
  const { data: employee, isLoading } = useEmployee()
  const { data: payments } = useEmployeePayments(employee?.id, 1)
  const { data: employer } = useEmployerForEmployee(employee?.employer_id)
  const { data: balanceData } = useEmployeeBalance(employee?.id)

  const firstName = employee?.first_name ?? employee?.email?.split('@')[0] ?? 'there'
  const companyName = employer?.company_name ?? 'Your company'
  const isStreaming = employee?.pay_frequency === 'stream'
  const availableBalance = balanceData?.available_usd ?? 0

  // Salary per second for streaming employees (salary_amount is in USD, 6 decimals)
  const salaryPerSecond =
    isStreaming && employee?.salary_amount
      ? (employee.salary_amount / 1_000_000) / 365 / 24 / 3600
      : 0

  const lastPayment = payments?.[0]
  const quickActions = [
    { label: 'View Payments', href: '/portal/payments', icon: CreditCard, description: 'Full payment history' },
    {
      label: employee?.bridge_card_id ? 'Manage Card' : 'Activate Card',
      href: employee?.bridge_card_id ? '/portal/card' : '/portal/card/activate',
      icon: CreditCard,
      description: employee?.bridge_card_id ? 'Card status and transfers' : 'Issue your Remlo card',
    },
    { label: 'Wallet', href: '/portal/wallet', icon: Wallet, description: 'Wallet and stream status' },
    { label: 'Off-ramp', href: '/portal/settings/offramp', icon: ArrowDownRight, description: 'Transfer to bank account' },
    { label: 'Settings', href: '/portal/settings', icon: Eye, description: 'Profile and security' },
  ]

  if (isLoading) return <PortalSkeleton />

  return (
    <div className="max-w-[640px] mx-auto px-4 pt-8 pb-24 space-y-5">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          {greeting()}, {firstName}.
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{companyName} payroll</p>
      </motion.div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">Available balance</p>
            {isStreaming ? (
              <BalanceTicker
                balance={availableBalance}
                ratePerSecond={salaryPerSecond}
                className="text-2xl"
              />
            ) : (
              <p className="number-xl text-2xl text-[var(--text-primary)]">{formatUsd(availableBalance)}</p>
            )}
          </div>
          {isStreaming && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Streaming
            </div>
          )}
        </div>

        {lastPayment ? (
          <div className="pt-4 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-muted)]">
              Last paid: {formatDate(lastPayment.created_at)}
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
              {formatUsd(lastPayment.amount)}
            </p>
          </div>
        ) : (
          <div className="pt-4 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-muted)]">No payments received yet</p>
          </div>
        )}
      </motion.div>

      {/* Last payment card */}
      {lastPayment && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Last payment</p>
            <Link
              href="/portal/payments"
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="number-lg text-[var(--text-primary)]">
                {formatUsd(lastPayment.amount)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {decodeMemoLabel(lastPayment.memo_decoded)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {formatDate(lastPayment.created_at)}
              </p>
            </div>
            <TxStatus
              status={
                lastPayment.status === 'confirmed' ? 'confirmed'
                  : lastPayment.status === 'failed' ? 'failed'
                  : lastPayment.status === 'pending' ? 'pending'
                  : 'confirming'
              }
              txHash={lastPayment.tx_hash ?? undefined}
            />
          </div>
        </motion.div>
      )}

      {/* Streaming info if no payments yet */}
      {isStreaming && !lastPayment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 p-5 flex items-center gap-3"
        >
          <div className="h-10 w-10 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">Salary streaming active</p>
            <p className="text-xs text-[var(--accent)]/70 mt-0.5">
              Your salary accrues every second via StreamVesting
            </p>
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="space-y-2"
      >
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-0.5">Quick actions</p>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 flex flex-col gap-2 hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-subtle)] group-hover:bg-[var(--bg-base)] flex items-center justify-center transition-colors">
                  <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{action.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{action.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </motion.div>

      {/* Wallet address */}
      {employee?.wallet_address && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] p-4 flex items-center gap-3"
        >
          <Wallet className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--text-muted)]">Embedded wallet</p>
            <p className="text-xs font-mono text-[var(--mono)] truncate">{employee.wallet_address}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
