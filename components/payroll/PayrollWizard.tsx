'use client'

import * as React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BatchProgress, type BatchStatus } from '@/components/payroll/BatchProgress'
import { GasSponsored } from '@/components/wallet/GasSponsored'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'
import { cn } from '@/lib/utils'
import type { Employee } from '@/lib/queries/employees'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PayrollItem {
  employee: Employee
  amount: number
}

// ─── Step indicators ───────────────────────────────────────────────────────

const STEP_LABELS = ['Select Employees', 'Set Amounts', 'Review', 'Execute']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                  done
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : active
                      ? 'border-[var(--accent)] bg-transparent text-[var(--accent)]'
                      : 'border-[var(--border-strong)] bg-transparent text-[var(--text-muted)]',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-3 mb-5 transition-colors',
                  i < current ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]',
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Step 1: Select employees ──────────────────────────────────────────────

function Step1({
  employees,
  selected,
  onToggle,
}: {
  employees: Employee[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const allSelected = employees.length > 0 && selected.size === employees.length

  function toggleAll() {
    if (allSelected) {
      employees.forEach((e) => onToggle(e.id))
    } else {
      employees.filter((e) => !selected.has(e.id)).forEach((e) => onToggle(e.id))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">
        Select employees to include in this payroll run.
      </p>
      <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
        {/* Select all */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] cursor-pointer"
          onClick={toggleAll}
        >
          <Checkbox checked={allSelected} indeterminate={selected.size > 0 && !allSelected} />
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            {allSelected ? 'Deselect all' : `Select all (${employees.length})`}
          </span>
        </div>
        {/* Employee rows */}
        <div className="divide-y divide-[var(--border-default)]">
          {employees.map((emp) => {
            const isSelected = selected.has(emp.id)
            return (
              <div
                key={emp.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors',
                  isSelected ? 'bg-[var(--accent-subtle)]' : 'hover:bg-[var(--bg-subtle)]',
                )}
                onClick={() => onToggle(emp.id)}
              >
                <Checkbox checked={isSelected} />
                <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)] shrink-0">
                  {emp.first_name?.[0]}{emp.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{emp.job_title}</p>
                </div>
                <span className="font-mono text-sm text-[var(--text-secondary)] shrink-0">
                  {emp.salary_amount != null
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: emp.salary_currency ?? 'USD', maximumFractionDigits: 0 }).format(emp.salary_amount)
                    : '—'}
                  /{emp.pay_frequency ?? 'mo'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {selected.size} of {employees.length} employees selected
      </p>
    </div>
  )
}

// ─── Step 2: Set amounts ────────────────────────────────────────────────────

function Step2({
  items,
  onAmountChange,
}: {
  items: PayrollItem[]
  onAmountChange: (id: string, amount: number) => void
}) {
  const total = items.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">
        Review and adjust payment amounts for each employee.
      </p>
      <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
        <div className="divide-y divide-[var(--border-default)]">
          {items.map((item) => (
            <div key={item.employee.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)] shrink-0">
                {item.employee.first_name?.[0]}{item.employee.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {item.employee.first_name} {item.employee.last_name}
                </p>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm text-[var(--text-muted)]">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amount.toFixed(2)}
                  onChange={(e) => onAmountChange(item.employee.id, parseFloat(e.target.value) || 0)}
                  className="w-32 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-2 pl-7 pr-3 text-right font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 py-4 bg-[var(--bg-subtle)] border-t border-[var(--border-default)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Total</span>
          <span className="font-mono text-base font-bold text-[var(--text-primary)]">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Review ─────────────────────────────────────────────────────────

function Step3({ items }: { items: PayrollItem[] }) {
  const total = items.reduce((s, i) => s + i.amount, 0)
  const fee = 0.01 // <$0.01 per spec

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Payroll Summary</h3>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {items.map((item) => {
            const memoPreview = '0x70616963…'
            return (
              <div key={item.employee.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    {item.employee.first_name} {item.employee.last_name}
                  </p>
                  <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">memo: {memoPreview}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-[var(--text-primary)] shrink-0">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="px-5 py-4 bg-[var(--bg-subtle)] border-t border-[var(--border-default)] space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Subtotal</span>
            <span className="font-mono font-semibold text-[var(--text-primary)]">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Network fee</span>
            <span className="font-mono text-[var(--status-success)] font-semibold">
              &lt;${fee.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold border-t border-[var(--border-default)] pt-2">
            <span className="text-[var(--text-primary)]">Total</span>
            <span className="font-mono text-[var(--text-primary)]">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
        <GasSponsored />
        <span className="text-xs text-[var(--text-muted)]">Gas fees sponsored by your treasury budget</span>
      </div>
    </div>
  )
}

// ─── Checkbox ─────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded border-2 shrink-0 transition-colors',
        checked || indeterminate
          ? 'border-[var(--accent)] bg-[var(--accent)]'
          : 'border-[var(--border-strong)]',
      )}
    >
      {indeterminate && !checked && <span className="block h-0.5 w-2 bg-white" />}
      {checked && <Check className="h-3 w-3 text-[var(--accent-foreground)]" />}
    </div>
  )
}

// ─── Main Wizard ───────────────────────────────────────────────────────────

interface PayrollWizardProps {
  employees: Employee[]
  employerId: string
  onComplete?: () => void
}

export function PayrollWizard({ employees, employerId, onComplete }: PayrollWizardProps) {
  const { authenticated, getAccessToken } = usePrivy()
  const authedFetch = usePrivyAuthedFetch()
  const [step, setStep] = React.useState(0)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [items, setItems] = React.useState<PayrollItem[]>([])
  const [batchStatus, setBatchStatus] = React.useState<BatchStatus>('idle')
  const [txHash, setTxHash] = React.useState<string | undefined>()
  const [execError, setExecError] = React.useState<string | undefined>()

  function toggleEmployee(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function goToStep2() {
    const selectedEmployees = employees.filter((e) => selected.has(e.id))
    setItems(
      selectedEmployees.map((e) => ({
        employee: e,
        amount: e.salary_amount != null ? Math.round(e.salary_amount * 100) / 100 : 0,
      })),
    )
    setStep(1)
  }

  function updateAmount(id: string, amount: number) {
    setItems((prev) => prev.map((i) => (i.employee.id === id ? { ...i, amount } : i)))
  }

  async function executePayroll() {
    setStep(3)
    setBatchStatus('signing')
    setExecError(undefined)

    try {
      if (!authenticated) {
        throw new Error('You need to be signed in to run payroll.')
      }

      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error('Unable to retrieve your Remlo access token.')
      }

      const payPeriod = new Date().toISOString().slice(0, 10)

      const calldataRes = await authedFetch(`/api/employers/${employerId}/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payPeriod,
          items: items.map((i) => ({
            employeeId: i.employee.id,
            walletAddress: i.employee.wallet_address as string,
            amount: i.amount.toFixed(6),
          })),
        }),
      })

      if (!calldataRes.ok) {
        const data = await calldataRes.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to prepare payroll')
      }

      const prepared = (await calldataRes.json()) as {
        payrollRunId: string | null
      }

      if (!prepared.payrollRunId) {
        throw new Error('Payroll run was prepared without a persisted run ID.')
      }

      setBatchStatus('submitting')

      const executeRes = await authedFetch(
        `/api/employers/${employerId}/payroll/${prepared.payrollRunId}/execute`,
        { method: 'POST' },
      )

      if (!executeRes.ok) {
        const data = await executeRes.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to execute payroll on-chain.')
      }

      const result = (await executeRes.json()) as { tx_hash: string }

      setBatchStatus('confirming')

      setTxHash(result.tx_hash)
      setBatchStatus('success')
    } catch (err) {
      setExecError(err instanceof Error ? err.message : 'Execution failed')
      setBatchStatus('error')
    }
  }

  const canProceedStep1 = selected.size > 0
  const canProceedStep2 = items.length > 0 && items.every((i) => i.amount > 0)

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <StepBar current={step} />

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <Step1 employees={employees} selected={selected} onToggle={toggleEmployee} />
          )}
          {step === 1 && (
            <Step2 items={items} onAmountChange={updateAmount} />
          )}
          {step === 2 && (
            <Step3 items={items} />
          )}
          {step === 3 && (
            <BatchProgress
              status={batchStatus}
              employeeCount={items.length}
              txHash={txHash}
              error={execError}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step < 3 && (
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < 2 ? (
            <Button
              disabled={step === 0 ? !canProceedStep1 : !canProceedStep2}
              onClick={step === 0 ? goToStep2 : () => setStep(2)}
              className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 font-semibold"
            >
              {step === 0 ? `Continue (${selected.size} selected)` : 'Review →'}
            </Button>
          ) : (
            <Button
              onClick={executePayroll}
              className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 font-semibold"
            >
              Execute Payroll
            </Button>
          )}
        </div>
      )}

      {/* Post-success action */}
      {step === 3 && batchStatus === 'success' && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={onComplete}
          >
            Back to Dashboard
          </Button>
        </div>
      )}

      {/* Error retry */}
      {step === 3 && batchStatus === 'error' && (
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => setStep(2)}>Back to Review</Button>
          <Button
            onClick={executePayroll}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
