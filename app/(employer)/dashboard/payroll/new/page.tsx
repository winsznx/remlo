'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTeam } from '@/lib/hooks/useDashboard'
import { useEmployer } from '@/lib/hooks/useEmployer'
import type { Employee } from '@/lib/queries/employees'

const PayrollWizard = React.lazy(() =>
  import('@/components/payroll/PayrollWizard').then((m) => ({ default: m.PayrollWizard })),
)

export default function NewPayrollPage() {
  const router = useRouter()
  const { data: employer, isLoading: employerLoading } = useEmployer()
  const { data: teamData, isLoading: teamLoading } = useTeam(employer?.id)

  const employees = (teamData?.employees ?? []).filter((employee) => Boolean(employee.wallet_address)) as Employee[]
  const loading = employerLoading || teamLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Run Payroll
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Send on-chain payments to your team in seconds.
          </p>
        </div>
      </div>

      {/* Wizard card */}
      <div className="max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 lg:p-8">
        {loading ? (
          <div className="h-64 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />
        ) : !employer?.id ? (
          <EmptyState
            title="Set up your employer account first"
            description="Remlo needs an employer profile before it can prepare a payroll batch."
          />
        ) : employees.length === 0 ? (
          <EmptyState
            title="No payroll-ready employees yet"
            description="Invite employees and complete wallet onboarding before running payroll."
          />
        ) : (
          <React.Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />}>
            <PayrollWizard
              employees={employees}
              employerId={employer.id}
              onComplete={() => router.push('/dashboard/payroll')}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  )
}
