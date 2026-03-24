'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft, CircleCheckBig, Copy, ExternalLink, Loader2, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'

const PAY_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'stream', label: 'Streaming' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES']

type FormState = {
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  department: string
  countryCode: string
  salaryAmount: string
  salaryCurrency: string
  payFrequency: string
}

type InviteResponse = {
  employeeId: string
  inviteUrl: string
  kycUrl: string | null
  bridgeCustomerId: string | null
  emailSent: boolean
  existing: boolean
  inviteState: 'claimable' | 'claimed'
}

const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  jobTitle: '',
  department: '',
  countryCode: '',
  salaryAmount: '',
  salaryCurrency: 'USD',
  payFrequency: 'monthly',
}

function Field({
  label,
  optional,
  htmlFor,
  children,
}: {
  label: string
  optional?: boolean
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-2 block" htmlFor={htmlFor}>
      <span className="block text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
        {optional ? <span className="ml-1 normal-case tracking-normal text-[var(--text-secondary)]">(optional)</span> : null}
      </span>
      {children}
    </label>
  )
}

export default function AddEmployeePage() {
  const authedFetch = usePrivyAuthedFetch()
  const { data: employer, isLoading: employerLoading } = useEmployer()

  const [form, setForm] = React.useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<InviteResponse | null>(null)

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function copyInviteLink() {
    if (!result?.inviteUrl) return
    await navigator.clipboard.writeText(result.inviteUrl)
    toast.success('Invite link copied')
  }

  function resetFlow() {
    setForm(INITIAL_FORM)
    setError(null)
    setResult(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!employer?.id || submitting) return

    const salaryAmount = form.salaryAmount.trim()
      ? Number(form.salaryAmount.trim())
      : undefined

    if (salaryAmount != null && (!Number.isFinite(salaryAmount) || salaryAmount <= 0)) {
      setError('Salary amount must be a positive number')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await authedFetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerId: employer.id,
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          jobTitle: form.jobTitle.trim() || undefined,
          department: form.department.trim() || undefined,
          countryCode: form.countryCode.trim().toUpperCase() || undefined,
          salaryAmount,
          salaryCurrency: form.salaryCurrency,
          payFrequency: form.payFrequency,
        }),
      })

      const body = (await res.json()) as InviteResponse & { error?: string }
      if (!res.ok || !body.employeeId) {
        throw new Error(body.error ?? 'Failed to create employee')
      }

      setResult(body)
      toast.success(
        body.existing
          ? body.inviteState === 'claimed'
            ? 'Employee already claimed. Open the existing employee record to continue.'
            : 'Employee already exists. Invite details refreshed.'
          : 'Employee invited'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
    } finally {
      setSubmitting(false)
    }
  }

  if (employerLoading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  if (!employer) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Add Employee</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Create your employer account first before inviting a team member.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">
            Remlo needs an employer record before it can create invite links, KYC sessions, and payroll records.
          </p>
          <Button asChild className="mt-4">
            <Link href="/register">Set up employer account</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button asChild variant="outline" className="mb-4 gap-2">
            <Link href="/dashboard/team">
              <ChevronLeft className="h-4 w-4" />
              Back to Team
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Add Employee</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Invite a new team member, generate their onboarding links, and attach compensation details in one step.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Employer
          <span className="ml-2 font-medium text-[var(--text-primary)]">{employer.company_name}</span>
        </div>
      </div>

      {result ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                <CircleCheckBig className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {result.existing
                    ? result.inviteState === 'claimed'
                      ? 'Employee already claimed'
                      : 'Employee already on file'
                    : 'Employee created'}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {result.inviteState === 'claimed'
                    ? `${form.firstName} ${form.lastName} already has a claimed employee account for this workspace.`
                    : `${form.firstName} ${form.lastName} is now attached to your team profile and ready for onboarding.`}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Mail className="h-4 w-4 text-[var(--accent)]" />
                  {result.inviteState === 'claimed' ? 'Invite status' : 'Invite link'}
                </div>
                {result.inviteState === 'claimed' ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    This employee record has already been claimed, so the original invite link is no longer valid.
                    Sign in with the employee account that accepted it, or create a fresh employee record with a different test email if you want a brand-new employee onboarding flow.
                  </p>
                ) : (
                  <p className="mt-2 break-all text-xs leading-6 text-[var(--text-secondary)]">{result.inviteUrl}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.inviteState === 'claimable' ? (
                    <>
                      <Button type="button" size="sm" onClick={() => void copyInviteLink()}>
                        <Copy className="h-4 w-4" />
                        Copy invite
                      </Button>
                      <Button asChild type="button" size="sm" variant="outline">
                        <Link href={result.inviteUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Open
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <Button asChild type="button" size="sm" variant="outline">
                      <Link href={`/dashboard/team/${result.employeeId}`}>
                        Open employee record
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                  Bridge KYC
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {result.kycUrl
                    ? 'KYC link generated and ready to share.'
                    : 'KYC link not generated in this environment yet. The employee record was still created.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!result.kycUrl}
                    onClick={() => {
                      if (!result.kycUrl) return
                      window.open(result.kycUrl, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open KYC link
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Next steps</h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                <li>Employee record is live in your team directory and can be included in payroll batches.</li>
                <li>
                  {result.inviteState === 'claimed'
                    ? 'This employee already completed invite claim previously, so no fresh invite link is available for reuse.'
                    : result.emailSent
                      ? 'Invite email was queued through Resend.'
                      : 'Invite email was not sent automatically in this environment.'}
                </li>
                <li>{result.kycUrl ? 'Bridge KYC can start immediately from the generated link above.' : 'Bridge KYC can be generated later from the employee record once Bridge is configured.'}</li>
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" onClick={resetFlow}>
                <UserPlus className="h-4 w-4" />
                Add another employee
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/dashboard/team">Return to team</Link>
              </Button>
            </div>
          </section>

          <aside className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Invite summary</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Name</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)]">{form.firstName} {form.lastName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Email</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)]">{form.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Role</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)]">{form.jobTitle || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Compensation</dt>
                <dd className="mt-1 text-sm text-[var(--text-primary)]">
                  {form.salaryAmount
                    ? `${form.salaryCurrency} ${Number(form.salaryAmount).toLocaleString()} · ${PAY_FREQUENCIES.find((item) => item.value === form.payFrequency)?.label ?? form.payFrequency}`
                    : 'Not set'}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="First name" htmlFor="first-name">
                <Input
                  id="first-name"
                  autoFocus
                  required
                  value={form.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                  placeholder="Ada"
                />
              </Field>

              <Field label="Last name" htmlFor="last-name">
                <Input
                  id="last-name"
                  required
                  value={form.lastName}
                  onChange={(event) => updateField('lastName', event.target.value)}
                  placeholder="Nwosu"
                />
              </Field>

              <Field label="Work email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="ada@company.com"
                />
              </Field>

              <Field label="Country code" htmlFor="country-code" optional>
                <Input
                  id="country-code"
                  maxLength={2}
                  value={form.countryCode}
                  onChange={(event) => updateField('countryCode', event.target.value.toUpperCase())}
                  placeholder="NG"
                />
              </Field>

              <Field label="Job title" htmlFor="job-title" optional>
                <Input
                  id="job-title"
                  value={form.jobTitle}
                  onChange={(event) => updateField('jobTitle', event.target.value)}
                  placeholder="Operations Manager"
                />
              </Field>

              <Field label="Department" htmlFor="department" optional>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(event) => updateField('department', event.target.value)}
                  placeholder="Finance"
                />
              </Field>

              <Field label="Salary amount" htmlFor="salary-amount" optional>
                <Input
                  id="salary-amount"
                  inputMode="decimal"
                  value={form.salaryAmount}
                  onChange={(event) => updateField('salaryAmount', event.target.value)}
                  placeholder="85000"
                />
              </Field>

              <Field label="Currency">
                <Select value={form.salaryCurrency} onValueChange={(value) => updateField('salaryCurrency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Pay frequency">
                  <Select value={form.payFrequency} onValueChange={(value) => updateField('payFrequency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pay frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAY_FREQUENCIES.map((frequency) => (
                        <SelectItem key={frequency.value} value={frequency.value}>
                          {frequency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            {error ? <p className="mt-4 text-sm text-[var(--status-error)]">{error}</p> : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating employee
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create employee
                  </>
                )}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/dashboard/team">Cancel</Link>
              </Button>
            </div>
          </section>

          <aside className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">What happens next</h2>
            <div className="mt-4 space-y-4 text-sm text-[var(--text-secondary)]">
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                <p className="font-medium text-[var(--text-primary)]">1. Employee record is created</p>
                <p className="mt-1">Remlo stores the team member, compensation metadata, and invite state inside your employer workspace.</p>
              </div>
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                <p className="font-medium text-[var(--text-primary)]">2. Invite and KYC links are prepared</p>
                <p className="mt-1">The API returns a shareable invite link and, when Bridge is configured, a live KYC session for employee verification.</p>
              </div>
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                <p className="font-medium text-[var(--text-primary)]">3. Payroll can include them immediately</p>
                <p className="mt-1">Once the employee completes onboarding, their wallet and compliance status will be ready for Tempo payroll execution.</p>
              </div>
            </div>
          </aside>
        </form>
      )}
    </div>
  )
}
