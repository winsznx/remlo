'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CheckCircle2, Clock, Mail, MailX, TrendingUp, Users } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

/**
 * /admin/waitlist — operator dashboard for the launch waitlist.
 *
 * Polls /api/admin/waitlist every 60s. Shows totals, source attribution,
 * 60-day signup vs confirmation series, cumulative confirmed curve, and
 * the most recent 25 signups. Confirm rate excludes the last 24h so it
 * doesn't punish today's pending confirmations.
 */

interface AdminWaitlistResponse {
  totals: {
    total: number
    confirmed: number
    unconfirmed: number
    unsubscribed: number
    confirmRate: number
  }
  bySource: Record<string, { total: number; confirmed: number }>
  daily: Array<{ date: string; signups: number; confirmations: number }>
  cumulative: Array<{ date: string; total: number }>
  recent: Array<{
    email: string
    source: string
    confirmed_at: string | null
    unsubscribed_at: string | null
    created_at: string
  }>
  generatedAt: string
}

export default function AdminWaitlistPage() {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  const { data, isLoading, error } = useQuery<AdminWaitlistResponse>({
    queryKey: ['admin', 'waitlist'],
    queryFn: () => fetchJson('/api/admin/waitlist'),
    enabled: ready && authenticated,
    refetchInterval: 60_000,
    retry: false,
  })

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
        <p className="text-sm text-red-400">
          Could not load waitlist stats. {error instanceof Error ? error.message : 'Unknown error.'}
        </p>
      </div>
    )
  }
  if (!data) return null

  const sources = Object.entries(data.bySource)
    .map(([source, counts]) => ({ source, ...counts }))
    .sort((a, b) => b.total - a.total)

  const confirmRatePct = (data.totals.confirmRate * 100).toFixed(1)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Waitlist"
        description="Launch waitlist signups, confirmations, and source attribution. Polls every 60 seconds."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Stat icon={Users} label="Total signups" value={data.totals.total} />
        <Stat
          icon={CheckCircle2}
          label="Confirmed"
          value={data.totals.confirmed}
          accent="text-emerald-400"
        />
        <Stat
          icon={Clock}
          label="Pending confirm"
          value={data.totals.unconfirmed}
          accent="text-amber-400"
        />
        <Stat
          icon={MailX}
          label="Unsubscribed"
          value={data.totals.unsubscribed}
          accent="text-[var(--text-muted)]"
        />
        <Stat
          icon={TrendingUp}
          label="Confirm rate (24h+)"
          value={`${confirmRatePct}%`}
          accent="text-[var(--accent)]"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Daily signups vs confirmations
            </h2>
            <p className="text-[10px] text-[var(--text-muted)]">last 60 days</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={fmtTickDate} fontSize={10} stroke="var(--text-muted)" />
              <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={fmtTooltipDate}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="signups" fill="#fbbf24" name="Signups" />
              <Bar dataKey="confirmations" fill="#10b981" name="Confirmations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Cumulative confirmed
            </h2>
            <p className="text-[10px] text-[var(--text-muted)]">last 60 days</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.cumulative} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={fmtTickDate} fontSize={10} stroke="var(--text-muted)" />
              <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={fmtTooltipDate}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#confirmedGrad)"
                name="Confirmed (cumulative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Source attribution
          </h2>
          {sources.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No signups yet.</p>
          ) : (
            <ul className="space-y-3">
              {sources.map((s) => {
                const pct = data.totals.total > 0 ? (s.total / data.totals.total) * 100 : 0
                return (
                  <li key={s.source}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[var(--text-primary)]">{s.source}</span>
                      <span className="text-[var(--text-muted)]">
                        {s.total} · <span className="text-emerald-400">{s.confirmed} confirmed</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="border-b border-[var(--border-default)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Recent signups
            </h2>
          </div>
          {data.recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[var(--text-muted)]">
              No signups yet.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border-default)]">
              {data.recent.map((row) => {
                const status = row.unsubscribed_at
                  ? { label: 'unsubscribed', tone: 'text-[var(--text-muted)]', Icon: MailX }
                  : row.confirmed_at
                    ? { label: 'confirmed', tone: 'text-emerald-400', Icon: CheckCircle2 }
                    : { label: 'pending', tone: 'text-amber-400', Icon: Mail }
                const StatusIcon = status.Icon
                return (
                  <li key={row.email + row.created_at} className="px-5 py-3 flex items-center gap-3">
                    <StatusIcon className={`h-4 w-4 shrink-0 ${status.tone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--text-primary)] truncate">{row.email}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {fmtRelative(row.created_at)} · source: {row.source}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-[0.14em] ${status.tone}`}>
                      {status.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent = 'text-[var(--text-primary)]',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
        <Icon className="h-4 w-4 text-[var(--text-muted)]" />
      </div>
      <p className={`mt-4 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  )
}

function fmtTickDate(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function fmtTooltipDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
