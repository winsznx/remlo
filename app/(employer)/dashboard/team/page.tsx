'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTeam } from '@/lib/hooks/useDashboard'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'
const EmployeeTable = React.lazy(() =>
  import('@/components/employee/EmployeeTable').then((m) => ({ default: m.EmployeeTable })),
)
import { CSVUpload } from '@/components/employee/CSVUpload'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Employee } from '@/lib/queries/employees'

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAY_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'stream', label: 'Streaming' },
]

export default function TeamPage() {
  const router = useRouter()
  const authedFetch = usePrivyAuthedFetch()
  const { data: employer } = useEmployer()
  const { data: teamData, isLoading, refetch } = useTeam(employer?.id)
  const [csvOpen, setCsvOpen] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [salaryEmployee, setSalaryEmployee] = React.useState<Employee | null>(null)
  const [pauseEmployee, setPauseEmployee] = React.useState<Employee | null>(null)
  const [removeEmployee, setRemoveEmployee] = React.useState<Employee | null>(null)
  const [salaryAmount, setSalaryAmount] = React.useState('')
  const [salaryCurrency, setSalaryCurrency] = React.useState('USD')
  const [payFrequency, setPayFrequency] = React.useState('monthly')
  const employees = (teamData?.employees ?? []) as Employee[]

  function handleImported(count: number) {
    setCsvOpen(false)
    console.info(`Imported ${count} employees`)
    void refetch()
  }

  function openSalaryEditor(employeeId: string) {
    const employee = employees.find((entry) => entry.id === employeeId)
    if (!employee) return
    setSalaryEmployee(employee)
    setSalaryAmount(employee.salary_amount != null ? String(employee.salary_amount) : '')
    setSalaryCurrency(employee.salary_currency ?? 'USD')
    setPayFrequency(employee.pay_frequency ?? 'monthly')
  }

  async function patchEmployee(employeeId: string, body: Record<string, unknown>) {
    if (!employer?.id) {
      throw new Error('Employer profile not found')
    }

    const response = await authedFetch(`/api/employers/${employer.id}/team/${employeeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
    if (!response.ok) {
      throw new Error(payload.error ?? 'Employee update failed')
    }

    return payload
  }

  async function handleSaveSalary() {
    if (!salaryEmployee) return

    const parsedSalary = Number(salaryAmount)
    if (!Number.isFinite(parsedSalary) || parsedSalary <= 0) {
      toast.error('Salary amount must be a positive number.')
      return
    }

    setActionLoading(true)
    try {
      await patchEmployee(salaryEmployee.id, {
        action: 'updateSalary',
        salaryAmount: parsedSalary,
        salaryCurrency,
        payFrequency,
      })
      toast.success('Compensation updated.')
      setSalaryEmployee(null)
      await refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update salary.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handlePausePayments() {
    if (!pauseEmployee) return

    setActionLoading(true)
    try {
      await patchEmployee(pauseEmployee.id, { action: 'pausePayments' })
      toast.success('Manual review flag added and payroll marked for operator review.')
      setPauseEmployee(null)
      await refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to pause employee payroll.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveEmployee() {
    if (!removeEmployee) return

    setActionLoading(true)
    try {
      await patchEmployee(removeEmployee.id, { action: 'removeEmployee' })
      toast.success('Employee removed from the active team directory.')
      setRemoveEmployee(null)
      await refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove employee.')
    } finally {
      setActionLoading(false)
    }
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
              onView={(id) => router.push(`/dashboard/team/${id}`)}
              onEditSalary={openSalaryEditor}
              onPausePayments={(id) => {
                const employee = employees.find((entry) => entry.id === id)
                if (employee) setPauseEmployee(employee)
              }}
              onRemove={(id) => {
                const employee = employees.find((entry) => entry.id === id)
                if (employee) setRemoveEmployee(employee)
              }}
            />
          </React.Suspense>
        )}
      </div>

      <CSVUpload
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImported={handleImported}
      />

      <Dialog
        open={Boolean(salaryEmployee)}
        onOpenChange={(open) => {
          if (!open) {
            setSalaryEmployee(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit salary</DialogTitle>
            <DialogDescription>
              Update compensation details for this employee without leaving the team directory.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Annual salary
              </label>
              <Input
                value={salaryAmount}
                onChange={(event) => setSalaryAmount(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="120000"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Currency
                </label>
                <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'NGN', 'KES'].map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Pay frequency
                </label>
                <Select value={payFrequency} onValueChange={setPayFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pay frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_FREQUENCIES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryEmployee(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveSalary()} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pauseEmployee)}
        title="Pause payments"
        description={`Add a manual review hold for ${pauseEmployee ? `${pauseEmployee.first_name ?? ''} ${pauseEmployee.last_name ?? ''}`.trim() || pauseEmployee.email : 'this employee'} so payroll operators can review before the next run.`}
        confirmLabel="Pause payments"
        loading={actionLoading}
        onCancel={() => setPauseEmployee(null)}
        onConfirm={() => void handlePausePayments()}
      />

      <ConfirmDialog
        open={Boolean(removeEmployee)}
        title="Remove employee"
        description={`This removes ${removeEmployee ? `${removeEmployee.first_name ?? ''} ${removeEmployee.last_name ?? ''}`.trim() || removeEmployee.email : 'this employee'} from the active team directory. Historical payroll records remain intact.`}
        confirmLabel="Remove employee"
        destructive
        loading={actionLoading}
        onCancel={() => setRemoveEmployee(null)}
        onConfirm={() => void handleRemoveEmployee()}
      />
    </>
  )
}
