'use client'

import * as React from 'react'
import Link from 'next/link'
import { CreditCard, Loader2, PlusCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ComplianceBadge } from '@/components/employee/ComplianceBadge'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { useTeam } from '@/lib/hooks/useDashboard'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'

export default function EmployerCardsPage() {
  const queryClient = useQueryClient()
  const authedFetch = usePrivyAuthedFetch()
  const { data: employer } = useEmployer()
  const { data, isLoading } = useTeam(employer?.id)
  const [issuingFor, setIssuingFor] = React.useState<string | null>(null)
  const [issueError, setIssueError] = React.useState<string | null>(null)

  async function handleIssueCard(employeeId: string) {
    setIssuingFor(employeeId)
    setIssueError(null)

    try {
      const response = await authedFetch(`/api/employees/${employeeId}/card`, {
        method: 'POST',
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(body.error ?? 'Card issuance failed')
      }

      void queryClient.invalidateQueries({ queryKey: ['team', employer?.id] })
    } catch (error) {
      setIssueError(error instanceof Error ? error.message : 'Card issuance failed')
    } finally {
      setIssuingFor(null)
    }
  }

  const employees = data?.employees ?? []

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Cards"
        description="Manage employer-issued Remlo cards for employees with approved KYC and Bridge customer profiles."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/team/add">Invite employee</Link>
          </Button>
        }
      />

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Issued cards</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
              {employees.filter((employee) => employee.bridge_card_id).length}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Eligible now</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
              {employees.filter((employee) => !employee.bridge_card_id && employee.kyc_status === 'approved' && employee.bridge_customer_id).length}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Waiting on KYC</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
              {employees.filter((employee) => employee.kyc_status !== 'approved').length}
            </p>
          </div>
        </div>
      </div>

      {issueError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-[var(--status-error)]">
          {issueError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Employee card program</h2>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading employee card state…</div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">Add employees to issue cards from this workspace.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-base)] text-left">
                  {['Employee', 'KYC', 'Card status', 'Off-ramp', 'Action'].map((label) => (
                    <th key={label} className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {employees.map((employee) => {
                  const canIssue = !employee.bridge_card_id && employee.kyc_status === 'approved' && employee.bridge_customer_id
                  return (
                    <tr key={employee.id} className="hover:bg-[var(--bg-base)]">
                      <td className="px-5 py-4">
                        <p className="font-medium text-[var(--text-primary)]">
                          {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{employee.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <ComplianceBadge status={employee.kyc_status as 'approved' | 'pending' | 'rejected' | 'expired'} />
                      </td>
                      <td className="px-5 py-4">
                        {employee.bridge_card_id ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
                            <CreditCard className="h-3.5 w-3.5" />
                            Issued ••{employee.bridge_card_id.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">Not issued</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--text-secondary)]">
                        {employee.bridge_bank_account_id ? 'Bank connected' : 'No bank connected'}
                      </td>
                      <td className="px-5 py-4">
                        {canIssue ? (
                          <Button
                            size="sm"
                            onClick={() => void handleIssueCard(employee.id)}
                            disabled={issuingFor === employee.id}
                          >
                            {issuingFor === employee.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                            Issue card
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/team/${employee.id}`}>View employee</Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
