'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Coins, ExternalLink } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ChainBadge } from '@/components/wallet/ChainBadge'
import { SolanaBadge } from '@/components/wallet/SolanaBadge'
import { SolanaTxStatus } from '@/components/wallet/SolanaTxStatus'
import { Button } from '@/components/ui/button'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { useCrossChainTreasury, usePayrollRuns, type CrossChainTreasury } from '@/lib/hooks/useDashboard'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { fetchAllYieldRates, type YieldRate } from '@/lib/solana-yield'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'

function AgentWalletStatusStrip({
  agent,
}: {
  agent: CrossChainTreasury['agent_wallet'] | undefined
}): React.ReactElement {
  if (!agent || !agent.solana_address) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-2.5 text-sm">
        <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
        <span className="text-[var(--text-secondary)]">Solana broadcast: not configured</span>
        <span className="text-xs text-[var(--text-muted)]">· PRIVY_SOLANA_AGENT_WALLET_* not set</span>
      </div>
    )
  }

  const funded = typeof agent.solana_balance === 'number' && agent.solana_balance > 0
  const truncated = `${agent.solana_address.slice(0, 6)}…${agent.solana_address.slice(-4)}`
  const explorerUrl = `https://explorer.solana.com/address/${agent.solana_address}?cluster=${SOLANA_CLUSTER}`

  return (
    <div className={`flex items-center gap-2 flex-wrap rounded-xl border px-4 py-2.5 text-sm ${
      funded
        ? 'border-[var(--status-success)]/30 bg-[var(--status-success)]/5'
        : 'border-[var(--status-pending)]/30 bg-[var(--status-pending)]/5'
    }`}>
      <span className={`h-2 w-2 rounded-full ${funded ? 'bg-[var(--status-success)]' : 'bg-[var(--status-pending)]'}`} />
      <span className="font-medium text-[var(--text-primary)]">
        Solana broadcast: {funded ? 'live' : 'configured, needs funding'}
      </span>
      <span className="text-xs text-[var(--text-muted)]">·</span>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-mono text-[var(--mono)] hover:text-[var(--accent)] hover:underline"
      >
        {truncated}
        <ExternalLink className="h-3 w-3" />
      </a>
      <span className="text-xs text-[var(--text-muted)]">
        · {agent.solana_balance?.toFixed(4) ?? '0'} USDC
      </span>
      <span className="text-xs text-[var(--text-muted)] ml-auto hidden sm:inline">
        Privy server wallet · policy-enforced
      </span>
    </div>
  )
}

function YieldCard({ rate }: { rate: YieldRate }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border-default)] last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{rate.protocol}</p>
        {rate.tvl_usd && (
          <p className="text-xs text-[var(--text-muted)]">TVL ${(rate.tvl_usd / 1e6).toFixed(0)}M</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold font-mono tabular-nums text-[var(--text-primary)]">{rate.apy_percent}%</p>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
          rate.source === 'live'
            ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
            : 'bg-[var(--status-pending)]/10 text-[var(--status-pending)]'
        }`}>
          {rate.source}
        </span>
      </div>
    </div>
  )
}

export default function SolanaDashboardPage() {
  const { data: employer } = useEmployer()
  const { data: treasury, isLoading: treasuryLoading } = useCrossChainTreasury()
  const { data: payrollData } = usePayrollRuns(employer?.id, 1, 10)
  const [yieldRates, setYieldRates] = React.useState<YieldRate[]>([])
  const [yieldLoading, setYieldLoading] = React.useState(true)

  React.useEffect(() => {
    fetchAllYieldRates().then((rates) => {
      setYieldRates(rates)
      setYieldLoading(false)
    }).catch(() => setYieldLoading(false))
  }, [])

  const solanaRuns = React.useMemo(
    () => (payrollData?.runs ?? []).filter((r) => (r as unknown as { chain?: string }).chain === 'solana'),
    [payrollData],
  )

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Solana Treasury"
        description="Cross-chain treasury balances and Solana DeFi yield opportunities."
      />

      {/* Cross-chain treasury */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ChainBadge />
              <span className="text-xs text-[var(--text-muted)]">pathUSD</span>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
              ${treasuryLoading ? '—' : (treasury?.tempo.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SolanaBadge />
              <span className="text-xs text-[var(--text-muted)]">USDC</span>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
              ${treasuryLoading ? '—' : (treasury?.solana.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {treasury?.solana.error && (
              <p className="text-xs text-[var(--text-muted)]">{treasury.solana.error === 'wallet_not_configured' ? 'Wallet not configured' : treasury.solana.error}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">Combined</span>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[var(--accent)]">
              ${treasuryLoading ? '—' : (treasury?.total_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </motion.div>

      <AgentWalletStatusStrip agent={treasury?.agent_wallet} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Yield rates panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">DeFi Yield Rates</h3>
            </div>
          </div>
          {yieldLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-[var(--bg-subtle)]" />
              ))}
            </div>
          ) : (
            <div>
              {yieldRates.map((rate) => <YieldCard key={rate.protocol} rate={rate} />)}
            </div>
          )}
          <Button variant="outline" className="w-full mt-4" asChild>
            <a href="/dashboard/agent">Rebalance with AI</a>
          </Button>
        </motion.div>

        {/* Recent Solana payroll runs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-4 w-4 text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Solana Payroll Runs</h3>
          </div>
          {solanaRuns.length === 0 ? (
            <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] p-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">No Solana payroll runs yet.</p>
              <Button className="mt-4" asChild>
                <a href="/dashboard/payroll/new">Run your first Solana payroll</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {solanaRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {run.employee_count} employees · ${run.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(run.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SolanaBadge />
                    {run.tx_hash && (
                      <SolanaTxStatus signature={run.tx_hash} cluster={SOLANA_CLUSTER} status="confirmed" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
