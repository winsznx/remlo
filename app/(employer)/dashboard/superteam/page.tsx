'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trophy,
  Twitter,
} from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/button'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'
import type { CrossChainTreasury } from '@/lib/hooks/useDashboard'

type Step = 1 | 2 | 3 | 4

interface Contributor {
  contributor_name: string
  solana_wallet: string
  usdc_amount: number
  error?: string
}

interface RunResponse {
  payroll_run_id: string
  chapter_name: string
  contributor_count: number
  total_usdc: number
  solana_signatures: string[]
  rejections: { contributor: string; reason: string }[]
  explorer_urls: string[]
}

const MAX_USDC = 500

function parseCSV(text: string): Contributor[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const nameIdx = header.findIndex((h) => h.includes('name'))
  const walletIdx = header.findIndex((h) => h.includes('wallet') || h.includes('address'))
  const amountIdx = header.findIndex((h) => h.includes('amount') || h.includes('usdc'))
  if (nameIdx === -1 || walletIdx === -1 || amountIdx === -1) return []

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const name = cells[nameIdx] ?? ''
    const wallet = cells[walletIdx] ?? ''
    const amountStr = cells[amountIdx] ?? '0'
    const amount = parseFloat(amountStr)

    let error: string | undefined
    if (!name) error = 'missing name'
    else {
      try {
        new PublicKey(wallet)
      } catch {
        error = 'invalid Solana wallet'
      }
      if (!error) {
        if (!Number.isFinite(amount) || amount <= 0) error = 'amount must be > 0'
        else if (amount > MAX_USDC) error = `amount exceeds ${MAX_USDC} USDC cap`
      }
    }

    return { contributor_name: name, solana_wallet: wallet, usdc_amount: amount, error }
  })
}

async function fetchTreasuryStatus(): Promise<CrossChainTreasury | null> {
  const res = await fetch('/api/x402/treasury/status')
  if (!res.ok) return null
  return (await res.json()) as CrossChainTreasury
}

