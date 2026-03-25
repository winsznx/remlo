'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CreditCard,
  DollarSign,
  Globe,
  Loader2,
  Mail,
  MoreHorizontal,
  ShieldCheck,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { GasSponsored } from '@/components/wallet/GasSponsored'
import { TxStatus } from '@/components/wallet/TxStatus'
import { ComplianceBadge } from '@/components/employee/ComplianceBadge'
import { VisaCardDisplay } from '@/components/card/VisaCardDisplay'
import { MemoDecoder } from '@/components/payroll/MemoDecoder'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { type AdminOverviewResponse, useAdminScope } from '@/lib/hooks/useAdmin'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { useEmployerTeamDetail, type EmployerTeamDetailResponse } from '@/lib/hooks/useDashboard'
import { useEmployeeCard } from '@/lib/hooks/useEmployee'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'
import { byteaMemoToHex } from '@/lib/memo'

const PAY_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'stream', label: 'Streaming' },
]

function formatCurrency(value: number | null | undefined, currency = 'USD') {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function formatFrequency(freq: string) {
  return {
    monthly: 'Monthly',
    biweekly: 'Bi-weekly',
    weekly: 'Weekly',
    stream: 'Streaming',
  }[freq] ?? freq
}

function getTip403Status(data: EmployerTeamDetailResponse['complianceEvents']) {
  const latestMppCheck = data.find((event) => event.event_type === 'mpp_check')
  if (!latestMppCheck) return 'pending'
  return latestMppCheck.result === 'BLOCKED' ? 'blocked' : 'authorized'
}

function OverviewTab({
  employee,
  cardReadyToIssue,
  issuingCard,
  onIssueCard,
}: {
  employee: EmployerTeamDetailResponse['employee']
  cardReadyToIssue: boolean
  issuingCard: boolean
  onIssueCard: () => void
}) {
  const hasCard = Boolean(employee.bridge_card_id)
  const hasBank = Boolean(employee.bridge_bank_account_id)

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Wallet and identity</h3>
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Wallet</p>
            {employee.wallet_address ? (
              <div className="space-y-3">
                <AddressDisplay address={employee.wallet_address} />
                <GasSponsored />
                <p className="text-xs text-[var(--text-muted)]">Funded by employer</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No wallet linked yet. The employee can finish onboarding from their invite link.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Email</p>
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="truncate">{employee.email}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Department</p>
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
                <span>{employee.department || 'Not set'}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Country</p>
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                <span>{employee.country_code || 'Not set'}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Onboarded</p>
              <p className="text-sm text-[var(--text-primary)]">{formatDate(employee.onboarded_at ?? employee.invited_at)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Compensation</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Annual salary</p>
            <div className="mt-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--accent)]" />
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(employee.salary_amount, employee.salary_currency)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Pay frequency</p>
            <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{formatFrequency(employee.pay_frequency)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4 sm:col-span-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Per payroll cycle</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {employee.salary_amount == null
                ? 'Compensation metadata has not been attached yet.'
                : employee.pay_frequency === 'monthly'
                  ? formatCurrency(employee.salary_amount / 12, employee.salary_currency)
                  : employee.pay_frequency === 'biweekly'
                    ? formatCurrency(employee.salary_amount / 26, employee.salary_currency)
                    : employee.pay_frequency === 'weekly'
                      ? formatCurrency(employee.salary_amount / 52, employee.salary_currency)
                      : 'Accrues every second via StreamVesting'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Card and off-ramp</h3>
        </div>
        <div className="mt-5 space-y-5">
          {hasCard ? (
            <VisaCardDisplay
              last4={employee.bridge_card_id?.slice(-4)}
              holderName={[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email}
              status="active"
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-5">
              <p className="text-sm text-[var(--text-secondary)]">
                No Remlo card has been issued for this employee yet.
              </p>
              {cardReadyToIssue ? (
                <Button className="mt-4" onClick={onIssueCard} disabled={issuingCard}>
                  {issuingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Issue card
                </Button>
              ) : (
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Card issuance unlocks once KYC is approved and the Bridge customer record is present.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Card program</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {hasCard ? 'Issued via Bridge' : 'Not issued'}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Bank off-ramp</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {hasBank ? 'Bank account connected' : 'No bank account linked'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function PaymentHistoryTab({ payments }: { payments: EmployerTeamDetailResponse['payments'] }) {
  const PAGE_SIZE = 5
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    setPage(1)
  }, [payments.length])

  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-muted)]">
        No payroll payments have been recorded for this employee yet.
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const paginated = payments.slice(start, start + PAGE_SIZE)

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="divide-y divide-[var(--border-default)]">
        {paginated.map((payment) => {
          const memoHex = byteaMemoToHex(payment.memo_bytes)
          return (
            <div key={payment.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(payment.amount)}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{formatDate(payment.created_at)}</p>
                </div>
                <TxStatus
                  status={
                    payment.status === 'confirmed'
                      ? 'confirmed'
                      : payment.status === 'failed'
                        ? 'failed'
                        : payment.status === 'pending'
                          ? 'pending'
                          : 'confirming'
                  }
                  txHash={payment.tx_hash ?? undefined}
                  confirmTime={payment.payroll_run?.settlement_time_ms ? payment.payroll_run.settlement_time_ms / 1000 : undefined}
                />
              </div>

              {memoHex ? (
                <div className="mt-4 rounded-xl bg-[var(--bg-base)] p-4">
                  <MemoDecoder memoHex={memoHex} />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      {payments.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 border-t border-[var(--border-default)] px-5 py-4 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {start + 1}-{Math.min(start + PAGE_SIZE, payments.length)} of {payments.length} payments
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="min-w-20 text-center text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Page {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ComplianceTab({
  employee,
  complianceEvents,
  isPlatformAdmin,
  onManualReview,
  manualReviewLoading,
}: {
  employee: EmployerTeamDetailResponse['employee']
  complianceEvents: EmployerTeamDetailResponse['complianceEvents']
  isPlatformAdmin: boolean
  onManualReview: () => void
  manualReviewLoading: boolean
}) {
  const tip403Status = getTip403Status(complianceEvents)
  const latestManualReview = complianceEvents.find((event) => event.event_type === 'manual_review')

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">KYC status</h3>
          </div>
          <div className="mt-4">
            <ComplianceBadge status={employee.kyc_status as 'approved' | 'pending' | 'rejected' | 'expired'} />
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {employee.kyc_verified_at
                ? `Verified ${formatDate(employee.kyc_verified_at)} through Bridge.`
                : 'Verification is still pending for this employee.'}
            </p>
            {employee.bridge_customer_id ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Bridge customer ID: <span className="font-mono">{employee.bridge_customer_id}</span>
              </p>
            ) : null}
            {employee.kyc_status !== 'approved' ? (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href={`/kyc/${employee.id}`} target="_blank" rel="noreferrer">
                  Open KYC handoff
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">TIP-403 status</h3>
            </div>
            {isPlatformAdmin ? (
              <Button variant="outline" size="sm" onClick={onManualReview} disabled={manualReviewLoading}>
                {manualReviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Flag manual review
              </Button>
            ) : null}
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              tip403Status === 'authorized'
                ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                : tip403Status === 'blocked'
                  ? 'bg-red-500/10 text-[var(--status-error)]'
                  : 'bg-[var(--bg-base)] text-[var(--text-secondary)]'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                tip403Status === 'authorized'
                  ? 'bg-[var(--accent)]'
                  : tip403Status === 'blocked'
                    ? 'bg-[var(--status-error)]'
                    : 'bg-[var(--text-muted)]'
              }`} />
              {tip403Status === 'authorized' ? 'Authorized' : tip403Status === 'blocked' ? 'Blocked' : 'No recent check'}
            </span>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Remlo records sanctions and policy outcomes in the compliance ledger for each payroll operation.
            </p>
            {latestManualReview ? (
              <p className="mt-2 text-xs text-[var(--status-pending)]">
                Latest manual review flag: {formatDate(latestManualReview.created_at)}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Audit log</h3>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {complianceEvents.length === 0 ? (
            <div className="p-8 text-sm text-[var(--text-muted)]">No compliance events have been recorded yet.</div>
          ) : (
            complianceEvents.map((entry) => (
              <div key={entry.id} className="flex gap-3 px-5 py-4">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${entry.result === 'CLEAR' ? 'bg-[var(--status-success)]' : 'bg-[var(--status-error)]'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-primary)]">{entry.description || 'Compliance event recorded'}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {(entry.event_type ?? 'event').replaceAll('_', ' ')} · {formatDate(entry.created_at)}
                  </p>
                </div>
                <span className={`text-xs font-medium ${entry.result === 'CLEAR' ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                  {entry.result ?? 'UNKNOWN'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const authedFetch = usePrivyAuthedFetch()
  const { data: employer } = useEmployer()
  const { data, isLoading, isError, error } = useEmployerTeamDetail(employer?.id, params.id)
  const { data: cardData } = useEmployeeCard(data?.employee.id)
  const adminOverview = useAdminScope<AdminOverviewResponse>('overview')
  const [salaryAmount, setSalaryAmount] = React.useState('')
  const [salaryCurrency, setSalaryCurrency] = React.useState('USD')
  const [payFrequency, setPayFrequency] = React.useState('monthly')
  const [salaryDialogOpen, setSalaryDialogOpen] = React.useState(false)
  const [pauseDialogOpen, setPauseDialogOpen] = React.useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [issuingCard, setIssuingCard] = React.useState(false)

  // Must be before early returns — hooks cannot be called after conditional returns
  React.useEffect(() => {
    if (!data) return
    setSalaryAmount(data.employee.salary_amount != null ? String(data.employee.salary_amount) : '')
    setSalaryCurrency(data.employee.salary_currency ?? 'USD')
    setPayFrequency(data.employee.pay_frequency ?? 'monthly')
  }, [data])

  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Employee details"
          description={error instanceof Error ? error.message : 'Unable to load employee details.'}
        />
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <Button variant="outline" onClick={() => router.push('/dashboard/team')}>
            Return to team
          </Button>
        </div>
      </div>
    )
  }

  const { employee, payments, complianceEvents } = data
  const isPlatformAdmin = adminOverview.isSuccess
  const canIssueCard = Boolean(cardData?.canIssue)

  async function patchEmployee(body: Record<string, unknown>) {
    const response = await authedFetch(`/api/employers/${employer?.id}/team/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
    if (!response.ok) {
      throw new Error(payload.error ?? 'Employee action failed')
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['team-detail', employer?.id, params.id] }),
      queryClient.invalidateQueries({ queryKey: ['team', employer?.id] }),
      queryClient.invalidateQueries({ queryKey: ['employer-compliance', employer?.id] }),
    ])

    return payload
  }

  async function handleSaveSalary() {
    const parsedSalary = Number(salaryAmount)
    if (!Number.isFinite(parsedSalary) || parsedSalary <= 0) {
      toast.error('Salary amount must be a positive number.')
      return
    }

    setActionLoading(true)
    try {
      await patchEmployee({
        action: 'updateSalary',
        salaryAmount: parsedSalary,
        salaryCurrency,
        payFrequency,
      })
      setSalaryDialogOpen(false)
      toast.success('Employee compensation updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update salary.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handlePausePayments() {
    setActionLoading(true)
    try {
      const nextAction =
        employee.payment_status === 'paused' ? 'resumePayments' : 'pausePayments'
      await patchEmployee({ action: nextAction })
      setPauseDialogOpen(false)
      toast.success(
        employee.payment_status === 'paused'
          ? 'Payroll resumed for this employee.'
          : 'Payroll paused for this employee.'
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : employee.payment_status === 'paused'
            ? 'Unable to resume payments.'
            : 'Unable to pause payments.'
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveEmployee() {
    setActionLoading(true)
    try {
      await patchEmployee({ action: 'removeEmployee' })
      toast.success('Employee removed from the active directory.')
      router.push('/dashboard/team')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove employee.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleManualReview() {
    setActionLoading(true)
    try {
      await patchEmployee({ action: 'manualReview' })
      toast.success('Manual review flag recorded.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to flag manual review.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleIssueCard() {
    setIssuingCard(true)
    try {
      const response = await authedFetch(`/api/employees/${employee.id}/card`, {
        method: 'POST',
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Card issuance failed')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employee-card', employee.id] }),
        queryClient.invalidateQueries({ queryKey: ['team-detail', employer?.id, params.id] }),
        queryClient.invalidateQueries({ queryKey: ['team', employer?.id] }),
      ])
      toast.success('Employee card issued.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to issue card.')
    } finally {
      setIssuingCard(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/dashboard/team')}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-sm font-semibold text-[var(--accent)]">
              {(employee.first_name?.[0] ?? employee.email[0]).toUpperCase()}
              {(employee.last_name?.[0] ?? '').toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email}
              </h1>
              <p className="truncate text-sm text-[var(--text-muted)]">
                {employee.job_title || 'Role not set'}
                {employee.country_code ? ` · ${employee.country_code}` : ''}
                {employee.department ? ` · ${employee.department}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
            <span
              className={`h-2 w-2 rounded-full ${
                employee.kyc_status === 'approved'
                  ? 'bg-[var(--status-success)]'
                  : employee.kyc_status === 'rejected'
                    ? 'bg-[var(--status-error)]'
                    : 'bg-[var(--status-warning)]'
              }`}
            />
            {employee.kyc_status === 'approved'
              ? 'Verified'
              : employee.kyc_status === 'rejected'
                ? 'Action required'
                : 'Pending verification'}
          </span>
          <Button asChild variant="outline">
            <Link href={`/kyc/${employee.id}`} target="_blank" rel="noreferrer">
              Open KYC handoff
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSalaryDialogOpen(true)}>Edit salary</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPauseDialogOpen(true)}>
                {employee.payment_status === 'paused' ? 'Resume payments' : 'Pause payments'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[var(--status-error)]" onClick={() => setRemoveDialogOpen(true)}>
                Remove employee
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link href="/dashboard/team/add">Invite another employee</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="rounded-xl bg-[var(--bg-subtle)] p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab employee={employee} cardReadyToIssue={canIssueCard} issuingCard={issuingCard} onIssueCard={() => void handleIssueCard()} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentHistoryTab payments={payments} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <ComplianceTab
            employee={employee}
            complianceEvents={complianceEvents}
            isPlatformAdmin={isPlatformAdmin}
            onManualReview={() => void handleManualReview()}
            manualReviewLoading={actionLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit compensation</DialogTitle>
            <DialogDescription>
              Keep payroll metadata current before the next payroll run is prepared.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Annual salary
              </label>
              <Input value={salaryAmount} onChange={(event) => setSalaryAmount(event.target.value)} type="number" min="0" step="0.01" />
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
                    {PAY_FREQUENCIES.map((frequency) => (
                      <SelectItem key={frequency.value} value={frequency.value}>
                        {frequency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryDialogOpen(false)} disabled={actionLoading}>
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
        open={pauseDialogOpen}
        title={employee.payment_status === 'paused' ? 'Resume payments' : 'Pause payments'}
        description={
          employee.payment_status === 'paused'
            ? 'This clears the employer hold so the employee can be included in upcoming payroll runs again.'
            : 'This places an employer hold on payroll for this employee until you resume payments. Historical payouts remain unchanged.'
        }
        confirmLabel={employee.payment_status === 'paused' ? 'Resume payments' : 'Pause payments'}
        loading={actionLoading}
        onCancel={() => setPauseDialogOpen(false)}
        onConfirm={() => void handlePausePayments()}
      />

      <ConfirmDialog
        open={removeDialogOpen}
        title="Remove employee"
        description="This removes the employee from the active team directory but preserves existing payroll and compliance history."
        confirmLabel="Remove employee"
        destructive
        loading={actionLoading}
        onCancel={() => setRemoveDialogOpen(false)}
        onConfirm={() => void handleRemoveEmployee()}
      />
    </div>
  )
}
