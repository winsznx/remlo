'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

interface FormInput {
  action_type: string
  action_payload: Record<string, unknown>
  rationale: string
}

interface Props {
  onSubmit: (input: FormInput) => Promise<void>
  isSubmitting: boolean
  submitError: string | null
}

const ACTION_TYPES = [
  {
    value: 'yield_route_change',
    label: 'Yield route change',
    description: 'Change treasury yield routing preference.',
    payloadHint: '{ "target_route": "jupiter_v6" }',
  },
  {
    value: 'allocation_rebalance',
    label: 'Allocation rebalance',
    description: 'Rebalance treasury across allocations.',
    payloadHint: '{ "from": "idle", "to": "streaming", "amount_usd": 50000 }',
  },
  {
    value: 'large_payroll_approval',
    label: 'Large payroll approval',
    description: 'Approve a payroll run that exceeds the auto-release threshold.',
    payloadHint: '{ "payroll_run_id": "uuid-of-payroll-run" }',
  },
] as const

export function TreasuryCouncilForm({ onSubmit, isSubmitting, submitError }: Props) {
  const [actionType, setActionType] = React.useState<string>(ACTION_TYPES[0].value)
  const [payload, setPayload] = React.useState<string>(ACTION_TYPES[0].payloadHint)
  const [rationale, setRationale] = React.useState<string>('')
  const [localError, setLocalError] = React.useState<string | null>(null)

  const selected = ACTION_TYPES.find((t) => t.value === actionType) ?? ACTION_TYPES[0]

  React.useEffect(() => {
    setPayload(selected.payloadHint)
  }, [selected.payloadHint])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (!rationale.trim()) {
      setLocalError('Rationale is required.')
      return
    }
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(payload)
    } catch {
      setLocalError('Payload is not valid JSON.')
      return
    }
    try {
      await onSubmit({ action_type: actionType, action_payload: parsed, rationale })
      setRationale('')
    } catch {
      // parent surfaces error via submitError
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-4"
    >
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          Action type
        </label>
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm"
        >
          {ACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{selected.description}</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          Action payload (JSON)
        </label>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm font-mono"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          Rationale
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={3}
          placeholder="Why should the council approve this action? (Compliance, Yield, and Payroll specialists will each review.)"
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm"
        />
      </div>

      {(localError || submitError) && (
        <p className="text-xs text-red-600">{localError ?? submitError}</p>
      )}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Proposing…' : 'Propose to council'}
        </Button>
      </div>
    </form>
  )
}
