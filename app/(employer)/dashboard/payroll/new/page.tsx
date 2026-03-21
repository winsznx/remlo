'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Employee } from '@/lib/queries/employees'

const PayrollWizard = React.lazy(() =>
  import('@/components/payroll/PayrollWizard').then((m) => ({ default: m.PayrollWizard })),
)

// ─── Mock employees (replaced in T35 with TanStack Query) ────────────────────

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1', employer_id: 'emp-id', user_id: 'user-1',
    wallet_address: '0x71a2BA383d2C8ec15310705A13693F054271531f',
    email: 'sofia.mendez@acme.com', first_name: 'Sofia', last_name: 'Mendez',
    job_title: 'Senior Engineer', department: 'Engineering', country_code: 'MX',
    salary_amount: 95000, salary_currency: 'USD', pay_frequency: 'monthly',
    employee_id_hash: null, bridge_customer_id: 'bridge-1', bridge_card_id: null,
    bridge_bank_account_id: null, kyc_status: 'approved', kyc_verified_at: '2026-01-10T12:00:00Z',
    stream_contract: null, active: true, invited_at: '2025-12-01T10:00:00Z',
    onboarded_at: '2025-12-03T15:00:00Z', created_at: '2025-12-01T10:00:00Z', updated_at: '2026-01-10T12:00:00Z',
  },
  {
    id: 'emp-3', employer_id: 'emp-id', user_id: 'user-3',
    wallet_address: '0x58E5102BAED1c703dC1052cc7f5E30A96af34Eb8',
    email: 'priya.sharma@acme.com', first_name: 'Priya', last_name: 'Sharma',
    job_title: 'Data Scientist', department: 'Engineering', country_code: 'IN',
    salary_amount: 90000, salary_currency: 'USD', pay_frequency: 'monthly',
    employee_id_hash: null, bridge_customer_id: 'bridge-3', bridge_card_id: null,
    bridge_bank_account_id: null, kyc_status: 'approved', kyc_verified_at: '2026-01-20T09:00:00Z',
    stream_contract: null, active: true, invited_at: '2026-01-05T10:00:00Z',
    onboarded_at: '2026-01-07T11:00:00Z', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-20T09:00:00Z',
  },
  {
    id: 'emp-4', employer_id: 'emp-id', user_id: 'user-4',
    wallet_address: '0x1fF7E623CFdb6e263Be0D25A9142DD7888F5CBdA',
    email: 'carlos.rodriguez@acme.com', first_name: 'Carlos', last_name: 'Rodriguez',
    job_title: 'Frontend Developer', department: 'Engineering', country_code: 'CO',
    salary_amount: 72000, salary_currency: 'USD', pay_frequency: 'monthly',
    employee_id_hash: null, bridge_customer_id: 'bridge-4', bridge_card_id: null,
    bridge_bank_account_id: null, kyc_status: 'approved', kyc_verified_at: '2026-02-01T10:00:00Z',
    stream_contract: null, active: true, invited_at: '2026-01-20T10:00:00Z',
    onboarded_at: '2026-01-22T11:00:00Z', created_at: '2026-01-20T10:00:00Z', updated_at: '2026-02-01T10:00:00Z',
  },
]

const MOCK_EMPLOYER_ID = 'employer-demo-id'

export default function NewPayrollPage() {
  const router = useRouter()

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
        <React.Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />}>
          <PayrollWizard
            employees={MOCK_EMPLOYEES}
            employerId={MOCK_EMPLOYER_ID}
            onComplete={() => router.push('/dashboard')}
          />
        </React.Suspense>
      </div>
    </div>
  )
}
