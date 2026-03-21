'use client'

import * as React from 'react'
import { Terminal, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TerminalLine {
  id: string
  type: 'system' | 'request' | 'response' | 'payment' | 'error'
  text: string
  timestamp: string
}

const TYPE_COLORS: Record<TerminalLine['type'], string> = {
  system: 'text-[var(--text-muted)]',
  request: 'text-blue-400',
  response: 'text-[var(--status-success)]',
  payment: 'text-[var(--accent)]',
  error: 'text-[var(--status-error)]',
}

const TYPE_PREFIX: Record<TerminalLine['type'], string> = {
  system: '  ',
  request: '→ ',
  response: '← ',
  payment: '⚡ ',
  error: '✗ ',
}

// Demo sequence shown on mount
const DEMO_LINES: Omit<TerminalLine, 'id'>[] = [
  { type: 'system', text: 'Remlo Agent v1.0 — connecting to Tempo Moderato…', timestamp: '' },
  { type: 'system', text: 'MPP session opened · maxDeposit: $5.00 · channel: 0xabc…ef12', timestamp: '' },
  { type: 'request', text: 'GET /api/mpp/treasury/yield-rates', timestamp: '' },
  { type: 'payment', text: 'Payment: $0.01 · receipt: 0x7f3a…2c81', timestamp: '' },
  { type: 'response', text: '200 OK · apy_percent: 3.70% · sources: [usdb, aave]', timestamp: '' },
  { type: 'request', text: 'POST /api/mpp/agent/session/treasury · action: balance', timestamp: '' },
  { type: 'payment', text: 'Payment: $0.02 · receipt: 0x1d2b…9f44', timestamp: '' },
  { type: 'response', text: '200 OK · available: $47,250.00 · locked: $12,750.00', timestamp: '' },
  { type: 'request', text: 'POST /api/mpp/compliance/check × 5 employees', timestamp: '' },
  { type: 'payment', text: 'Payment: $0.25 · 5 × $0.05 · all CLEAR', timestamp: '' },
  { type: 'response', text: '200 OK · all employees AUTHORIZED via TIP-403 policy #1', timestamp: '' },
  { type: 'request', text: 'POST /api/mpp/payroll/execute · payrollRunId: run-abc123', timestamp: '' },
  { type: 'payment', text: 'Payment: $1.00 · receipt: 0x9e7f…3b12', timestamp: '' },
  { type: 'response', text: '200 OK · tx: 0xdeadbeef… · 28 employees paid in 0.41s', timestamp: '' },
  { type: 'system', text: 'Session closed · spent: $1.33 · returned: $3.67 unspent', timestamp: '' },
]

export function AgentTerminal({ className }: { className?: string }) {
  const [lines, setLines] = React.useState<TerminalLine[]>([])
  const [running, setRunning] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function runDemo() {
    setLines([])
    setDone(false)
    setRunning(true)
    const now = new Date()

    DEMO_LINES.forEach((line, i) => {
      setTimeout(() => {
        const ts = new Date(now.getTime() + i * 400)
        setLines((prev) => [
          ...prev,
          {
            id: `line-${i}`,
            ...line,
            timestamp: ts.toLocaleTimeString('en-US', { hour12: false }),
          },
        ])
        if (i === DEMO_LINES.length - 1) {
          setRunning(false)
          setDone(true)
        }
      }, i * 400)
    })
  }

  return (
    <div className={cn('rounded-xl border border-[var(--border-default)] overflow-hidden', className)}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Circle className="h-3 w-3 fill-red-500 text-red-500" />
            <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <Circle className="h-3 w-3 fill-green-500 text-green-500" />
          </div>
          <Terminal className="h-3.5 w-3.5 text-[var(--text-muted)] ml-2" />
          <span className="text-xs text-[var(--text-muted)]">remlo-agent — demo</span>
        </div>
        <button
          onClick={runDemo}
          disabled={running}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            running
              ? 'text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90',
          )}
        >
          {running ? 'Running…' : done ? '↺ Replay' : '▶ Run Demo'}
        </button>
      </div>

      {/* Terminal output */}
      <div className="bg-background p-4 font-mono text-xs leading-relaxed min-h-48 max-h-96 overflow-y-auto">
        {lines.length === 0 ? (
          <p className="text-[var(--text-muted)]">$ Press &quot;Run Demo&quot; to see the autonomous agent in action…</p>
        ) : (
          <>
            {lines.map((line) => (
              <div key={line.id} className="flex gap-2">
                <span className="text-[var(--text-muted)] shrink-0 w-16">{line.timestamp}</span>
                <span className={cn('whitespace-pre-wrap', TYPE_COLORS[line.type])}>
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
