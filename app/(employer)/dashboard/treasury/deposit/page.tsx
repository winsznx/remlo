'use client'

import Link from 'next/link'
import { ArrowLeftRight, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DepositPanel } from '@/components/treasury/DepositPanel'
import { OnChainDepositWidget } from '@/components/treasury/OnChainDepositWidget'
import { FundingReadinessCard } from '@/components/treasury/FundingReadinessCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployer } from '@/lib/hooks/useEmployer'

export default function TreasuryDepositPage() {
  const { data: employer } = useEmployer()

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Deposit Treasury Funds"
        description="Deposit pathUSD from your wallet directly into the on-chain treasury so payroll can execute."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/treasury">
              Back to treasury
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {/* On-chain deposit — primary path */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Deposit from wallet</h2>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)] mb-5">
              Approve and deposit pathUSD from your embedded wallet into the PayrollTreasury contract in two transactions. Funds are available for payroll immediately after confirmation.
            </p>
            {employer ? (
              <OnChainDepositWidget employer={employer} />
            ) : (
              <div className="h-10 rounded-lg bg-[var(--bg-subtle)] animate-pulse" />
            )}
          </div>

          {/* Bank / manual crypto — secondary path */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <ArrowLeftRight className="h-4 w-4 text-[var(--text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Other funding methods</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Bank rails appear when Bridge virtual account details are available.
            </p>
            <div className="mt-5">
              <DepositPanel bankName={employer?.company_name ? `${employer.company_name} treasury` : 'Remlo employer treasury'} />
            </div>
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
    </div>
  )
}
