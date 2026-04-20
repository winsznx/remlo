'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Award, ArrowLeft, ExternalLink } from 'lucide-react'
import { useSolanaWallets } from '@privy-io/react-auth'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'
import type { CrossChainReputation } from '@/lib/reputation'

async function fetchReputation(addr: string): Promise<CrossChainReputation | null> {
  if (!addr) return null
  const res = await fetch(`/api/reputation/${encodeURIComponent(addr)}`)
  if (!res.ok) return null
  return (await res.json()) as CrossChainReputation
}

function truncate(s: string, n: number): string {
  if (!s || s.length <= n) return s
  return `${s.slice(0, n / 2)}…${s.slice(-n / 2)}`
}

function formatUsdc(baseUnits: string): string {
  return (Number(baseUnits) / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PortalReputationPage(): React.ReactElement {
  const { wallets } = useSolanaWallets()
  const address = wallets[0]?.address ?? ''

  const query = useQuery({
    queryKey: ['portal-reputation', address],
    queryFn: () => fetchReputation(address),
    enabled: !!address,
  })

  return (
    <div className="space-y-5">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to portal
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[var(--text-muted)]" />
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Your reputation credential</h1>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Your payment history as a portable on-chain credential. Any protocol supporting the Solana
          Attestation Service can verify this reputation.
        </p>
      </div>

      {!address ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-6 text-sm text-[var(--text-muted)]"
        >
          Solana wallet not connected yet. Your credential will build automatically once your first payment lands.
        </motion.div>
      ) : query.isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : !query.data ? (
        <p className="text-sm text-[var(--text-muted)]">No attestations yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Payments" value={String(query.data.unified.totalPayments)} />
            <Stat
              label="Total earned"
              value={`$${formatUsdc(query.data.unified.totalValueMovedBaseUnits)}`}
            />
            <Stat
              label="Attestations"
              value={String(query.data.unified.workerAttestationCount)}
            />
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
              SAS attestations
            </h2>
            {query.data.solana && query.data.solana.attestations.length > 0 ? (
              <div className="space-y-2">
                {query.data.solana.attestations.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 text-xs py-2 border-b border-[var(--border-default)] last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[var(--text-primary)] truncate">
                        {att.schema_id.replace('SAS_SCHEMA_', '').toLowerCase().replaceAll('_', ' ')}
                      </p>
                      {att.written_at && (
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(att.written_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {att.attestation_pda && (
                      <a
                        href={`https://explorer.solana.com/address/${att.attestation_pda}?cluster=${SOLANA_CLUSTER}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
                      >
                        {truncate(att.attestation_pda, 14)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No attestations yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  )
}
