'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ExternalLink, Loader2, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AddressDisplay } from '@/components/wallet/AddressDisplay'
import { SolanaTxStatus } from '@/components/wallet/SolanaTxStatus'
import { SolanaBadge } from '@/components/wallet/SolanaBadge'
import { ValidatorVotesPanel } from '@/components/escrow/ValidatorVotesPanel'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { cn } from '@/lib/utils'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'
import type { Database } from '@/lib/database.types'

type EscrowRow = Database['public']['Tables']['escrows']['Row']

const PROGRAM_ID = '2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA'

function formatUsdc(baseUnits: number): string {
  return (baseUnits / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

function fmtTimestamp(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

interface TimelineEntry {
  label: string
  at: string | null
  signature: string | null
  description?: string
  variant?: 'default' | 'success' | 'error' | 'pending'
}

function buildTimeline(row: EscrowRow): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      label: 'Posted',
      at: row.created_at,
      signature: row.initialize_signature,
      description: `Requester locked ${formatUsdc(Number(row.amount_base_units))} USDC into the program vault.`,
      variant: 'default',
    },
  ]

  if (row.deliverable_submitted_at) {
    entries.push({
      label: 'Deliverable submitted',
      at: row.deliverable_submitted_at,
      signature: row.deliverable_signature,
      description: 'Worker submitted a deliverable URI. Hash recorded on-chain.',
      variant: 'default',
    })
  }

  if (row.validator_decided_at) {
    entries.push({
      label: row.validator_verdict === 'approved' ? 'Validator approved' : 'Validator rejected',
      at: row.validator_decided_at,
      signature: row.verdict_signature,
      description: row.validator_reasoning ?? undefined,
      variant: row.validator_verdict === 'approved' ? 'success' : 'error',
    })
  }

  if (row.settlement_signature) {
    entries.push({
      label: 'Settled to worker',
      at: null,
      signature: row.settlement_signature,
      description: `${formatUsdc(Number(row.amount_base_units))} USDC released to worker wallet. Permissionless settle — any caller could have cranked this once the verdict posted.`,
      variant: 'success',
    })
  }

  if (row.refund_signature) {
    entries.push({
      label: row.status === 'expired_refunded' ? 'Refunded (expired)' : 'Refunded (rejected)',
      at: null,
      signature: row.refund_signature,
      description: row.status === 'expired_refunded'
        ? 'Escrow passed expires_at with no approved verdict. Permissionlessly refunded to requester.'
        : 'Verdict was rejected. Permissionlessly refunded to requester.',
      variant: 'error',
    })
  }

  return entries
}

