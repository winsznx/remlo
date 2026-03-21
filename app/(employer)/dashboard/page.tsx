'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  DollarSign,
  Users,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PayrollRunCard } from '@/components/payroll/PayrollRunCard'
import { useYield, useTransactions } from '@/lib/hooks/useDashboard'
import { useEmployer, usePayrollRunsRealtime, usePaymentItemsRealtime } from '@/lib/hooks/useEmployer'
import { useQueryClient } from '@tanstack/react-query'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  iconBg: string
  animate?: boolean
  rawValue?: number
}

// ─── Animated Number ─────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const motionVal = useMotionValue(0)
  const display = useTransform(motionVal, (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v),
  )
  React.useEffect(() => {
    const controls = animate(motionVal, value, { duration: 1.2, ease: 'easeOut' })
    return controls.stop
  }, [value, motionVal])
  return (
    <span>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

// ─── Metric Tile ─────────────────────────────────────────────────────────────

function MetricTile({ label, value, sub, icon, iconBg, animate: doAnimate, rawValue }: MetricTileProps) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="number-xl text-[var(--text-primary)]">
          {doAnimate && rawValue !== undefined ? (
            <AnimatedNumber value={rawValue} prefix="$" />
          ) : (
            value
          )}
        </p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Mock data (replaced in T35 with TanStack Query) ─────────────────────────

const MOCK_RUNS = [
  { id: 'run-1', status: 'completed' as const, totalAmount: 52500.0, employeeCount: 28, createdAt: '2026-03-15T10:00:00Z' },
  { id: 'run-2', status: 'completed' as const, totalAmount: 52500.0, employeeCount: 28, createdAt: '2026-02-15T09:45:00Z' },
  { id: 'run-3', status: 'completed' as const, totalAmount: 51200.0, employeeCount: 27, createdAt: '2026-01-15T10:00:00Z' },
  { id: 'run-4', status: 'failed' as const, totalAmount: 51200.0, employeeCount: 27, createdAt: '2025-12-15T10:00:00Z' },
  { id: 'run-5', status: 'completed' as const, totalAmount: 49800.0, employeeCount: 26, createdAt: '2025-11-15T10:00:00Z' },
]

const MOCK_COMPLIANCE = [
  { name: 'Verified', value: 23, color: '#34D399' },
  { name: 'Pending', value: 4, color: '#FBBF24' },
  { name: 'Action Required', value: 1, color: '#F87171' },
]

// 30 days of mock treasury activity
function buildBarData() {
  const data = []
  const now = new Date('2026-03-20')
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    data.push({
      date: label,
      Deposits: i % 14 === 0 ? 60000 : i % 7 === 0 ? 25000 : 0,
      Payroll: i % 30 === 14 || i % 30 === 0 ? 52500 : 0,
      Yield: Math.round(180 / 30),
    })
  }
  return data
}

const BAR_DATA = buildBarData()

// ─── Custom bar chart tooltip ─────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3 text-xs shadow-lg space-y-1.5">
      <p className="font-medium text-[var(--text-secondary)] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[var(--text-secondary)]">{p.name}</span>
          </div>
          <span className="font-mono font-semibold text-[var(--text-primary)]">
            ${p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Custom donut label ───────────────────────────────────────────────────────

function DonutCenter({ total }: { total: number }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)">
      <tspan x="50%" dy="-0.3em" fontSize="22" fontWeight="700" fontFamily="var(--font-geist-sans)">
        {total}
      </tspan>
      <tspan x="50%" dy="1.4em" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-geist-sans)">
        employees
      </tspan>
    </text>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: employer } = useEmployer()
  const { data: yieldData } = useYield()
  const { data: txData, refetch: refetchTx } = useTransactions({ limit: 30 })

  // Supabase realtime invalidation
  const invalidatePayroll = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
  }, [queryClient])
  const invalidatePayments = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    void refetchTx()
  }, [queryClient, refetchTx])

  usePayrollRunsRealtime(employer?.id, invalidatePayroll)
  usePaymentItemsRealtime(employer?.id, invalidatePayments)

  // Merge real yield data over mock fallback
  const displayYieldApy = yieldData?.apy_percent ?? 3.7
  const displayYieldEarned = yieldData ? parseFloat(yieldData.accrued_usd) : 184.5

  const totalEmployees = MOCK_COMPLIANCE.reduce((s, c) => s + c.value, 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Good morning — here&apos;s your payroll overview.
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/payroll/new')}
          className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 font-semibold"
          size="lg"
        >
          Run Payroll
        </Button>
      </div>

      {/* ── Row 1: 4 Metric Tiles ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Treasury Balance"
          value="$60,000.00"
          rawValue={60000}
          sub="Available on-chain"
          animate
          icon={<DollarSign className="h-4 w-4 text-[var(--accent)]" />}
          iconBg="bg-[var(--accent-subtle)]"
        />
        <MetricTile
          label="Last Payroll Run"
          value="$52,500"
          sub="Mar 15 · 28 employees"
          icon={<TrendingUp className="h-4 w-4 text-[var(--status-pending)]" />}
          iconBg="bg-amber-500/10"
        />
        <MetricTile
          label="Team Size"
          value="28"
          sub={`${MOCK_COMPLIANCE[1].value} pending KYC`}
          icon={<Users className="h-4 w-4 text-[var(--mono)]" />}
          iconBg="bg-blue-500/10"
        />
        <MetricTile
          label="Yield Earned (Mar)"
          value={`$${displayYieldEarned.toFixed(2)}`}
          rawValue={displayYieldEarned}
          sub={`${displayYieldApy.toFixed(1)}% APY · employer keeps`}
          animate
          icon={<Sparkles className="h-4 w-4 text-[var(--accent)]" />}
          iconBg="bg-[var(--accent-subtle)]"
        />
      </div>

      {/* ── Row 2: Payroll Runs + Compliance ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2/3: Recent Payroll Runs */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Payroll Runs</h2>
            <Link
              href="/dashboard/payroll"
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {MOCK_RUNS.map((run) => (
              <PayrollRunCard
                key={run.id}
                {...run}
                className="rounded-none border-0 border-b-0"
              />
            ))}
          </div>
          <div className="px-5 py-3 border-t border-[var(--border-default)]">
            <Link
              href="/dashboard/payroll"
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              View all payroll runs <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Right 1/3: Compliance donut + Run Payroll */}
        <div className="flex flex-col gap-4">
          {/* Compliance Donut */}
          <div className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Team Compliance</h2>
            <div className="relative" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MOCK_COMPLIANCE}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {MOCK_COMPLIANCE.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <DonutCenter total={totalEmployees} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="space-y-1.5">
              {MOCK_COMPLIANCE.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-[var(--text-secondary)]">{item.name}</span>
                  </div>
                  <span className="font-semibold text-[var(--text-primary)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Run Payroll CTA */}
          <Button
            onClick={() => router.push('/dashboard/payroll/new')}
            className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 font-semibold"
            size="lg"
          >
            Run Payroll
          </Button>
        </div>
      </div>

      {/* ── Row 3: 30-Day Treasury Activity ────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">30-Day Treasury Activity</h2>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Deposits
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              Payroll
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Yield
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={BAR_DATA} barGap={2} barCategoryGap="30%">
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
              tickFormatter={(v: number) => v >= 1000 ? `$${v / 1000}k` : `$${v}`}
              width={40}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="Deposits" fill="#3B82F6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Payroll" fill="var(--accent)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Yield" fill="#A855F7" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
