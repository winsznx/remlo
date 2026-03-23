'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { VisaCardDisplay } from '@/components/card/VisaCardDisplay'
import { useEmployee, useEmployeeCard } from '@/lib/hooks/useEmployee'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'

export default function CardActivatePage() {
  const queryClient = useQueryClient()
  const authedFetch = usePrivyAuthedFetch()
  const { data: employee, isLoading } = useEmployee()
  const { data: cardData } = useEmployeeCard(employee?.id)
  const [issuing, setIssuing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleIssue() {
    if (!employee?.id) return
    setIssuing(true)
    setError(null)

    try {
      const response = await authedFetch(`/api/employees/${employee.id}/card`, { method: 'POST' })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(body.error ?? 'Card issuance failed')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employee-card', employee.id] }),
        queryClient.invalidateQueries({ queryKey: ['employee', employee.user_id] }),
      ])
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : 'Card issuance failed')
    } finally {
      setIssuing(false)
    }
  }

  if (isLoading) {
    return <div className="mx-auto h-80 max-w-[640px] animate-pulse rounded-2xl bg-[var(--bg-subtle)] px-4 pt-6" />
  }

  const hasCard = Boolean(cardData?.hasCard)
  const isEligible = Boolean(cardData?.canIssue)

  return (
    <div className="mx-auto max-w-[640px] space-y-6 px-4 pb-24 pt-6">
      <SectionHeader
        title="Activate Card"
        description="Issue your Remlo payroll card once Bridge KYC is approved and your employee profile is linked."
      />

      <VisaCardDisplay
        last4={cardData?.card?.last4 ?? undefined}
        holderName={[employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.email || 'Remlo User'}
        expiryMonth={cardData?.card?.expiryMonth ?? undefined}
        expiryYear={cardData?.card?.expiryYear ?? undefined}
        status={hasCard ? 'active' : 'pending'}
      />

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Employee KYC</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{employee?.kyc_status ?? 'pending'}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Bridge profile</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{employee?.bridge_customer_id ? 'Connected' : 'Not connected'}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Card status</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{hasCard ? 'Issued' : 'Pending activation'}</p>
          </div>
        </div>

        {hasCard ? (
          <div className="mt-5 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-subtle)] p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">Your card is already active</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  You can manage transfers and review the card surface from your main card page.
                </p>
              </div>
            </div>
            <Button asChild className="mt-4">
              <Link href="/portal/card">
                Go to Card
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--text-muted)]" />
                <div className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                  <p>Cards can be issued after Bridge KYC is approved and the employee profile has a Bridge customer ID.</p>
                  <p>If you are still waiting on verification, finish the KYC flow from your onboarding link and refresh this page.</p>
                </div>
              </div>
            </div>

            {error ? <p className="text-sm text-[var(--status-error)]">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => void handleIssue()} disabled={!isEligible || issuing} className="sm:flex-1">
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {issuing ? 'Issuing card…' : 'Issue Card'}
              </Button>
              <Button asChild variant="outline" className="sm:flex-1">
                <Link href="/portal/settings">
                  Open Settings
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
