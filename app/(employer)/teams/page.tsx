'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
const EmployeeTable = React.lazy(() =>
  import('@/components/employee/EmployeeTable').then((m) => ({ default: m.EmployeeTable })),
)
import { CSVUpload } from '@/components/employee/CSVUpload'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Employee } from '@/lib/queries/employees'

// ─── Mock data (replaced in T35 with TanStack Query) ─────────────────────────

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    employer_id: 'emp-id',
    user_id: 'user-1',
    wallet_address: '0x71a2BA383d2C8ec15310705A13693F054271531f',
    email: 'sofia.mendez@acme.com',
    first_name: 'Sofia',
    last_name: 'Mendez',
    job_title: 'Senior Engineer',
    department: 'Engineering',
    country_code: 'MX',
    salary_amount: 95000,
    salary_currency: 'USD',
    pay_frequency: 'monthly',
    employee_id_hash: null,
    bridge_customer_id: 'bridge-1',
    bridge_card_id: null,
    bridge_bank_account_id: null,
    kyc_status: 'approved',
    kyc_verified_at: '2026-01-10T12:00:00Z',
    stream_contract: null,
    active: true,
    invited_at: '2025-12-01T10:00:00Z',
    onboarded_at: '2025-12-03T15:00:00Z',
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2026-01-10T12:00:00Z',
  },
  {
    id: 'emp-2',
    employer_id: 'emp-id',
    user_id: null,
    wallet_address: null,
    email: 'james.okonkwo@acme.com',
    first_name: 'James',
    last_name: 'Okonkwo',
    job_title: 'Product Manager',
    department: 'Product',
    country_code: 'NG',
    salary_amount: 85000,
    salary_currency: 'USD',
    pay_frequency: 'monthly',
    employee_id_hash: null,
    bridge_customer_id: null,
    bridge_card_id: null,
    bridge_bank_account_id: null,
    kyc_status: 'pending',
    kyc_verified_at: null,
    stream_contract: null,
    active: true,
    invited_at: '2026-02-10T10:00:00Z',
    onboarded_at: null,
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 'emp-3',
    employer_id: 'emp-id',
    user_id: 'user-3',
    wallet_address: '0x58E5102BAED1c703dC1052cc7f5E30A96af34Eb8',
    email: 'priya.sharma@acme.com',
    first_name: 'Priya',
    last_name: 'Sharma',
    job_title: 'Data Scientist',
    department: 'Engineering',
    country_code: 'IN',
    salary_amount: 90000,
    salary_currency: 'USD',
    pay_frequency: 'monthly',
    employee_id_hash: null,
    bridge_customer_id: 'bridge-3',
    bridge_card_id: null,
    bridge_bank_account_id: null,
    kyc_status: 'approved',
    kyc_verified_at: '2026-01-20T09:00:00Z',
    stream_contract: null,
    active: true,
    invited_at: '2026-01-05T10:00:00Z',
    onboarded_at: '2026-01-07T11:00:00Z',
    created_at: '2026-01-05T10:00:00Z',
    updated_at: '2026-01-20T09:00:00Z',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const router = useRouter()
  const [csvOpen, setCsvOpen] = React.useState(false)
  const [employees] = React.useState<Employee[]>(MOCK_EMPLOYEES)

  function handleImported(count: number) {
    setCsvOpen(false)
    // In T35 this will trigger a data refetch
    console.info(`Imported ${count} employees`)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Team</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {employees.length} {employees.length === 1 ? 'employee' : 'employees'} · manage your team
            </p>
          </div>
          <div className="flex flex-col min-[400px]:flex-row sm:items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCsvOpen(true)}
              className="gap-2 w-full min-[400px]:w-auto"
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </Button>
            <Button
              onClick={() => router.push('/teams/add')}
              className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 gap-2 w-full min-[400px]:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Table or empty state */}
        {employees.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="h-8 w-8 text-[var(--text-muted)]" />}
            title="Add your first team member"
            description="Invite employees to onboard onto Remlo for gasless, instant cross-border payroll."
            action={
              <div className="flex flex-col min-[400px]:flex-row items-center gap-2 w-full min-[400px]:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setCsvOpen(true)}
                  className="gap-2 w-full min-[400px]:w-auto"
                >
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
                <Button
                  onClick={() => router.push('/teams/add')}
                  className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 gap-2 w-full min-[400px]:w-auto"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Employee
                </Button>
              </div>
            }
          />
        ) : (
          <React.Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />}>
            <EmployeeTable
              data={employees}
              onEdit={(id) => router.push(`/teams/${id}`)}
              onSendInvite={(id) => console.info('resend invite', id)}
              onRemove={(id) => console.info('remove', id)}
            />
          </React.Suspense>
        )}
      </div>

      <CSVUpload
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImported={handleImported}
      />
    </>
  )
}
