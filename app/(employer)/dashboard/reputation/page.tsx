'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, ExternalLink } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TempoFailureStrip } from '@/components/reputation/TempoFailureStrip'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'
import type { CrossChainReputation } from '@/lib/reputation'

async function fetchReputation(address: string): Promise<CrossChainReputation | null> {
  if (!address) return null
  const res = await fetch(`/api/reputation/${encodeURIComponent(address)}`)
  if (!res.ok) return null
  return (await res.json()) as CrossChainReputation
}

function formatUsdc(baseUnits: string): string {
  const n = Number(baseUnits) / 1_000_000
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function truncate(s: string, n: number): string {
  if (!s || s.length <= n) return s
  return `${s.slice(0, n / 2)}…${s.slice(-n / 2)}`
}

export default function ReputationPage() {
  const employerQuery = useEmployer()
  const treasuryAddr = employerQuery.data?.solana_treasury_address ?? undefined

  const payrollAgentId = process.env.NEXT_PUBLIC_REMLO_PAYROLL_AGENT_ID ?? ''
  const validatorAgentId = process.env.NEXT_PUBLIC_REMLO_VALIDATOR_AGENT_ID ?? ''

  const employerRep = useQuery({
    queryKey: ['reputation', treasuryAddr ?? 'none'],
    queryFn: () => (treasuryAddr ? fetchReputation(treasuryAddr) : Promise.resolve(null)),
    enabled: !!treasuryAddr,
  })

  const payrollAgentRep = useQuery({
    queryKey: ['reputation', 'agent', payrollAgentId || 'none'],
    queryFn: () => (payrollAgentId ? fetchReputation(payrollAgentId) : Promise.resolve(null)),
    enabled: !!payrollAgentId,
  })

  const validatorAgentRep = useQuery({
    queryKey: ['reputation', 'agent', validatorAgentId || 'none'],
    queryFn: () => (validatorAgentId ? fetchReputation(validatorAgentId) : Promise.resolve(null)),
    enabled: !!validatorAgentId,
  })

  const [lookup, setLookup] = React.useState('')
  const [lookupTarget, setLookupTarget] = React.useState('')

  const lookupRep = useQuery({
    queryKey: ['reputation-lookup', lookupTarget],
    queryFn: () => fetchReputation(lookupTarget),
    enabled: !!lookupTarget,
  })

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reputation"
        description="On-chain credentials built from payment work — SAS on Solana, ERC-8004 on Tempo"
      />

      <TempoFailureStrip />

      {/* Your reputation */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-surface)]"
      >
        <h2 className="text-sm font-medium text-[var(--text-primary)] mb-4">Your reputation</h2>
        {!treasuryAddr ? (
          <p className="text-sm text-[var(--text-muted)]">
            No Solana treasury configured. Add a treasury address to start building reputation on Solana.
          </p>
        ) : employerRep.isLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <ReputationCard rep={employerRep.data} subject={treasuryAddr} />
        )}
      </motion.div>

      {/* Agent reputation */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-surface)]">
          <h2 className="text-sm font-medium text-[var(--text-primary)] mb-1">Remlo Payroll Agent</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            ERC-8004 agent ID {payrollAgentId || '(not deployed)'} on Tempo Moderato
          </p>
          {payrollAgentRep.data ? (
            <ReputationCard rep={payrollAgentRep.data} subject={payrollAgentId} />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No feedback yet.</p>
          )}
        </div>
        <div className="border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-surface)]">
          <h2 className="text-sm font-medium text-[var(--text-primary)] mb-1">Remlo Validator Agent</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            ERC-8004 agent ID {validatorAgentId || '(not deployed)'} on Tempo Moderato
          </p>
          {validatorAgentRep.data ? (
            <ReputationCard rep={validatorAgentRep.data} subject={validatorAgentId} />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No feedback yet.</p>
          )}
        </div>
      </motion.div>

      {/* Lookup */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-surface)]"
      >
        <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2">Lookup</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Query any Solana address or ERC-8004 agent ID. Public endpoint — no auth required.
        </p>
        <form
          className="flex gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault()
            setLookupTarget(lookup.trim())
          }}
        >
          <input
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="Solana address or Tempo agent ID"
            className="flex-1 px-3 py-2 text-sm rounded-md bg-[var(--surface-bg)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
          />
          <button
            type="submit"
            className="px-3 py-2 text-sm rounded-md bg-[var(--bg-subtle)] border border-[var(--border-default)] hover:opacity-90 text-[var(--text-primary)] flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            Lookup
          </button>
        </form>
        {lookupTarget && (
          lookupRep.isLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Querying…</p>
          ) : (
            <ReputationCard rep={lookupRep.data} subject={lookupTarget} />
          )
        )}
      </motion.div>
    </div>
  )
}

function ReputationCard({
  rep,
  subject,
}: {
  rep: CrossChainReputation | null | undefined
  subject: string
}): React.ReactElement {
  if (!rep) return <p className="text-sm text-[var(--text-muted)]">No reputation found.</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
        <span>{truncate(subject, 24)}</span>
        {rep.subject.solana && (
          <a
            href={`https://explorer.solana.com/address/${rep.subject.solana}?cluster=${SOLANA_CLUSTER}`}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-0.5"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Payments received" value={rep.unified.totalPayments.toString()} />
        <Stat label="Total earned (USDC)" value={formatUsdc(rep.unified.totalValueMovedBaseUnits)} />
        <Stat
          label="Feedback score"
          value={rep.unified.agentFeedbackScore !== null ? rep.unified.agentFeedbackScore.toFixed(0) : '—'}
        />
        <Stat label="Feedback count" value={rep.unified.agentFeedbackCount.toString()} />
      </div>
      {rep.solana && rep.solana.attestations.length > 0 && (
        <div className="pt-3 border-t border-[var(--border-default)]">
          <p className="text-xs text-[var(--text-muted)] mb-2">SAS attestations ({rep.solana.attestations.length})</p>
          <div className="space-y-1 max-h-40 overflow-auto">
            {rep.solana.attestations.slice(0, 10).map((att, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{att.schema_id}</span>
                {att.attestation_pda && (
                  <a
                    href={`https://explorer.solana.com/address/${att.attestation_pda}?cluster=${SOLANA_CLUSTER}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {truncate(att.attestation_pda, 16)}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="text-sm font-medium text-[var(--text-primary)]">{value}</div>
    </div>
  )
}
