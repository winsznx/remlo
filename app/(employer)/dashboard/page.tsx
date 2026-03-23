'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, ChevronRight, DollarSign, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PayrollRunCard } from '@/components/payroll/PayrollRunCard'
import { useEmployer } from '@/lib/hooks/useEmployer'
import {
  useEmployerCompliance,
  usePayrollRuns,
  useTransactions,
  useTreasury,
  useYield,
} from '@/lib/hooks/useDashboard'
import { usePaymentItemsRealtime, usePayrollRunsRealtime } from '@/lib/hooks/useEmployer'

interface MetricTileProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  iconBg: string
  animateNumber?: boolean
  rawValue?: number
}

function AnimatedNumber({
  value,
  prefix = '',
  decimals = 2,
}: {
  value: number
  prefix?: string
  decimals?: number
}) {
  const motionValue = useMotionValue(0)
  const display = useTransform(motionValue, (current) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(current)
  )

  React.useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.1, ease: 'easeOut' })
    return controls.stop
  }, [motionValue, value])

  return (
    <span>
      {prefix}
      <motion.span>{display}</motion.span>
    </span>
  )
}

function MetricTile({ label, value, sub, icon, iconBg, animateNumber, rawValue }: MetricTileProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      </div>
      <div className="mt-5">
        <p className="number-xl truncate text-[var(--text-primary)]">
          {animateNumber && rawValue != null ? <AnimatedNumber value={rawValue} prefix="$" /> : value}
        </p>
        {sub ? <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p> : null}
      </div>
    </div>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'No runs yet'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

function buildActivityData(
  items: Array<{ amount: number; created_at: string }>,
  yieldEarned: number
) {
  const daily = new Map<string, { deposits: number; payroll: number; yield: number }>()
  const now = new Date()

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - index)
    const key = date.toISOString().slice(0, 10)
    daily.set(key, { deposits: 0, payroll: 0, yield: 0 })
  }

  for (const item of items) {
    const key = item.created_at.slice(0, 10)
    const bucket = daily.get(key)
    if (bucket) {
      bucket.payroll += item.amount
    }
  }

  const todayKey = now.toISOString().slice(0, 10)
  const todayBucket = daily.get(todayKey)
  if (todayBucket && yieldEarned > 0) {
    todayBucket.yield = yieldEarned
  }

  return Array.from(daily.entries()).map(([key, value]) => ({
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(key)),
    Deposits: value.deposits,
    Payroll: value.payroll,
    Yield: value.yield,
  }))
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-[var(--text-secondary)]">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
              <span className="text-[var(--text-secondary)]">{entry.name}</span>
            </div>
            <span className="font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyPanel({ title, body, ctaHref, ctaLabel }: { title: string; body: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
      <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">{body}</p>
      {ctaHref && ctaLabel ? (
        <Button asChild className="mt-5">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}

function ComplianceDonut({ verified, pending, actionRequired, total }: { verified: number; pending: number; actionRequired: number; total: number }) {
  const data = [
    { name: 'Verified', value: verified, color: '#34D399' },
    { name: 'Pending', value: pending, color: '#FBBF24' },
    { name: 'Action Required', value: actionRequired, color: '#F87171' },
  ].filter((item) => item.value > 0)

  if (total === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-6 text-center text-sm text-[var(--text-muted)]">
        Add employees to start tracking KYC and TIP-403 status.
      </div>
    )
  }

  return (
    <div className="flex-1 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Team compliance</h2>
      <div className="relative mt-4" style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={2} stroke="none">
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)">
              <tspan x="50%" dy="-0.3em" fontSize="22" fontWeight="700">{total}</tspan>
              <tspan x="50%" dy="1.4em" fontSize="11" fill="var(--text-muted)">employees</tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Verified', value: verified, color: '#34D399' },
          { label: 'Pending', value: pending, color: '#FBBF24' },
          { label: 'Action Required', value: actionRequired, color: '#F87171' },
        ].map((entry) => (
          <div key={entry.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
              <span className="text-[var(--text-secondary)]">{entry.label}</span>
            </div>
            <span className="font-semibold text-[var(--text-primary)]">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: employer } = useEmployer()
  const { data: treasuryData } = useTreasury(employer?.id)
  const { data: yieldData } = useYield()
  const { data: payrollRunsData } = usePayrollRuns(employer?.id, 1, 5)
  const { data: txData, refetch: refetchTx } = useTransactions({ limit: 50 })
  const { data: complianceData } = useEmployerCompliance(employer?.id)

  const invalidatePayroll = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
    void queryClient.invalidateQueries({ queryKey: ['employer-compliance'] })
  }, [queryClient])

  const invalidatePayments = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    void refetchTx()
  }, [queryClient, refetchTx])

  usePayrollRunsRealtime(employer?.id, invalidatePayroll)
  usePaymentItemsRealtime(employer?.id, invalidatePayments)

  const recentRuns = payrollRunsData?.runs ?? []
  const latestRun = recentRuns[0]
  const treasuryBalance = treasuryData?.total_usd ?? 0
  const yieldEarned = yieldData ? Number.parseFloat(yieldData.accrued_usd) : 0
  const complianceSummary = complianceData?.summary ?? {
    verified: 0,
    pending: 0,
    actionRequired: 0,
    total: 0,
  }
  const chartData = React.useMemo(() => {
    return buildActivityData(txData?.items ?? [], yieldEarned)
  }, [txData?.items, yieldEarned])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Treasury, payroll, compliance, and yield performance in one place.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/payroll/new')}
          className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
        >
          Run Payroll
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Treasury Balance"
          value={formatCurrency(treasuryBalance)}
          rawValue={treasuryBalance}
          animateNumber
          sub={treasuryData ? `${formatCurrency(treasuryData.available_usd)} available` : 'Waiting for treasury data'}
          icon={<DollarSign className="h-4 w-4 text-[var(--accent)]" />}
          iconBg="bg-[var(--accent-subtle)]"
        />
        <MetricTile
          label="Last Payroll Run"
          value={latestRun ? formatCurrency(latestRun.total_amount) : '—'}
          sub={latestRun ? `${formatDate(latestRun.created_at)} · ${latestRun.employee_count} employees` : 'No payroll runs yet'}
          icon={<TrendingUp className="h-4 w-4 text-[var(--status-pending)]" />}
          iconBg="bg-amber-500/10"
        />
        <MetricTile
          label="Team Size"
          value= {String(complianceSummary.total)}
          sub={complianceSummary.pending > 0 ? `${complianceSummary.pending} pending KYC` : 'No pending KYC'}
          icon={<Users className="h-4 w-4 text-[var(--mono)]" />}
          iconBg="bg-blue-500/10"
        />
        <MetricTile
          label="Yield Earned"
          value={formatCurrency(yieldEarned)}
          rawValue={yieldEarned}
          animateNumber
          sub={yieldData ? `${yieldData.apy_percent.toFixed(1)}% APY · ${yieldData.yield_model.replaceAll('_', ' ')}` : 'Yield router unavailable'}
          icon={<Sparkles className="h-4 w-4 text-[var(--accent)]" />}
          iconBg="bg-[var(--accent-subtle)]"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent payroll runs</h2>
            <Link href="/dashboard/payroll" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline">
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-4">
            {recentRuns.length > 0 ? (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <PayrollRunCard
                    key={run.id}
                    id={run.id}
                    status={run.status}
                    totalAmount={run.total_amount}
                    employeeCount={run.employee_count}
                    createdAt={run.created_at}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="No payroll runs yet"
                body="Once your first payroll batch is prepared and submitted, recent runs will show up here with Tempo settlement details."
                ctaHref="/dashboard/payroll/new"
                ctaLabel="Create first payroll"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ComplianceDonut
            verified={complianceSummary.verified}
            pending={complianceSummary.pending}
            actionRequired={complianceSummary.actionRequired}
            total={complianceSummary.total}
          />
          <Button
            onClick={() => router.push('/dashboard/payroll/new')}
            className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
            size="lg"
          >
            Run Payroll
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">30-day treasury activity</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Payroll flow is derived from recorded payment items. Yield is shown on the current day when accrued.</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Deposits</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--accent)]" />Payroll</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" />Yield</span>
          </div>
        </div>

        {chartData.some((item) => item.Deposits > 0 || item.Payroll > 0 || item.Yield > 0) ? (
          <div className="mt-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barGap={2} barCategoryGap="28%">
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`}
                  width={42}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Deposits" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Payroll" fill="var(--accent)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Yield" fill="#A855F7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-10 text-center text-sm text-[var(--text-muted)]">
            Treasury activity will populate here after payroll items or yield accrual land in the workspace.
          </div>
        )}
      </div>
    </div>
  )
}
