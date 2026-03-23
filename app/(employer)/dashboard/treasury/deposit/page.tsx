'use client'

import Link from 'next/link'
import { ArrowLeftRight, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DepositPanel } from '@/components/treasury/DepositPanel'
import { FundingReadinessCard } from '@/components/treasury/FundingReadinessCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployer } from '@/lib/hooks/useEmployer'

export default function TreasuryDepositPage() {
  const { data: employer } = useEmployer()

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Deposit Treasury Funds"
        description="Prepare funding instructions for payroll top-ups, Bridge-linked bank deposits, and Tempo treasury settlement."
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
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Funding instructions</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            When Bridge virtual account coordinates are stored locally, they appear below. Until then, this page acts as the source of truth for deposit readiness and treasury state.
          </p>

          <div className="mt-5">
            <DepositPanel bankName={employer?.company_name ? `${employer.company_name} treasury` : 'Remlo employer treasury'} />
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
            Remlo does not currently persist bank routing coordinates in Supabase. If your Bridge virtual account exists but the fields above are blank, complete the Bridge funding setup and resync the employer record.
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
