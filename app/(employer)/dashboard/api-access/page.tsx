'use client'

import * as React from 'react'
import { Key, Copy, Check, Zap, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MppSessionPanel } from '@/components/mpp/MppSessionPanel'
import { MppReceiptBadge } from '@/components/mpp/MppReceiptBadge'
import { AgentTerminal } from '@/components/mpp/AgentTerminal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useMppSessions } from '@/lib/hooks/useDashboard'
import { useEmployer } from '@/lib/hooks/useEmployer'

// ─── Pricing tiers ─────────────────────────────────────────────────────────

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
      { name: 'Treasury Optimize', route: '/api/mpp/treasury/optimize', price: '$0.10' },
      { name: 'Bridge Off-Ramp', route: '/api/mpp/bridge/offramp', price: '$0.25' },
      { name: 'Employee Advance', route: '/api/mpp/employee/advance', price: '$0.50' },
      { name: 'Compliance List', route: '/api/mpp/marketplace/compliance-list/[employerId]', price: '$0.50' },
      { name: 'Balance Stream (SSE)', route: '/api/mpp/employee/balance/stream', price: '$0.001/tick' },
    ],
  },
  {
    name: 'Premium',
    color: 'border-purple-500/50',
    endpoints: [
      { name: 'Execute Payroll', route: '/api/mpp/payroll/execute', price: '$1.00' },
      { name: 'Agent Treasury Session', route: '/api/mpp/agent/session/treasury', price: '$0.02/session' },
    ],
  },
]

// ─── Mock data (replaced in T35 with TanStack Query) ─────────────────────────

const MOCK_SESSIONS = [
  {
    id: 'sess-1',
    agent_wallet: '0x00EaD1b701fBB5117EfF822d201d0563dD2F2FcB',
    max_deposit: 5.00,
    total_spent: 1.33,
    status: 'closed' as const,
    opened_at: '2026-03-20T10:00:00Z',
    last_action: 'session.close — payroll executed',
  },
]

const MOCK_RECEIPTS = [
  { id: 'r-1', amount: '1.00', route: 'POST /api/mpp/payroll/execute', receiptHash: '0x9e7f3b12abc456', createdAt: '2026-03-20T10:14:22Z' },
  { id: 'r-2', amount: '0.25', route: 'POST /api/mpp/compliance/check ×5', receiptHash: '0x1d2b9f44def789', createdAt: '2026-03-20T10:13:55Z' },
  { id: 'r-3', amount: '0.02', route: 'POST /api/mpp/agent/session/treasury', receiptHash: '0x7f3a2c81ghi012', createdAt: '2026-03-20T10:13:40Z' },
  { id: 'r-4', amount: '0.01', route: 'GET /api/mpp/treasury/yield-rates', receiptHash: '0xabc123jkl345', createdAt: '2026-03-20T10:13:20Z' },
]

// ─── Agent Key ────────────────────────────────────────────────────────────

function AgentKeyPanel() {
  const [generated, setGenerated] = React.useState(false)
  const [key, setKey] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function generate() {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setKey('rmlo_agent_' + Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18))
    setGenerated(true)
    setLoading(false)
  }

  async function copy() {
    if (key) {
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-[var(--text-muted)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Agent API Key</h3>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Generate a key to authenticate your AI agent. The key grants access to all MPP endpoints on your behalf.
      </p>
      {!generated ? (
        <Button
          onClick={generate}
          disabled={loading}
          className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
          size="sm"
        >
          <Key className="h-3.5 w-3.5 mr-1.5" />
          {loading ? 'Generating…' : 'Generate Agent Key'}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5">
            <code className="flex-1 font-mono text-xs text-[var(--text-primary)] truncate">{key}</code>
            <button onClick={copy} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-[var(--status-success)]" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-xs text-[var(--status-pending)]">
            ⚠ Copy this key now — it won't be shown again.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiAccessPage() {
  const { data: employer } = useEmployer()
  const { data: sessionsData, isLoading: sessionsLoading } = useMppSessions(employer?.id)

  const liveSessions = sessionsData?.sessions ?? MOCK_SESSIONS

  return (
    <div className="space-y-8">
      <SectionHeader
        title="API Access"
        description="Pay-per-call MPP endpoints for AI agents and third-party integrations."
      />

      {/* Pricing table */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Pricing</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border-2 bg-[var(--bg-surface)] p-5 space-y-4 ${tier.color} ${tier.highlight ? 'shadow-lg shadow-[var(--accent)]/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{tier.name}</h3>
                {tier.highlight && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent)]">
                    <Zap className="h-3 w-3" />
                    Popular
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {tier.endpoints.map((ep) => (
                  <div key={ep.route} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{ep.name}</p>
                      <p className="font-mono text-xs text-[var(--text-muted)] truncate">{ep.route}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-[var(--accent)] shrink-0">{ep.price}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Key + Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgentKeyPanel />
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Sessions</h3>
          </div>
          {sessionsLoading ? (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">
              Loading sessions…
            </div>
          ) : (
            <MppSessionPanel sessions={liveSessions} />
          )}
        </div>
      </div>

      {/* Recent receipts */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent MPP Receipts</h2>
        <div className="space-y-2">
          {MOCK_RECEIPTS.map((r) => (
            <MppReceiptBadge key={r.id} {...r} />
          ))}
        </div>
      </div>

      {/* Live agent terminal */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Agent Demo Terminal</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Watch the autonomous treasury agent run a full payroll cycle — compliance screening, yield optimization, batch execution — paying for each action via HTTP 402.
        </p>
        <AgentTerminal />
      </div>
    </div>
  )
}
