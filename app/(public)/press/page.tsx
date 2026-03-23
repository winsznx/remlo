import * as React from 'react'
import { ArrowUpRight, Download, Newspaper, PlayCircle } from 'lucide-react'

export const metadata = { title: 'Press | Remlo' }

const PRESS_ITEMS = [
  {
    label: 'Company boilerplate',
    detail: 'Remlo is borderless enterprise payroll on Tempo L1 with Bridge fiat rails, embedded wallets, and machine-paid APIs.',
  },
  {
    label: 'Key proof points',
    detail: 'Instant settlement, TIP-20 ISO 20022 memos, TIP-403 compliance, StreamVesting salary accrual, and Bridge-issued Visa cards.',
  },
  {
    label: 'Press contact',
    detail: 'hello@remlo.xyz for interviews, product demos, partnership announcements, and media requests.',
  },
]

export default function PressPage() {
  return (
    <div className="space-y-14">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Press</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)]">Company facts, launch language, and demo context for media.</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--text-secondary)]">
          This page gives reporters, ecosystem teams, and event organizers the current language Remlo uses to describe the product and the infrastructure behind it.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {PRESS_ITEMS.map((item) => (
          <article key={item.label} className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{item.label}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <PlayCircle className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Demo summary</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            The live Remlo demo shows an employer funding treasury, preparing payroll, executing on Tempo, and an employee receiving funds, viewing decoded memo data, and moving money to spend or off-ramp.
          </p>
          <a
            href="/contact"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Request a guided demo
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </article>

        <article className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Newspaper className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Media kit</h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            Logo assets and current brand marks are available on request. Until a full media kit is published, use the hosted product preview and contact the team for approved artwork.
          </p>
          <a
            href="/privy-logo.png"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Download current brand mark
            <Download className="h-4 w-4" />
          </a>
        </article>
      </section>
    </div>
  )
}
