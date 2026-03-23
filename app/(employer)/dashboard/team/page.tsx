'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTeam } from '@/lib/hooks/useDashboard'
import { useEmployer } from '@/lib/hooks/useEmployer'
const EmployeeTable = React.lazy(() =>
  import('@/components/employee/EmployeeTable').then((m) => ({ default: m.EmployeeTable })),
)
import { CSVUpload } from '@/components/employee/CSVUpload'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Employee } from '@/lib/queries/employees'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const router = useRouter()
  const { data: employer } = useEmployer()
  const { data: teamData, isLoading, refetch } = useTeam(employer?.id)
  const [csvOpen, setCsvOpen] = React.useState(false)
  const employees = (teamData?.employees ?? []) as Employee[]

  function handleImported(count: number) {
    setCsvOpen(false)
    console.info(`Imported ${count} employees`)
    void refetch()
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
              onClick={() => router.push('/dashboard/team/add')}
              className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 gap-2 w-full min-[400px]:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Table or empty state */}
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />
        ) : employees.length === 0 ? (
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
                  onClick={() => router.push('/dashboard/team/add')}
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
              onEdit={(id) => router.push(`/dashboard/team/${id}`)}
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
