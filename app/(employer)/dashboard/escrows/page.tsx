'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Scale, Clock, ExternalLink, ChevronRight } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SolanaBadge } from '@/components/wallet/SolanaBadge'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { cn } from '@/lib/utils'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'
import type { Database } from '@/lib/database.types'

type EscrowRow = Database['public']['Tables']['escrows']['Row']

const STATUS_STYLES: Record<EscrowRow['status'], string> = {
  posted: 'bg-[var(--status-neutral)]/15 text-[var(--text-secondary)] border-[var(--border-default)]',
  delivered: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  validating: 'bg-[var(--status-pending)]/10 text-[var(--status-pending)] border-[var(--status-pending)]/20',
  voting: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  settled: 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/20',
  rejected_refunded: 'bg-[var(--status-error)]/10 text-[var(--status-error)] border-[var(--status-error)]/20',
  expired_refunded: 'bg-[var(--status-error)]/10 text-[var(--text-muted)] border-[var(--border-default)]',
}

const STATUS_LABELS: Record<EscrowRow['status'], string> = {
  posted: 'Posted',
  delivered: 'Delivered',
  validating: 'Validating',
  voting: 'Voting',
  settled: 'Settled',
  rejected_refunded: 'Rejected',
  expired_refunded: 'Expired',
}

function formatUsdc(baseUnits: number): string {
  return (baseUnits / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

function truncate(s: string, n: number): string {
  if (!s) return ''
  return s.length <= n ? s : s.slice(0, n) + '…'
}

function countdownOrDate(expiresAt: string, status: EscrowRow['status']): string {
  if (status === 'settled' || status === 'rejected_refunded' || status === 'expired_refunded') {
    return new Date(expiresAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`
}

export default function EscrowsPage(): React.ReactElement {
  const { data: employer } = useEmployer()
  const fetchJson = usePrivyAuthedJson()

  const { data: escrows, isLoading } = useQuery<EscrowRow[]>({
    queryKey: ['escrows', employer?.id],
    queryFn: () => fetchJson(`/api/employers/${employer?.id}/escrows?limit=100`),
    enabled: Boolean(employer?.id),
    refetchInterval: 15_000,
  })

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Agent escrows"
        description="Three-party coordination primitive: requester posts USDC with a rubric, worker submits a deliverable, Claude judge decides, funds settle on-chain via the remlo_escrow Anchor program."
      />

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)]" />
          ))}
        </div>
      ) : !escrows?.length ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
          <Scale className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-sm font-medium text-[var(--text-primary)]">No escrows yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
            Agents post escrows via the MPP endpoint{' '}
            <code className="font-mono text-[var(--mono)]">POST /api/mpp/escrow/post</code>. Funds custodied on-chain by
            the <code className="font-mono text-[var(--mono)]">remlo_escrow</code> program until a Claude judge decides.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {escrows.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Link
                href={`/dashboard/escrows/${row.id}`}
                className="block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    STATUS_STYLES[row.status],
                  )}>
                    {STATUS_LABELS[row.status]}
                  </span>
                  <SolanaBadge />
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
                    {formatUsdc(Number(row.amount_base_units))} USDC
                  </span>
                  <span className="text-sm text-[var(--text-secondary)] truncate flex-1 min-w-0">
                    {truncate(row.rubric_prompt, 80)}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
                    <Clock className="h-3 w-3" />
                    {countdownOrDate(row.expires_at, row.status)}
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
                  <span>Worker: <span className="font-mono text-[var(--mono)]">{row.worker_wallet_address.slice(0, 6)}…{row.worker_wallet_address.slice(-4)}</span></span>
                  {row.validator_verdict && (
                    <span>
                      Verdict:{' '}
                      <span className={row.validator_verdict === 'approved' ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}>
                        {row.validator_verdict}
                      </span>
                      {' '}({row.validator_confidence}%)
                    </span>
                  )}
                  {row.settlement_signature && (
                    <a
                      href={`https://explorer.solana.com/tx/${row.settlement_signature}?cluster=${SOLANA_CLUSTER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-mono"
                    >
                      settled tx <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {row.refund_signature && (
                    <a
                      href={`https://explorer.solana.com/tx/${row.refund_signature}?cluster=${SOLANA_CLUSTER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-mono"
                    >
                      refund tx <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