export default function EscrowDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>()
  const { data: employer } = useEmployer()
  const fetchJson = usePrivyAuthedJson()
  const queryClient = useQueryClient()

  const { data: row, isLoading } = useQuery<EscrowRow>({
    queryKey: ['escrow', params.id, employer?.id],
    queryFn: () => fetchJson(`/api/employers/${employer?.id}/escrows/${params.id}`),
    enabled: Boolean(employer?.id && params.id),
    refetchInterval: 5_000,
  })

  const crank = useMutation({
    mutationFn: async () => {
      return fetchJson<{ signature: string; solana_explorer_url: string }>(
        `/api/escrows/${params.id}/crank`,
        { method: 'POST' },
      )
    },
    onSuccess: (data) => {
      toast.success(`Crank broadcast: ${data.signature.slice(0, 8)}…`)
      void queryClient.invalidateQueries({ queryKey: ['escrow', params.id] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Crank failed')
    },
  })

  if (isLoading || !row) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 rounded bg-[var(--bg-subtle)]" />
        <div className="h-48 rounded-2xl bg-[var(--bg-subtle)]" />
      </div>
    )
  }

  const timeline = buildTimeline(row)
  const canCrank = (
    (row.status === 'delivered' && row.validator_verdict) ||
    row.status === 'validating' ||
    (row.status === 'posted' && new Date(row.expires_at).getTime() < Date.now()) ||
    (row.status === 'delivered' && new Date(row.expires_at).getTime() < Date.now())
  )

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/escrows"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to escrows
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-[var(--text-muted)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Escrow detail</h1>
            <SolanaBadge />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Status: <span className="text-[var(--text-primary)] font-medium">{row.status}</span></p>
        </div>
        {canCrank && (
          <Button onClick={() => crank.mutate()} disabled={crank.isPending}>
            {crank.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Crank settlement
          </Button>
        )}
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Amount</p>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
            {formatUsdc(Number(row.amount_base_units))} USDC
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Expires</p>
          <p className="mt-1 text-sm text-[var(--text-primary)]">{fmtTimestamp(row.expires_at)}</p>
          {row.worker_reputation_tier && (
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
              Worker tier:{' '}
              <span className="font-medium text-[var(--text-secondary)]">
                {row.worker_reputation_tier}
              </span>
              {typeof row.worker_attestation_count === 'number' &&
                ` (${row.worker_attestation_count} attestation${row.worker_attestation_count === 1 ? '' : 's'})`}
              {typeof row.requested_expiry_hours === 'number' &&
                typeof row.applied_expiry_hours === 'number' &&
                row.requested_expiry_hours !== row.applied_expiry_hours && (
                  <span title={`Worker has ${row.worker_attestation_count ?? 0} attestations — reputation tier policy shortened expiry from ${row.requested_expiry_hours}h to ${row.applied_expiry_hours}h`}>
                    {' '}· {row.requested_expiry_hours}h → {row.applied_expiry_hours}h
                  </span>
                )}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Requester (agent)</p>
          <p className="mt-1 text-xs font-mono text-[var(--mono)] break-all">{row.requester_agent_identifier}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Worker (agent)</p>
          <p className="mt-1 text-xs font-mono text-[var(--mono)] break-all">{row.worker_agent_identifier}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Worker wallet</p>
          <div className="mt-1">
            <AddressDisplay
              address={row.worker_wallet_address}
              explorerUrl={`https://explorer.solana.com/address/${row.worker_wallet_address}?cluster=${SOLANA_CLUSTER}`}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Escrow account (PDA)</p>
          <div className="mt-1">
            <AddressDisplay
              address={row.escrow_pda}
              explorerUrl={`https://explorer.solana.com/address/${row.escrow_pda}?cluster=${SOLANA_CLUSTER}`}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            Owned by program <span className="font-mono">{PROGRAM_ID.slice(0, 8)}…{PROGRAM_ID.slice(-6)}</span>
          </p>
        </div>
      </div>

      {/* Rubric */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">Rubric</p>
        <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">{row.rubric_prompt}</pre>
      </div>

      {/* Deliverable */}
      {row.deliverable_uri && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Deliverable</p>
          <p className="font-mono text-xs text-[var(--mono)] break-all">{row.deliverable_uri}</p>
          {row.deliverable_hash && (
            <p className="text-[10px] text-[var(--text-muted)]">
              content sha256: <span className="font-mono">{row.deliverable_hash}</span>
            </p>
          )}
        </div>
      )}

      {/* Validator verdict */}
      {row.validator_verdict && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Validator verdict</p>
            <span className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              row.validator_verdict === 'approved'
                ? 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/30'
                : 'bg-[var(--status-error)]/10 text-[var(--status-error)] border-[var(--status-error)]/30',
            )}>
              {row.validator_verdict}
            </span>
          </div>
          {row.validator_reasoning && (
            <blockquote className="border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              {row.validator_reasoning}
            </blockquote>
          )}
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span>Confidence: <span className="font-mono text-[var(--text-primary)]">{row.validator_confidence}%</span></span>
            {row.validator_model && <span>Model: <span className="font-mono text-[var(--text-primary)]">{row.validator_model}</span></span>}
            {row.validator_decided_at && <span>Decided {fmtTimestamp(row.validator_decided_at)}</span>}
          </div>
        </div>
      )}

      {/* Ship 6: multi-validator votes (renders only when votes exist or status='voting') */}
      <ValidatorVotesPanel escrowId={row.id} escrowStatus={row.status} />

      {/* Timeline */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-4">Lifecycle</p>
        <ol className="space-y-4">
          <AnimatePresence>
            {timeline.map((entry, i) => (
              <motion.li
                key={entry.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="flex gap-3"
              >
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    entry.variant === 'success' && 'bg-[var(--status-success)]',
                    entry.variant === 'error' && 'bg-[var(--status-error)]',
                    entry.variant === 'pending' && 'bg-[var(--status-pending)]',
                    (!entry.variant || entry.variant === 'default') && 'bg-[var(--text-muted)]',
                  )} />
                  {i < timeline.length - 1 && <div className="flex-1 w-px bg-[var(--border-default)] mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{entry.label}</p>
                  {entry.at && <p className="text-[10px] text-[var(--text-muted)]">{fmtTimestamp(entry.at)}</p>}
                  {entry.description && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.description}</p>
                  )}
                  {entry.signature && (
                    <div className="mt-1.5">
                      <SolanaTxStatus signature={entry.signature} cluster={SOLANA_CLUSTER} status="confirmed" />
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  )
}
