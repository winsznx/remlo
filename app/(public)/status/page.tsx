import * as React from 'react'
import { CheckCircle2, Clock3, ShieldCheck, Wallet } from 'lucide-react'

export const metadata = { title: 'Status | Remlo' }

const SYSTEMS = [
  {
    label: 'Tempo settlement',
    status: 'Operational',
    note: 'Payroll settlement, sponsored transactions, and onchain reads are flowing normally.',
    icon: Wallet,
  },
  {
    label: 'Bridge fiat rails',
    status: 'Operational',
    note: 'Virtual accounts, KYC handoffs, card issuance, and off-ramp orchestration are available.',
    icon: ShieldCheck,
  },
  {
    label: 'MPP machine access',
    status: 'Operational',
    note: 'HTTP 402 challenges, session endpoints, and SSE balance streams are responding as expected.',
    icon: CheckCircle2,
  },
]

export default function StatusPage() {
  return (
    <div className="space-y-14">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">System status</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)]">Operational across payroll, compliance, and payouts.</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--text-secondary)]">
          Remlo publishes product health here for employers, employees, and integration partners monitoring core payroll infrastructure.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {SYSTEMS.map((system) => (
          <article key={system.label} className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                <system.icon className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                {system.status}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{system.label}</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{system.note}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-muted)]">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Incident communication</h2>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              When any partner dependency degrades, Remlo updates this page first and mirrors major incidents to customer support. For urgent payroll questions, contact <span className="font-medium text-[var(--text-primary)]">support@remlo.xyz</span>.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
