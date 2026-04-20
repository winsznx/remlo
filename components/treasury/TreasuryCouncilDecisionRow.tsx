'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import type { Database } from '@/lib/database.types'

type Decision = Database['public']['Tables']['treasury_decisions']['Row']
type Vote = Database['public']['Tables']['validator_votes']['Row']

interface Props {
  decision: Decision
  employerId: string
  onExecute: () => Promise<void>
  isExecuting: boolean
}

const STATUS_LABEL: Record<Decision['status'], string> = {
  pending_council: 'Awaiting council',
  council_approved: 'Approved',
  council_rejected: 'Rejected',
  executed: 'Executed',
  execution_failed: 'Execution failed',
  cancelled: 'Cancelled',
}

const STATUS_TONE: Record<Decision['status'], string> = {
  pending_council: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
  council_approved: 'bg-green-500/15 text-green-700 dark:text-green-300',
  council_rejected: 'bg-red-500/15 text-red-700 dark:text-red-300',
  executed: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  execution_failed: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  cancelled: 'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
}

export function TreasuryCouncilDecisionRow({
  decision,
  employerId,
  onExecute,
  isExecuting,
}: Props) {
  const [expanded, setExpanded] = React.useState(false)
  const fetchJson = usePrivyAuthedJson()

  const detailQuery = useQuery({
    queryKey: ['treasury-decision-detail', decision.id],
    enabled: expanded,
    refetchInterval: decision.status === 'pending_council' && expanded ? 3000 : false,
    queryFn: async () => {
      return fetchJson<{ decision: Decision; votes: Vote[] }>(
        `/api/employers/${employerId}/treasury-decisions/${decision.id}`,
      )
    },
  })

  const votes = detailQuery.data?.votes ?? []
  const canExecute = decision.status === 'council_approved'

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {decision.action_type.replace(/_/g, ' ')}
            </span>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_TONE[decision.status]}`}
            >
              {STATUS_LABEL[decision.status]}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] truncate">{decision.rationale}</p>
        </div>
        <span className="text-xs text-[var(--text-muted)] ml-4 shrink-0">
          {new Date(decision.created_at).toLocaleString()}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-default)] p-4 space-y-4">
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">
              Payload
            </div>
            <pre className="text-xs bg-[var(--bg-subtle)] rounded-md p-3 overflow-x-auto">
              {JSON.stringify(decision.action_payload, null, 2)}
            </pre>
          </div>

          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">
              Rationale
            </div>
            <p className="text-sm text-[var(--text-primary)]">{decision.rationale}</p>
          </div>

          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              Specialist votes
            </div>
            {detailQuery.isLoading ? (
              <p className="text-xs text-[var(--text-muted)]">Loading specialists…</p>
            ) : votes.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Specialists haven&apos;t voted yet — they run in parallel and typically return within a few seconds.
              </p>
            ) : (
              <div className="space-y-2">
                {votes.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-md border border-[var(--border-default)] p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[var(--text-primary)]">
                        {specialistDisplayName(v.validator_id)}
                      </span>
                      <span
                        className={
                          v.verdict === 'approved'
                            ? 'text-green-700 dark:text-green-300 text-xs font-medium'
                            : 'text-red-700 dark:text-red-300 text-xs font-medium'
                        }
                      >
                        {v.verdict.toUpperCase()}
                        {typeof v.confidence === 'number' &&
                          ` @ ${Math.round(v.confidence * 100)}%`}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{v.reasoning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {decision.council_reasoning && (
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                Council summary
              </div>
              <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                {decision.council_reasoning}
              </pre>
            </div>
          )}

          {canExecute && (
            <div className="flex items-center justify-end pt-2 border-t border-[var(--border-default)]">
              <Button onClick={onExecute} disabled={isExecuting}>
                {isExecuting ? 'Executing…' : 'Execute action'}
              </Button>
            </div>
          )}

          {decision.execution_signature && (
            <p className="text-xs text-[var(--text-muted)]">
              Execution signature: <code>{decision.execution_signature}</code>
            </p>
          )}
          {decision.execution_error && (
            <p className="text-xs text-red-600">
              Execution error: {decision.execution_error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function specialistDisplayName(validatorId: string): string {
  if (validatorId === 'claude-compliance-specialist') return 'Compliance specialist'
  if (validatorId === 'claude-yield-specialist') return 'Yield specialist'
  if (validatorId === 'claude-payroll-specialist') return 'Payroll specialist'
  return validatorId
}
