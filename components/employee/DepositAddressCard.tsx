'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDownToLine, Copy, Info, Loader2 } from 'lucide-react'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

/**
 * DepositAddressCard — surfaces the employee's TIP-1022 virtual deposit
 * address on the portal home. The actual address is derived deterministically
 * client-side via lib/tempo/virtual-addresses, but we route through the API
 * so the card also returns "not available yet" cleanly when the employer
 * hasn't registered a master.
 *
 * Hard-warns about TIP-20-only routing: depositing the wrong asset to a
 * virtual address is irreversible.
 */

interface DepositAddressResponse {
  available: boolean
  reason?: string
  address: string | null
  userTag: string | null
  masterAddress: string | null
  employerName: string | null
  warning?: string
}

export function DepositAddressCard() {
  const fetchJson = usePrivyAuthedJson()

  const query = useQuery<DepositAddressResponse>({
    queryKey: ['portal-deposit-address'],
    queryFn: () => fetchJson('/api/portal/deposit-address'),
    staleTime: 5 * 60_000,
  })

  if (query.isLoading) {
    return (
      <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] p-4 flex items-center gap-3">
        <Loader2 className="h-4 w-4 text-[var(--text-muted)] animate-spin" />
        <p className="text-xs text-[var(--text-muted)]">Loading deposit address…</p>
      </div>
    )
  }

  if (!query.data?.available || !query.data.address) {
    return null // Quiet when employer hasn't registered yet — no UI noise.
  }

  return <Card response={query.data} />
}

function Card({ response }: { response: DepositAddressResponse }) {
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    if (!response.address) return
    try {
      await navigator.clipboard.writeText(response.address)
      setCopied(true)
      toast.success('Deposit address copied')
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      toast.error('Could not copy')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.18 }}
      className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
          <ArrowDownToLine className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Your deposit address
          </p>
          <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
            Stablecoin deposits to this address route to your treasury at{' '}
            <span className="font-medium text-[var(--text-primary)]">
              {response.employerName ?? 'your employer'}
            </span>
            , tagged to you on-chain.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 flex items-center gap-2">
        <code className="font-mono text-[11px] text-[var(--text-primary)] break-all flex-1">
          {response.address}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
        >
          <Copy className="h-3 w-3" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex items-start gap-1.5 text-[11px] leading-4 text-[var(--text-muted)]">
        <Info className="h-3 w-3 shrink-0 mt-0.5" />
        <p>
          Only TIP-20 stablecoins on Tempo. NFTs, LP positions, or non-TIP-20 tokens sent here are
          unrecoverable.
        </p>
      </div>
    </motion.div>
  )
}
