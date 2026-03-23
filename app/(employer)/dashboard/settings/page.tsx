'use client'

import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { Building2, CreditCard, Key, Landmark, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { FundingReadinessCard } from '@/components/treasury/FundingReadinessCard'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePayrollRuns, useTreasury } from '@/lib/hooks/useDashboard'

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        {icon}
        <p className="text-xs uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

export default function EmployerSettingsPage() {
  const { user } = usePrivy()
  const { data: employer } = useEmployer()
  const { data: treasury } = useTreasury(employer?.id)
  const { data: payrollRuns } = usePayrollRuns(employer?.id, 1, 25)

  const payrollVolume = payrollRuns?.runs.reduce((sum, run) => sum + run.total_amount, 0) ?? 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        description="Review workspace identity, treasury linkage, compliance posture, and billing-related account state."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/billing">Open billing</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Company" value={employer?.company_name ?? 'Not configured'} icon={<Building2 className="h-4 w-4" />} />
        <InfoCard label="Owner login" value={user?.email?.address ?? 'Not available'} icon={<ShieldCheck className="h-4 w-4" />} />
        <InfoCard label="Subscription" value={employer?.subscription_tier ?? 'starter'} icon={<CreditCard className="h-4 w-4" />} />
        <InfoCard label="Agent key" value={employer?.mpp_agent_key_hash ? 'Provisioned' : 'Not provisioned'} icon={<Key className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <FundingReadinessCard
          companyName={employer?.company_name ?? 'Employer workspace'}
          bridgeCustomerId={employer?.bridge_customer_id ?? null}
          virtualAccountId={employer?.bridge_virtual_account_id ?? null}
          treasuryContract={employer?.treasury_contract ?? null}
          subscriptionTier={employer?.subscription_tier ?? 'starter'}
        />

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Operational summary</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Treasury balance</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                ${Number(treasury?.total_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Payroll volume</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                ${payrollVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Treasury contract</p>
              <p className="mt-2 break-all font-mono text-sm text-[var(--mono)]">{employer?.treasury_contract ?? 'Not linked yet'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
