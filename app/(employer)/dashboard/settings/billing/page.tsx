'use client'

import Link from 'next/link'
import { Activity, ArrowRight, CreditCard, Receipt, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { useMppSessions, usePayrollRuns, useYield } from '@/lib/hooks/useDashboard'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function EmployerBillingPage() {
  const { data: employer } = useEmployer()
  const { data: payrollRuns } = usePayrollRuns(employer?.id, 1, 50)
  const { data: sessions } = useMppSessions(employer?.id)
  const { data: yieldData } = useYield()

  const payrollVolume = payrollRuns?.runs.reduce((sum, run) => sum + run.total_amount, 0) ?? 0
  const payrollCount = payrollRuns?.runs.length ?? 0
  const mppSpend = sessions?.sessions.reduce((sum, session) => sum + Number(session.total_spent ?? 0), 0) ?? 0
  const accruedYield = yieldData ? Number.parseFloat(yieldData.accrued_usd) : 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Billing"
        description="Monitor subscription tier, payroll throughput, MPP spend, and yield contribution across this employer workspace."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/settings">
              Back to settings
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <CreditCard className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.14em]">Plan</p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{employer?.subscription_tier ?? 'starter'}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Receipt className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.14em]">Payroll volume</p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{formatCurrency(payrollVolume)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Activity className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.14em]">MPP spend</p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{formatCurrency(mppSpend)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Wallet className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.14em]">Yield accrued</p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{formatCurrency(accruedYield)}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Usage summary</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Payroll runs</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{payrollCount}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">MPP sessions</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{sessions?.sessions.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Yield model</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                {yieldData?.yield_model ? yieldData.yield_model.replaceAll('_', ' ') : 'Not available'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Plan notes</h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            <p>Billing in this build is derived from real payroll, MPP session, and yield activity already stored in Remlo.</p>
            <p>Card program, bank rails, and subscription upgrades still depend on your linked Bridge and treasury configuration.</p>
            <p>When the billing surface expands further, these cards can evolve into invoice exports and plan-management actions without changing the route structure.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
