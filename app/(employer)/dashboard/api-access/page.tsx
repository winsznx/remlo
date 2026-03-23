'use client'

import * as React from 'react'
import { Activity, Check, Copy, Key, Zap } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { MppSessionPanel } from '@/components/mpp/MppSessionPanel'
import { MppReceiptBadge } from '@/components/mpp/MppReceiptBadge'
import { AgentTerminal } from '@/components/mpp/AgentTerminal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { useMppReceipts, useMppSessions } from '@/lib/hooks/useDashboard'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'

const PRICING_TIERS = [
  {
    name: 'Micro-reads',
    color: 'border-[var(--border-default)]',
    endpoints: [
      { name: 'Yield Rates', route: '/api/mpp/treasury/yield-rates', price: '$0.01' },
      { name: 'Memo Decode', route: '/api/mpp/memo/decode', price: '$0.01' },
      { name: 'Employee History', route: '/api/mpp/employee/[id]/history', price: '$0.05' },
      { name: 'Compliance Check', route: '/api/mpp/compliance/check', price: '$0.05' },
      { name: 'Payslip', route: '/api/mpp/payslips/[runId]/[employeeId]', price: '$0.02' },
    ],
  },
  {
    name: 'Operations',
    color: 'border-[var(--accent)]',
    highlight: true,
    endpoints: [
      { name: 'Treasury Optimize', route: '/api/mpp/treasury/optimize', price: '$0.10 session' },
      { name: 'Bridge Off-Ramp', route: '/api/mpp/bridge/offramp', price: '$0.25' },
      { name: 'Employee Advance', route: '/api/mpp/employee/advance', price: '$0.50' },
      { name: 'Compliance List', route: '/api/mpp/marketplace/compliance-list/[employerId]', price: '$0.50' },
      { name: 'Balance Stream (SSE)', route: '/api/mpp/employee/balance/stream', price: '$0.001/tick' },
    ],
  },
  {
    name: 'Premium',
    color: 'border-purple-500/40',
    endpoints: [
      { name: 'Execute Payroll', route: '/api/mpp/payroll/execute', price: '$1.00' },
      { name: 'Agent Treasury Session', route: '/api/mpp/agent/session/treasury', price: '$0.02 session' },
    ],
  },
]

function AgentKeyPanel({ employerId, hasKey }: { employerId: string; hasKey: boolean }) {
  const authedFetch = usePrivyAuthedFetch()
  const queryClient = useQueryClient()
  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const response = await authedFetch(`/api/employers/${employerId}/agent-key`, {
        method: 'POST',
      })
      const body = (await response.json()) as { apiKey?: string; error?: string }

      if (!response.ok || !body.apiKey) {
        throw new Error(body.error ?? 'Failed to generate agent key')
      }

      setGeneratedKey(body.apiKey)
      void queryClient.invalidateQueries({ queryKey: ['employer'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate agent key')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!generatedKey) return
    await navigator.clipboard.writeText(generatedKey)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-[var(--text-muted)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Agent API key</h3>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        Generate a one-time key for your treasury or payroll agents. Remlo stores only a hash after creation, so the raw key is only visible at generation time.
      </p>

      <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Current status</p>
        <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
          {hasKey ? 'An agent key is already provisioned for this employer.' : 'No agent key has been generated yet.'}
        </p>
      </div>

      {generatedKey ? (
        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Generated key</p>
              <code className="mt-2 block break-all font-mono text-xs leading-6 text-[var(--text-primary)]">
                {generatedKey}
              </code>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-lg border border-[var(--border-default)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Copy agent key"
            >
              {copied ? <Check className="h-4 w-4 text-[var(--status-success)]" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-[var(--status-pending)]">Copy this key now. Remlo will not show it again after this page refreshes.</p>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-[var(--status-error)]">{error}</p> : null}

      <div className="mt-5">
        <Button onClick={() => void handleGenerate()} disabled={loading}>
          <Key className="h-4 w-4" />
          {loading ? 'Generating key…' : hasKey ? 'Rotate agent key' : 'Generate agent key'}
        </Button>
      </div>
    </div>
  )
}

export default function ApiAccessPage() {
  const { data: employer } = useEmployer()
  const { data: sessionsData, isLoading: sessionsLoading } = useMppSessions(employer?.id)
  const { data: receiptsData, isLoading: receiptsLoading } = useMppReceipts(employer?.id)

  return (
    <div className="space-y-8">
      <SectionHeader
        title="API Access"
        description="Remlo exposes machine-payable payroll and treasury endpoints via MPP for agents, operators, and integrations."
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Pricing</h2>
        <div className="grid gap-4 xl:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border-2 bg-[var(--bg-surface)] p-5 sm:p-6 ${tier.color} ${tier.highlight ? 'shadow-lg shadow-[var(--accent)]/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{tier.name}</h3>
                {tier.highlight ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                    <Zap className="h-3 w-3" />
                    Popular
                  </span>
                ) : null}
              </div>
              <div className="mt-5 space-y-3">
                {tier.endpoints.map((endpoint) => (
                  <div key={endpoint.route} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{endpoint.name}</p>
                      <p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">{endpoint.route}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-[var(--accent)]">{endpoint.price}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        {employer ? (
          <AgentKeyPanel employerId={employer.id} hasKey={Boolean(employer.mpp_agent_key_hash)} />
        ) : (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
            Create an employer account first to provision agent credentials.
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Session history</h3>
          </div>
          {sessionsLoading ? (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-muted)]">
              Loading MPP sessions…
            </div>
          ) : (
            <MppSessionPanel sessions={sessionsData?.sessions ?? []} />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent MPP activity</h2>
        {receiptsLoading ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-muted)]">
            Loading receipts…
          </div>
        ) : receiptsData?.receipts.length ? (
          <div className="space-y-2">
            {receiptsData.receipts.map((receipt) => (
              <MppReceiptBadge key={receipt.id} {...receipt} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-muted)]">
            MPP receipts will appear here after agents or operators hit paid endpoints.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Agent demo terminal</h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Watch the autonomous treasury agent step through compliance checks, treasury reads, and payroll execution while each call clears through HTTP 402.
        </p>
        <AgentTerminal />
      </div>
    </div>
  )
}
