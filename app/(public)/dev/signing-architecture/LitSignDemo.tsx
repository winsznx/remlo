'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignResult {
  pkp_wallet: string
  signer_recovered: string
  address_match: boolean
  tx_hash: string
  explorer_url: string
  signing_network: string
  action_cid: string
  chain: string
  signing_ms: number
}

type DemoState = 'idle' | 'signing' | 'broadcasting' | 'done' | 'error'

const STATE_LABELS: Record<DemoState, string> = {
  idle: 'Run Live Demo',
  signing: 'Signing inside TEE…',
  broadcasting: 'Broadcasting to Tempo Moderato…',
  done: 'Run Again',
  error: 'Retry',
}

function ProofRow({ label, value, mono = false, accent = false }: {
  label: string
  value: React.ReactNode
  mono?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-[var(--border-default)] last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <span className={cn(
        'text-sm break-all',
        mono && 'font-mono',
        accent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]',
      )}>
        {value}
      </span>
    </div>
  )
}

export function LitSignDemo() {
  const [state, setState] = React.useState<DemoState>('idle')
  const [result, setResult] = React.useState<SignResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function run() {
    if (state === 'signing' || state === 'broadcasting') return

    setResult(null)
    setError(null)
    setState('signing')

    await new Promise((r) => setTimeout(r, 1200))
    setState('broadcasting')

    try {
      const res = await fetch('/api/demo/lit-sign', { method: 'POST' })
      const data = await res.json() as SignResult & { error?: string }

      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)

      setResult(data)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setState('error')
    }
  }

  const busy = state === 'signing' || state === 'broadcasting'

  return (
    <div className="space-y-5">
      {/* Step indicators */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: 'signing',      label: 'TEE signs tx',       desc: 'Key never leaves enclave' },
          { key: 'broadcasting', label: 'Broadcast to chain', desc: 'Tempo Moderato (42431)'  },
          { key: 'done',         label: 'On-chain proof',     desc: 'Signer = PKP wallet'     },
        ] as const).map((step, i) => {
          const orderMap = { idle: -1, signing: 0, broadcasting: 1, done: 2, error: 2 }
          const current = orderMap[state]
          const done  = state === 'done' && current >= i
          const active = current === i && busy

          return (
            <div
              key={step.key}
              className={cn(
                'rounded-xl border p-3 transition-colors',
                done   ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5'
                : active ? 'border-[var(--accent)]/60 bg-[var(--accent)]/10'
                         : 'border-[var(--border-default)] bg-[var(--bg-subtle)]',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {done ? (
                  <CheckCircle className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 text-[var(--accent)] animate-spin shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-[var(--border-strong)] opacity-40 shrink-0" />
                )}
                <span className={cn(
                  'text-xs font-semibold',
                  done || active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
                )}>
                  {step.label}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] pl-5">{step.desc}</p>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => void run()}
        disabled={busy}
        className={cn(
          'w-full rounded-xl py-3 text-sm font-semibold transition-all',
          busy
            ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
            : 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 active:scale-[0.99]',
        )}
      >
        {busy && <Loader2 className="inline h-4 w-4 animate-spin mr-2 -mt-0.5" />}
        {STATE_LABELS[state]}
      </button>

      <AnimatePresence>
        {state === 'error' && error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-xl border border-[var(--status-error)]/30 bg-red-500/10 p-4 text-sm text-[var(--status-error)]"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-surface)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Live signing proof</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{result.signing_ms}ms in TEE</span>
            </div>

            <div className="px-4">
              <ProofRow label="PKP wallet (signing identity)" value={result.pkp_wallet} mono />
              <ProofRow label="Signer recovered from signature" value={result.signer_recovered} mono />
              <ProofRow
                label="Address match"
                value={result.address_match
                  ? '✓  Signer = PKP wallet — private key never left the Lit enclave'
                  : '✗  Mismatch'}
                accent={result.address_match}
              />
              <ProofRow
                label="Transaction"
                value={
                  <a
                    href={result.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-mono"
                  >
                    {result.tx_hash.slice(0, 12)}…{result.tx_hash.slice(-8)}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                }
              />
              <ProofRow label="Chain" value={result.chain} />
              <ProofRow label="Signing network" value={result.signing_network} />
              <ProofRow label="Lit Action CID (immutable)" value={result.action_cid} mono />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
