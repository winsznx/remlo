'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Terminal, Zap, DollarSign, Users, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StreamingBalanceTicker } from '@/components/treasury/StreamingBalanceTicker'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TerminalLine {
  id: string
  type: 'system' | 'request' | 'response' | 'payment' | 'error'
  text: string
  timestamp: string
}

const TYPE_COLORS: Record<TerminalLine['type'], string> = {
  system:   'text-[var(--text-muted)]',
  request:  'text-blue-400',
  response: 'text-[var(--status-success)]',
  payment:  'text-[var(--accent)]',
  error:    'text-[var(--status-error)]',
}

const TYPE_PREFIX: Record<TerminalLine['type'], string> = {
  system:   '  ',
  request:  '→ ',
  response: '← ',
  payment:  '⚡ ',
  error:    '✗ ',
}

// ─── Mock live state (mirrors dashboard data) ─────────────────────────────────

const DEMO_TREASURY_BALANCE = '$47,250.00'
const DEMO_LAST_RUN = {
  date: 'Mar 15, 2026',
  employees: 28,
  amount: '$52,500.00',
  txHash: '0x9988776655443322…',
}

// ─── LiveTerminal ─────────────────────────────────────────────────────────────

function LiveTerminal() {
  const [lines, setLines] = React.useState<TerminalLine[]>([])
  const [running, setRunning] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [paymentTotal, setPaymentTotal] = React.useState(0)
  const endRef = React.useRef<HTMLDivElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  async function runDemoAgent() {
    if (running) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLines([])
    setPaymentTotal(0)
    setDone(false)
    setRunning(true)

    try {
      const res = await fetch('/api/demo/run-agent', {
        method: 'POST',
        signal: abortRef.current.signal,
      })

      if (!res.body) throw new Error('No body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        const chunk = decoder.decode(value)
        const events = chunk.split('\n\n').filter((e) => e.startsWith('data: '))

        for (const event of events) {
          try {
            const data = JSON.parse(event.slice(6)) as {
              type: TerminalLine['type']
              text: string
              timestamp: string
            }
            setLines((prev) => [
              ...prev,
              { id: `${Date.now()}-${Math.random()}`, ...data },
            ])
            if (data.type === 'payment') {
              const match = data.text.match(/\$(\d+(?:\.\d+)?)/)
              if (match) setPaymentTotal((p) => p + parseFloat(match[1]))
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setLines((prev) => [
          ...prev,
          {
            id: 'err',
            type: 'error',
            text: `Agent error: ${err.message}`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          },
        ])
      }
    } finally {
      setRunning(false)
      setDone(true)
    }
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  return (
    <div className="flex flex-col h-full rounded-xl border border-[var(--border-default)] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <Terminal className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)] font-mono">remlo-agent — live demo</span>
        </div>
        <div className="flex items-center gap-3">
          {paymentTotal > 0 && (
            <span className="text-xs font-mono text-[var(--accent)]">
              <Zap className="inline h-3 w-3 mr-0.5" />
              ${paymentTotal.toFixed(2)} paid
            </span>
          )}
          <button
            onClick={runDemoAgent}
            disabled={running}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
              running
                ? 'text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 active:scale-95',
            )}
          >
            {running ? 'Running…' : done ? '↺ Replay' : '▶ Run Demo Agent'}
          </button>
        </div>
      </div>

      {/* Terminal output */}
      <div className="flex-1 bg-background p-4 font-mono text-xs leading-relaxed overflow-y-auto min-h-0">
        {lines.length === 0 ? (
          <p className="text-[var(--text-muted)]">
            $ Press &quot;Run Demo Agent&quot; to see the autonomous payroll agent in action…
          </p>
        ) : (
          <>
            {lines.map((line) => (
              <div key={line.id} className="flex gap-2 mb-0.5">
                <span className="text-[var(--text-muted)] shrink-0 w-16 tabular-nums">{line.timestamp}</span>
                <span className={cn('whitespace-pre-wrap break-all', TYPE_COLORS[line.type])}>
                  {TYPE_PREFIX[line.type]}{line.text}
                </span>
              </div>
            ))}
            {running && (
              <div className="flex gap-2 mt-1">
                <span className="text-[var(--text-muted)] w-16" />
                <span className="text-[var(--accent)] animate-pulse">▋</span>
              </div>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}

// ─── Dashboard State Panel ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3',
      accent
        ? 'border-[var(--accent)]/20 bg-[var(--accent)]/5'
        : 'border-[var(--border-default)] bg-[var(--bg-surface)]',
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', accent ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg-subtle)]')}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xl font-bold font-mono tabular-nums text-[var(--text-primary)]">{value}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Demo page ────────────────────────────────────────────────────────────────

export default function DemoPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-4 overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
            Live Demo
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Autonomous AI payroll agent · HTTP/402 machine-to-machine payments · Tempo Moderato
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-ping" />
          <span className="text-xs font-medium text-[var(--accent)]">Tempo Moderato · Chain 42431</span>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left column: Agent terminal */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col min-h-0"
        >
          <LiveTerminal />
        </motion.div>

        {/* Right column: Live dashboard state */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex flex-col gap-3 overflow-y-auto"
        >
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-0.5 shrink-0">
            Live State
          </p>

          {/* Treasury balance */}
          <StatCard
            label="Treasury Balance"
            value={DEMO_TREASURY_BALANCE}
            sub="Available on-chain · pathUSD (TIP-20)"
            icon={<DollarSign className="h-3.5 w-3.5 text-[var(--accent)]" />}
            accent
          />

          {/* Streaming salary ticker */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--text-muted)]">Employee #1 Accrued Salary</p>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-[10px] font-medium text-[var(--accent)]">Streaming</span>
              </div>
            </div>
            <StreamingBalanceTicker
              employeeId="demo-employee-001"
              className="text-xl font-bold"
            />
            <p className="text-xs text-[var(--text-muted)]">
              +$0.003170/sec · StreamVesting contract · Tempo Moderato
            </p>
          </div>

          {/* Last payroll run */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-3">
            <p className="text-xs font-medium text-[var(--text-muted)]">Last Payroll Run</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                  {DEMO_LAST_RUN.amount}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {DEMO_LAST_RUN.date} · {DEMO_LAST_RUN.employees} employees
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--status-success)]/10 border border-[var(--status-success)]/20">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
                <span className="text-[10px] font-medium text-[var(--status-success)]">Confirmed</span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
              tx: {DEMO_LAST_RUN.txHash}
            </p>
          </div>

          {/* Team compliance */}
          <StatCard
            label="Team Compliance"
            value="28 / 28"
            sub="All employees AUTHORIZED · TIP-403 policy #1"
            icon={<Users className="h-3.5 w-3.5 text-[var(--mono)]" />}
          />

          {/* MPP session summary */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">MPP Session (x402)</p>
            <div className="space-y-1.5">
              {[
                { label: 'Yield rates query',     cost: '$0.01' },
                { label: 'Treasury balance',       cost: '$0.02' },
                { label: 'Compliance × 5',         cost: '$0.25' },
                { label: 'Payroll execute',        cost: '$1.00' },
                { label: 'Salary stream × 10',    cost: '$0.01' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="font-mono text-[var(--accent)]">{item.cost}</span>
                </div>
              ))}
              <div className="border-t border-[var(--border-default)] pt-1.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-[var(--text-primary)]">Total agent cost</span>
                <span className="font-mono text-[var(--accent)]">$1.29</span>
              </div>
            </div>
          </div>

          {/* Yield */}
          <StatCard
            label="Yield Earned (Mar)"
            value="$184.50"
            sub="3.7% APY · YieldRouter · pathUSD strategy"
            icon={<TrendingUp className="h-3.5 w-3.5 text-[var(--accent)]" />}
          />
        </motion.div>
      </div>
    </div>
  )
}
