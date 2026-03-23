'use client'

import * as React from 'react'
import { Building2, Landmark, ShieldCheck, Wallet } from 'lucide-react'

interface FundingReadinessCardProps {
  companyName: string
  bridgeCustomerId: string | null
  virtualAccountId: string | null
  treasuryContract: string | null
  subscriptionTier: string
  className?: string
}

function StatusRow({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'default' | 'success' | 'pending'
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
      <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${
        tone === 'success'
          ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
          : tone === 'pending'
            ? 'bg-amber-500/10 text-[var(--status-pending)]'
            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
        <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  )
}

export function FundingReadinessCard({
  companyName,
  bridgeCustomerId,
  virtualAccountId,
  treasuryContract,
  subscriptionTier,
  className,
}: FundingReadinessCardProps) {
  return (
    <div className={`rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 ${className ?? ''}`}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Funding readiness</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Remlo keeps your employer treasury and Bridge funding setup in sync so deposits can reach the payroll treasury without manual routing.
      </p>

      <div className="mt-5 space-y-3">
        <StatusRow
          icon={<Building2 className="h-4 w-4" />}
          label="Employer workspace"
          value={companyName}
          tone="success"
        />
        <StatusRow
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Bridge customer"
          value={bridgeCustomerId ? 'Verified employer customer exists' : 'Bridge customer not connected yet'}
          tone={bridgeCustomerId ? 'success' : 'pending'}
        />
        <StatusRow
          icon={<Landmark className="h-4 w-4" />}
          label="Virtual account"
          value={virtualAccountId ? `Connected (${virtualAccountId})` : 'No virtual account stored locally yet'}
          tone={virtualAccountId ? 'success' : 'pending'}
        />
        <StatusRow
          icon={<Wallet className="h-4 w-4" />}
          label="Treasury contract"
          value={treasuryContract ? treasuryContract : 'Treasury contract not written back yet'}
          tone={treasuryContract ? 'success' : 'pending'}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Plan</p>
        <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{subscriptionTier}</p>
      </div>
    </div>
  )
}
