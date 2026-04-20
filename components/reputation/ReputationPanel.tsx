'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, ExternalLink } from 'lucide-react'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'
import type { CrossChainReputation } from '@/lib/reputation'

interface ReputationPanelProps {
  solanaAddress?: string
  tempoAgentId?: string
  title?: string
  compact?: boolean
}

function truncate(s: string, n: number): string {
  if (!s || s.length <= n) return s
  return `${s.slice(0, n / 2)}…${s.slice(-n / 2)}`
}

async function fetchReputation(subject: string): Promise<CrossChainReputation | null> {
  if (!subject) return null
  const res = await fetch(`/api/reputation/${encodeURIComponent(subject)}`)
  if (!res.ok) return null
  return (await res.json()) as CrossChainReputation
}

export function ReputationPanel({
  solanaAddress,
  tempoAgentId,
  title = 'On-chain reputation',
  compact = false,
}: ReputationPanelProps): React.ReactElement {
  const subject = solanaAddress || tempoAgentId || ''
  const query = useQuery({
    queryKey: ['reputation-panel', subject],
    queryFn: () => fetchReputation(subject),
    enabled: !!subject,
  })

  const unified = query.data?.unified
  const attestations = query.data?.solana?.attestations ?? []

  return (
    <div className="border border-[var(--border-default)] rounded-2xl p-4 bg-[var(--bg-surface)]">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-4 h-4 text-[var(--text-muted)]" />
        <h3 className="text-xs font-medium text-[var(--text-primary)] uppercase tracking-wider">{title}</h3>
      </div>

      {!subject ? (
        <p className="text-xs text-[var(--text-muted)]">No address to query.</p>
      ) : query.isLoading ? (
        <p className="text-xs text-[var(--text-muted)]">Loading…</p>
      ) : !query.data ? (
        <p className="text-xs text-[var(--text-muted)]">No reputation found.</p>
      ) : (
        <>
          <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-3 mb-3`}>
            <Stat label="Payments" value={String(unified?.totalPayments ?? 0)} />
            <Stat
              label="Earned"
              value={
                unified ? `$${(Number(unified.totalValueMovedBaseUnits) / 1_000_000).toFixed(2)}` : '—'
              }
            />
            {!compact && (
              <>
                <Stat
                  label="Feedback"
                  value={unified?.agentFeedbackScore !== null && unified?.agentFeedbackScore !== undefined
                    ? unified.agentFeedbackScore.toFixed(0)
                    : '—'}
                />
                <Stat label="Events" value={String(unified?.agentFeedbackCount ?? 0)} />
              </>
            )}
          </div>
          {!compact && attestations.length > 0 && (
            <div className="pt-3 border-t border-[var(--border-default)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Recent SAS attestations
              </p>
              <div className="space-y-1 max-h-32 overflow-auto">
                {attestations.slice(0, 5).map((att, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">{att.schema_id.replace('SAS_SCHEMA_', '')}</span>
                    {att.attestation_pda && (
                      <a
                        href={`https://explorer.solana.com/address/${att.attestation_pda}?cluster=${SOLANA_CLUSTER}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
                      >
                        {truncate(att.attestation_pda, 14)}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