export default function SuperteamPage(): React.ReactElement {
  const [step, setStep] = React.useState<Step>(1)

  // Step 1 state
  const [chapterName, setChapterName] = React.useState('')
  const [payFrequency, setPayFrequency] = React.useState<'weekly' | 'biweekly' | 'monthly'>('biweekly')

  // Step 2 state
  const [csvText, setCsvText] = React.useState('')
  const [contributors, setContributors] = React.useState<Contributor[]>([])

  // Step 3/4 state
  const [running, setRunning] = React.useState(false)
  const [runError, setRunError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<RunResponse | null>(null)

  const treasury = useQuery({
    queryKey: ['treasury-status-superteam'],
    queryFn: fetchTreasuryStatus,
    refetchInterval: step === 3 ? 10_000 : false,
    enabled: step >= 3,
  })

  const validContributors = contributors.filter((c) => !c.error)
  const totalUsdc = validContributors.reduce((s, c) => s + c.usdc_amount, 0)
  const agentUsdcBalance = treasury.data?.agent_wallet?.solana_balance ?? 0
  const hasSufficientFunds = agentUsdcBalance >= totalUsdc

  async function runPayroll(): Promise<void> {
    setRunError(null)
    setRunning(true)
    try {
      const res = await fetch('/api/superteam/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_name: chapterName,
          pay_frequency: payFrequency,
          contributors: validContributors.map(({ error, ...c }) => {
            void error
            return c
          }),
        }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as RunResponse
      setResult(data)
      setStep(4)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Superteam chapter payroll"
        description="Onboard your chapter contributors and run recurring Solana payroll — powered by Remlo's agent wallet + Privy policy engine"
      />

      <StepIndicator current={step} />

      {step === 1 && (
        <ChapterSetupStep
          chapterName={chapterName}
          setChapterName={setChapterName}
          payFrequency={payFrequency}
          setPayFrequency={setPayFrequency}
          treasuryAddress={treasury.data?.agent_wallet?.solana_address ?? null}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <ContributorListStep
          csvText={csvText}
          setCsvText={setCsvText}
          contributors={contributors}
          setContributors={setContributors}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <ReviewAndRunStep
          chapterName={chapterName}
          validContributors={validContributors}
          totalUsdc={totalUsdc}
          agentUsdcBalance={agentUsdcBalance}
          hasSufficientFunds={hasSufficientFunds}
          running={running}
          runError={runError}
          onBack={() => setStep(2)}
          onRun={runPayroll}
        />
      )}

      {step === 4 && result && (
        <ConfirmationStep result={result} chapterName={chapterName} />
      )}
    </div>
  )
}

// ─── Step Indicator ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }): React.ReactElement {
  const steps = [
    { n: 1, label: 'Chapter setup' },
    { n: 2, label: 'Contributors' },
    { n: 3, label: 'Review & run' },
    { n: 4, label: 'Confirmation' },
  ]
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              s.n === current
                ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                : s.n < current
                  ? 'text-[var(--text-secondary)]'
                  : 'text-[var(--text-muted)]'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                s.n < current
                  ? 'bg-[var(--status-success)]/15 text-[var(--status-success)]'
                  : s.n === current
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
              }`}
            >
              {s.n < current ? '✓' : s.n}
            </span>
            <span>{s.label}</span>
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Step 1: Chapter setup ─────────────────────────────────────────────────

function ChapterSetupStep(props: {
  chapterName: string
  setChapterName: (v: string) => void
  payFrequency: 'weekly' | 'biweekly' | 'monthly'
  setPayFrequency: (v: 'weekly' | 'biweekly' | 'monthly') => void
  treasuryAddress: string | null
  onNext: () => void
}): React.ReactElement {
  const canAdvance = props.chapterName.trim().length > 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-surface)] space-y-5"
    >
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Chapter name
        </label>
        <input
          value={props.chapterName}
          onChange={(e) => props.setChapterName(e.target.value)}
          placeholder="Superteam Nigeria"
          className="w-full px-3 py-2 text-sm rounded-md bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Chapter treasury (Solana)
        </label>
        {props.treasuryAddress ? (
          <p className="text-sm font-mono text-[var(--text-secondary)]">
            {props.treasuryAddress}
          </p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Loading treasury address — configure Privy server wallet if missing.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Pay frequency
        </label>
        <div className="flex gap-2">
          {(['weekly', 'biweekly', 'monthly'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => props.setPayFrequency(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                props.payFrequency === f
                  ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)]'
                  : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-[var(--border-default)]">
        <Button variant="outline" size="sm" disabled className="text-xs">
          <Upload className="w-3 h-3 mr-1" />
          Import from Superteam
        </Button>
        <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
          Stub — paste contributor list as CSV in the next step until the Superteam API exists.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={props.onNext} disabled={!canAdvance} size="sm">
          Next <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Step 2: Contributors ──────────────────────────────────────────────────

function ContributorListStep(props: {
  csvText: string
  setCsvText: (v: string) => void
  contributors: Contributor[]
  setContributors: (c: Contributor[]) => void
  onBack: () => void
  onNext: () => void
}): React.ReactElement {
  function handleParse(): void {
    const parsed = parseCSV(props.csvText)
    props.setContributors(parsed)
  }

  const validCount = props.contributors.filter((c) => !c.error).length
  const errorCount = props.contributors.length - validCount

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-surface)] space-y-5"
    >
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Contributor list (CSV)
        </label>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Columns: <span className="font-mono">contributor_name, solana_wallet, usdc_amount</span>. Max {MAX_USDC} USDC per contributor.
        </p>
        <textarea
          value={props.csvText}
          onChange={(e) => props.setCsvText(e.target.value)}
          placeholder="contributor_name,solana_wallet,usdc_amount&#10;Alice,AKMjwfuPcv7dkB23srhUwB85dwMEWU3RqbZDgp7vf6dR,100&#10;Bob,CzMHaRnkKf4NbtkNHfKZu1MTgceEjTJWJCeGQ3DvhYkp,150"
          rows={6}
          className="w-full px-3 py-2 text-xs font-mono rounded-md bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
        />
        <Button onClick={handleParse} size="sm" variant="outline" className="mt-2">
          Parse
        </Button>
      </div>

      {props.contributors.length > 0 && (
        <div className="border border-[var(--border-default)] rounded-md overflow-hidden">
          <div className="flex items-center justify-between bg-[var(--bg-subtle)] px-3 py-2 text-[11px]">
            <span className="text-[var(--text-secondary)]">
              {validCount} valid · {errorCount > 0 && <span className="text-[var(--status-error)]">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {props.contributors.map((c, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 px-3 py-2 text-xs border-t border-[var(--border-default)] first:border-t-0 ${
                  c.error ? 'bg-[var(--status-error)]/5' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">
                    {c.contributor_name || <span className="text-[var(--text-muted)]">(blank)</span>}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] truncate">{c.solana_wallet}</p>
                </div>
                <div className="text-right shrink-0">
                  {c.error ? (
                    <span className="text-[var(--status-error)] text-[11px]">{c.error}</span>
                  ) : (
                    <span className="font-mono text-[var(--text-primary)]">{c.usdc_amount.toFixed(2)} USDC</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button onClick={props.onBack} size="sm" variant="ghost">
          <ChevronLeft className="w-3 h-3 mr-1" /> Back
        </Button>
        <Button onClick={props.onNext} disabled={validCount === 0} size="sm">
          Next <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Step 3: Review + Run ──────────────────────────────────────────────────

function ReviewAndRunStep(props: {
  chapterName: string
  validContributors: Contributor[]
  totalUsdc: number
  agentUsdcBalance: number
  hasSufficientFunds: boolean
  running: boolean
  runError: string | null
  onBack: () => void
  onRun: () => void
}): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-surface)] space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Summary label="Chapter" value={props.chapterName} />
        <Summary label="Contributors" value={String(props.validContributors.length)} />
        <Summary label="Total USDC" value={`$${props.totalUsdc.toFixed(2)}`} />
      </div>

      <div className={`rounded-md border p-3 text-xs ${
        props.hasSufficientFunds
          ? 'border-[var(--status-success)]/30 bg-[var(--status-success)]/5 text-[var(--status-success)]'
          : 'border-[var(--status-pending)]/30 bg-[var(--status-pending)]/5 text-[var(--status-pending)]'
      }`}>
        Agent wallet USDC balance:{' '}
        <span className="font-mono">${props.agentUsdcBalance.toFixed(2)}</span>
        {' · '}
        {props.hasSufficientFunds
          ? 'sufficient for this run'
          : `insufficient — top up by $${(props.totalUsdc - props.agentUsdcBalance).toFixed(2)}`}
      </div>

      {props.runError && (
        <div className="rounded-md border border-[var(--status-error)]/30 bg-[var(--status-error)]/5 text-[var(--status-error)] p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{props.runError}</span>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button onClick={props.onBack} size="sm" variant="ghost" disabled={props.running}>
          <ChevronLeft className="w-3 h-3 mr-1" /> Back
        </Button>
        <Button
          onClick={props.onRun}
          disabled={!props.hasSufficientFunds || props.running || props.validContributors.length === 0}
          size="sm"
        >
          {props.running ? 'Running…' : 'Run payroll'}
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Step 4: Confirmation ──────────────────────────────────────────────────

function ConfirmationStep(props: {
  result: RunResponse
  chapterName: string
}): React.ReactElement {
  const tweet = `Just paid ${props.result.contributor_count} Superteam contributors on Solana in seconds using @RemloHQ 🟢 ${
    props.result.explorer_urls[0] ?? ''
  } #Solana #Superteam`
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-surface)] space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--status-success)]/10 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-[var(--status-success)]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {props.result.contributor_count} contributors paid
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            ${props.result.total_usdc.toFixed(2)} USDC on Solana {SOLANA_CLUSTER} · {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {props.result.solana_signatures.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">On-chain signatures</p>
          {props.result.solana_signatures.map((sig, i) => (
            <a
              key={sig}
              href={`https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_CLUSTER}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <span>{i + 1}.</span>
              <span className="truncate">{sig}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ))}
        </div>
      )}

      {props.result.rejections.length > 0 && (
        <div className="rounded-md border border-[var(--status-pending)]/30 bg-[var(--status-pending)]/5 p-3 text-xs space-y-1">
          <p className="font-medium text-[var(--status-pending)]">
            {props.result.rejections.length} rejection(s) by Privy policy:
          </p>
          {props.result.rejections.map((r, i) => (
            <p key={i} className="text-[var(--text-secondary)]">· {r.contributor}: {r.reason}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-default)]">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/reputation">
            <Trophy className="w-3 h-3 mr-1" /> View reputation
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={tweetUrl} target="_blank" rel="noreferrer">
            <Twitter className="w-3 h-3 mr-1" /> Share on X
          </a>
        </Button>
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">
        SAS attestations (remlo-payment-completed) will appear on the reputation page within ~10 minutes
        once the cron worker processes the queue.
      </p>
    </motion.div>
  )
}

function Summary({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--text-primary)] truncate">{value}</p>
    </div>
  )
}
