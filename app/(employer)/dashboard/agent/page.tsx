'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, ChevronDown, Play, CheckCircle, Clock, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { useAgentDecisions, type AgentDecisionSummary } from '@/lib/hooks/useDashboard'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  payroll_execution: 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/20',
  yield_allocation: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  anomaly_flag: 'bg-[var(--status-error)]/10 text-[var(--status-error)] border-[var(--status-error)]/20',
  compliance_screen: 'bg-[var(--status-pending)]/10 text-[var(--status-pending)] border-[var(--status-pending)]/20',
}

const TYPE_LABELS: Record<string, string> = {
  payroll_execution: 'Payroll',
  yield_allocation: 'Yield',
  anomaly_flag: 'Anomaly',
  compliance_screen: 'Compliance',
}

function ConfidenceBar({ value }: { value: number }) {
  const percent = Math.round(value * 100)
  const color = value >= 0.9 ? 'bg-[var(--status-success)]' : value >= 0.7 ? 'bg-[var(--accent)]' : 'bg-[var(--status-pending)]'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">Confidence</span>
        <span className="font-mono font-medium text-[var(--text-primary)]">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${percent}%` }} />
      </div>
      {value < 0.7 && (
        <p className="flex items-center gap-1 text-[10px] text-[var(--status-pending)]">
          <AlertTriangle className="h-3 w-3" />
          Agent recommends human review
        </p>
      )}
    </div>
  )
}

function DecisionCard({ decision, onExecuted }: { decision: AgentDecisionSummary; onExecuted: () => void }) {
  const [expanded, setExpanded] = React.useState(false)
  const [executing, setExecuting] = React.useState(false)
  const [executeResult, setExecuteResult] = React.useState<{
    tempo_tx_hash?: string | null
    tempo_explorer_url?: string | null
    solana_signatures?: string[]
    solana_explorer_urls?: string[]
    error?: string
  } | null>(null)
  const fetchJson = usePrivyAuthedJson()

  const firstSentence = decision.reasoning.split(/[.!]\s/)[0] + '.'
  const typeClass = TYPE_COLORS[decision.decision_type] ?? TYPE_COLORS.payroll_execution
  const typeLabel = TYPE_LABELS[decision.decision_type] ?? decision.decision_type

  async function handleExecute() {
    if (executing || decision.decision_type !== 'payroll_execution') return
    setExecuting(true)
    setExecuteResult(null)
    toast.loading('Broadcasting payroll on-chain…', { id: `exec-${decision.id}` })

    try {
      const result = await fetchJson<{
        tempo_tx_hash: string | null
        tempo_broadcast_error: string | null
        tempo_explorer_url: string | null
        solana_signatures: string[]
        solana_explorer_urls: string[]
        solana_broadcast_error: string | null
      }>('/api/x402/payroll/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: decision.employer_id, decision_id: decision.id }),
      })

      const anyBroadcast = result.tempo_tx_hash || result.solana_signatures.length > 0
      const anyError = result.tempo_broadcast_error || result.solana_broadcast_error

      if (anyBroadcast) {
        toast.success('Payroll broadcast on-chain!', { id: `exec-${decision.id}` })
      } else if (anyError) {
        toast.error(`Broadcast failed: ${anyError}`, { id: `exec-${decision.id}` })
      } else {
        toast.success('Plan executed.', { id: `exec-${decision.id}` })
      }

      setExecuteResult({
        tempo_tx_hash: result.tempo_tx_hash,
        tempo_explorer_url: result.tempo_explorer_url,
        solana_signatures: result.solana_signatures,
        solana_explorer_urls: result.solana_explorer_urls,
        error: anyError ?? undefined,
      })
      onExecuted()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed'
      toast.error(msg, { id: `exec-${decision.id}` })
      setExecuteResult({ error: msg })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <motion.div
      layout
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <span className={cn('shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider', typeClass)}>
          {typeLabel}
        </span>
        <p className="flex-1 text-sm text-[var(--text-secondary)] truncate">{firstSentence}</p>
        <div className="shrink-0 flex items-center gap-3">
          {decision.confidence != null && (
            <span className="text-xs font-mono text-[var(--text-muted)]">{Math.round(decision.confidence * 100)}%</span>
          )}
          {decision.executed ? (
            <CheckCircle className="h-4 w-4 text-[var(--status-success)]" />
          ) : (
            <Clock className="h-4 w-4 text-[var(--text-muted)]" />
          )}
          <span className="text-xs text-[var(--text-muted)] tabular-nums w-16 text-right">
            {new Date(decision.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-[var(--text-muted)] transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-[var(--border-default)] pt-4">
              {/* Reasoning */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Agent&apos;s reasoning</p>
                <blockquote className="border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {decision.reasoning}
                </blockquote>
              </div>

              {/* Inputs summary */}
              {decision.inputs && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">What the agent saw</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {renderInputCards(decision.inputs)}
                  </div>
                </div>
              )}

              {/* Decision output */}
              {decision.decision && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Decision</p>
                  <div className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] p-3 text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-x-auto max-h-48">
                    {JSON.stringify(decision.decision, null, 2)}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {decision.confidence != null && (
                <ConfidenceBar value={decision.confidence} />
              )}

              {/* Actions */}
              {decision.executed ? (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    Executed {decision.executed_at ? `on ${new Date(decision.executed_at).toLocaleString()}` : ''}
                    {decision.payroll_run_id && (
                      <> · <Link href="/dashboard/treasury" className="text-[var(--accent)] hover:underline">View payroll run</Link></>
                    )}
                  </p>
                  {executeResult?.tempo_tx_hash && executeResult.tempo_explorer_url && (
                    <a
                      href={executeResult.tempo_explorer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] hover:underline"
                    >
                      Tempo tx: {executeResult.tempo_tx_hash.slice(0, 12)}…{executeResult.tempo_tx_hash.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {executeResult?.solana_signatures?.map((sig, i) => (
                    <a
                      key={sig}
                      href={executeResult.solana_explorer_urls?.[i]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] hover:underline"
                    >
                      Solana tx {i + 1}: {sig.slice(0, 12)}…{sig.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              ) : decision.decision_type === 'payroll_execution' ? (
                <div className="space-y-2">
                  <Button size="sm" onClick={() => void handleExecute()} disabled={executing}>
                    {executing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    {executing ? 'Broadcasting…' : 'Execute this plan'}
                  </Button>
                  {executeResult?.error && (
                    <p className="text-xs text-[var(--status-error)]">Broadcast failed: {executeResult.error}</p>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function renderInputCards(inputs: Record<string, unknown>): React.ReactNode[] {
  const cards: React.ReactNode[] = []

  const treasury = inputs.treasury as { tempo_balance?: number; solana_balance?: number; total_usd?: number } | undefined
  if (treasury) {
    cards.push(
      <div key="treasury" className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] p-2.5">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Treasury</p>
        <p className="text-sm font-bold font-mono tabular-nums text-[var(--text-primary)]">${(treasury.total_usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
      </div>,
    )
  }

  const schedule = inputs.schedule as { due_employees?: unknown[] } | undefined
  if (schedule?.due_employees) {
    cards.push(
      <div key="schedule" className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] p-2.5">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Due</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">{schedule.due_employees.length} employees</p>
      </div>,
    )
  }

  const anomalies = inputs.anomalies as { flagged_items?: unknown[] } | undefined
  if (anomalies) {
    cards.push(
      <div key="anomalies" className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] p-2.5">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Flagged</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">{anomalies.flagged_items?.length ?? 0}</p>
      </div>,
    )
  }

  const yieldData = inputs.yield as { rates?: { protocol: string; apy_percent: number }[] } | undefined
  if (yieldData?.rates) {
    const top = yieldData.rates[0]
    if (top) {
      cards.push(
        <div key="yield" className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] p-2.5">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Top yield</p>
          <p className="text-sm font-bold font-mono tabular-nums text-[var(--text-primary)]">{top.apy_percent}%</p>
        </div>,
      )
    }
  }

  return cards
}

export default function AgentDashboardPage() {
  const { data: employer } = useEmployer()
  const { data: decisions, isLoading } = useAgentDecisions(employer?.id)
  const fetchJson = usePrivyAuthedJson()
  const queryClient = useQueryClient()
  const [running, setRunning] = React.useState(false)

  async function handleRunAgent() {
    if (!employer?.id || running) return
    setRunning(true)
    toast.loading('Running AI payroll agent…', { id: 'agent-run' })

    try {
      const result = await fetchJson<{ decision_id: string; reasoning: string }>('/api/x402/payroll/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employer.id }),
      })
      toast.success('Agent produced a new decision.', { id: 'agent-run' })
      void queryClient.invalidateQueries({ queryKey: ['agent-decisions', employer.id] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Agent run failed.', { id: 'agent-run' })
    } finally {
      setRunning(false)
    }
  }

  const stats = React.useMemo(() => {
    if (!decisions?.length) return null
    const executed = decisions.filter((d) => d.executed).length
    const avgConf = decisions.reduce((sum, d) => sum + (d.confidence ?? 0), 0) / decisions.length
    const typeCounts = new Map<string, number>()
    for (const d of decisions) {
      typeCounts.set(d.decision_type, (typeCounts.get(d.decision_type) ?? 0) + 1)
    }
    let mostCommon = ''
    let maxCount = 0
    for (const [type, count] of typeCounts) {
      if (count > maxCount) { mostCommon = type; maxCount = count }
    }
    return {
      total: decisions.length,
      executed,
      pending: decisions.length - executed,
      avgConfidence: Math.round(avgConf * 100),
      mostCommon: TYPE_LABELS[mostCommon] ?? mostCommon,
      lastRun: decisions[0]?.created_at,
    }
  }, [decisions])

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Payroll Agent"
        description="Every payroll decision is logged with full reasoning and confidence."
        action={
          <Button onClick={() => void handleRunAgent()} disabled={running}>
            <Play className="h-4 w-4" />
            {running ? 'Running…' : 'Run Agent Now'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Decision timeline */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 h-20" />
              ))}
            </div>
          ) : decisions?.length ? (
            decisions.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.06 }}
              >
                <DecisionCard
                  decision={d}
                  onExecuted={() => void queryClient.invalidateQueries({ queryKey: ['agent-decisions', employer?.id] })}
                />
              </motion.div>
            ))
          ) : (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
              <Bot className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-4" />
              <p className="text-sm font-medium text-[var(--text-primary)]">No agent decisions yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                Run the AI agent to generate a payroll plan with full reasoning.
              </p>
              <Button onClick={() => void handleRunAgent()} disabled={running}>
                <Play className="h-4 w-4" />
                Run Agent Now
              </Button>
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4 h-fit sticky top-6"
          >
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Agent Stats</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Total decisions</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">{stats.total}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Executed</p>
                  <p className="text-sm font-semibold text-[var(--status-success)]">{stats.executed}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Pending</p>
                  <p className="text-sm font-semibold text-[var(--status-pending)]">{stats.pending}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Avg confidence</p>
                <p className="text-sm font-bold font-mono tabular-nums text-[var(--text-primary)]">{stats.avgConfidence}%</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Most common</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{stats.mostCommon}</p>
              </div>
              {stats.lastRun && (
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Last run</p>
                  <p className="text-sm text-[var(--text-primary)]">{new Date(stats.lastRun).toLocaleString()}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
