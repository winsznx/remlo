'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { TreasuryCouncilForm } from '@/components/treasury/TreasuryCouncilForm'
import { TreasuryCouncilDecisionRow } from '@/components/treasury/TreasuryCouncilDecisionRow'
import type { Database } from '@/lib/database.types'

type Decision = Database['public']['Tables']['treasury_decisions']['Row']

export default function TreasuryCouncilPage() {
  const { data: employer } = useEmployer()
  const fetchJson = usePrivyAuthedJson()
  const queryClient = useQueryClient()

  const decisionsQuery = useQuery({
    queryKey: ['treasury-decisions', employer?.id],
    enabled: Boolean(employer?.id),
    refetchInterval: 5000,
    queryFn: async () => {
      const res = await fetchJson<{ decisions: Decision[] }>(
        `/api/employers/${employer!.id}/treasury-decisions`,
      )
      return res.decisions
    },
  })

  const proposeMutation = useMutation({
    mutationFn: async (input: {
      action_type: string
      action_payload: Record<string, unknown>
      rationale: string
    }) => {
      return fetchJson<{ decision_id: string; status: string }>(
        `/api/employers/${employer!.id}/treasury-decisions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['treasury-decisions', employer?.id],
      })
    },
  })

  const executeMutation = useMutation({
    mutationFn: async (decisionId: string) => {
      return fetchJson<{ signature: string | null; message: string }>(
        `/api/employers/${employer!.id}/treasury-decisions/${decisionId}/execute`,
        { method: 'POST' },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['treasury-decisions', employer?.id],
      })
    },
  })

  const decisions = decisionsQuery.data ?? []

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Treasury Council"
        description="Three specialist agents (Compliance, Yield, Payroll) vote on high-value treasury actions. Majority approves or rejects; employer executes on approval."
      />

      <TreasuryCouncilForm
        onSubmit={async (input) => {
          await proposeMutation.mutateAsync(input)
        }}
        isSubmitting={proposeMutation.isPending}
        submitError={
          proposeMutation.error instanceof Error ? proposeMutation.error.message : null
        }
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">Past decisions</h2>
        {decisionsQuery.isLoading ? (
          <div className="text-sm text-[var(--text-muted)]">Loading…</div>
        ) : decisions.length === 0 ? (
          <EmptyState
            title="No decisions yet"
            description="Propose your first council action above — the three specialists vote and return a verdict within a few seconds."
          />
        ) : (
          <div className="space-y-3">
            {decisions.map((d) => (
              <TreasuryCouncilDecisionRow
                key={d.id}
                decision={d}
                employerId={employer!.id}
                onExecute={async () => {
                  await executeMutation.mutateAsync(d.id)
                }}
                isExecuting={executeMutation.isPending && executeMutation.variables === d.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
