'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Building2,
  CheckCircle,
  ChevronDown,
  CreditCard,
  Send,
  Users,
  XCircle,
} from 'lucide-react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { HyperspeedHeroBackground } from '@/components/marketing/HyperspeedHeroBackground'

function useForceDark() {
  React.useEffect(() => {
    const root = document.documentElement
    const prev = root.className
    root.classList.add('dark')
    return () => {
      root.className = prev
    }
  }, [])
}

function FadeInUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      <HyperspeedHeroBackground />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.08),transparent_26%),linear-gradient(180deg,rgba(2,6,18,0.12)_0%,rgba(2,6,18,0.16)_32%,rgba(2,6,18,0.48)_100%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        <motion.a
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          href="https://tempo.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent"
        >
          <span aria-hidden="true">⚡</span>
          Built on Tempo × Stripe Bridge
        </motion.a>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mb-6 text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl"
        >
          Pay anyone, anywhere.
          <br className="hidden md:block" /> Settle in{' '}
          <span className="text-accent">half a second.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-white/55 md:text-xl"
        >
          The global payroll platform that moves money at the speed of blockchain — with the compliance of Stripe.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/register"
            className="flex h-12 items-center justify-center rounded-xl bg-accent px-8 text-base font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Get Started Free
          </Link>
          <a
            href="#how-it-works"
            className="flex h-12 items-center justify-center rounded-xl border border-white/10 px-8 text-base font-medium text-white transition-colors hover:bg-white/5"
          >
            See how it works →
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="mb-12"
        >
          <p className="text-sm text-white/40">Trusted by teams across 40+ countries</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {['Northline', 'Atlas', 'Mercury', 'Beacon', 'Summit'].map((logo) => (
              <div
                key={logo}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/40"
              >
                {logo}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.38 }}
          className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/30 backdrop-blur-sm"
        >
          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-white/5 bg-[#0D152B] p-5 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">Treasury balance</p>
                  <p className="mt-2 text-3xl font-bold text-white">$248,420.50</p>
                </div>
                <div className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  3.7% APY
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Available', value: '$235,670' },
                  { label: 'Locked', value: '$12,750' },
                  { label: 'Yield earned', value: '$1,984' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 text-left">
              <div className="rounded-2xl border border-white/5 bg-[#101A33] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">Payroll run</p>
                <p className="mt-2 text-base font-semibold text-white">Payroll run confirmed — 0.4s</p>
                <p className="mt-1 text-sm text-white/45">47 employees paid atomically with compliance checks attached.</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-accent">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  TIP-403 clear · ISO 20022 memo encoded
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#101A33] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-white/35">Employee card</p>
                <div className="mt-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Virtual Visa</p>
                  <p className="mt-6 font-mono text-lg tracking-[0.25em] text-white/90">•••• •••• •••• 2408</p>
                  <p className="mt-3 text-xs text-white/45">Spend instantly or off-ramp to a local bank.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-14 flex justify-center"
        >
          <a href="#problem" className="text-white/20 transition-colors hover:text-white/40">
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}

function ProblemSection() {
  const stats = [
    {
      value: '$47',
      label: '$47 average cost per international wire',
      context: 'Average all-in wire cost for global payroll',
      source: 'Source: industry benchmark',
    },
    {
      value: '2–5 days',
      label: '2–5 business days to settle',
      context: 'Traditional cross-border payroll rails',
      source: 'Source: bank transfer norms',
    },
    {
      value: '6.2%',
      label: '6.2% average FX fees on transfers',
      context: 'Hidden spreads buried inside remittance flows',
      source: 'Source: World Bank remittance data',
    },
  ]

  return (
    <section id="problem" className="relative py-32">
      <div className="mx-auto max-w-5xl px-6">
        <FadeInUp>
          <p className="mb-4 text-xs font-mono uppercase tracking-widest text-accent">THE PROBLEM</p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
            International payroll is bleeding your business.
          </h2>
          <p className="mb-16 max-w-2xl text-lg text-white/50">
            The average finance team still pays around $47 to wire an international salary, waits days for settlement,
            and loses more to hidden FX spread. Remlo settles the same flow in seconds with audit-ready payment data attached.
          </p>
        </FadeInUp>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, index) => (
            <FadeInUp key={stat.label} delay={index * 0.08}>
              <div className="rounded-2xl border border-status-error/10 bg-status-error/[0.03] p-8">
                <p className="mb-3 font-mono text-4xl font-bold text-status-error">{stat.value}</p>
                <p className="mb-1 text-base font-semibold text-white">{stat.label}</p>
                <p className="text-sm text-white/40">{stat.context}</p>
                <p className="mt-3 text-[11px] text-white/25">{stat.source}</p>
              </div>
            </FadeInUp>
          ))}
        </div>

        <FadeInUp delay={0.18} className="mt-12 text-center">
          <a href="#features" className="text-lg italic text-accent transition-opacity hover:opacity-80">
            There is a better way.
          </a>
        </FadeInUp>
      </div>
    </section>
  )
}

const FEATURE_BLOCKS = [
  {
    title: 'Instant Settlement',
    body: 'Payroll runs confirm in under 0.5 seconds on Tempo, with PayrollBatcher packaging an entire team payout into one atomic TempoTransaction.',
  },
  {
    title: 'Gasless for Everyone',
    body: 'Employees never touch crypto, buy tokens, or manage wallets. Their embedded wallet is provisioned on invite, and every action is sponsored so they never think about gas.',
  },
  {
    title: 'Compliance Built In',
    body: 'Every payment is screened against OFAC sanctions lists at the protocol level, with memo metadata and policy checks attached to the payroll flow instead of bolted on after the fact.',
  },
  {
    title: 'Your Treasury Earns Yield',
    body: 'Idle payroll funds can be routed through YieldRouter into treasury-backed strategies. Keep the yield, share it with employees, or use it to offset payroll operations.',
  },
]

function FeatureVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="grid h-48 gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-white/35">
          <span>Traditional</span>
          <span>Remlo</span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-[#121B31] p-4">
            <p className="text-sm font-semibold text-white">1–5 days</p>
            <p className="mt-1 text-xs text-white/40">Bank settlement</p>
          </div>
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-sm font-semibold text-accent">0.4 seconds</p>
            <p className="mt-1 text-xs text-white/45">Confirmed on Tempo</p>
          </div>
        </div>
      </div>
    )
  }

  if (index === 1) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="w-full max-w-[280px] rounded-[28px] border border-white/10 bg-[#0D152B] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-white/35">Employee setup</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm text-white">Invite received</div>
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm text-white">PIN set</div>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm font-semibold text-accent">Visa card ready</div>
          </div>
        </div>
      </div>
    )
  }

  if (index === 2) {
    return (
      <div className="h-48 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-white/35">Compliance checklist</p>
        <div className="mt-5 space-y-3">
          {['KYC verified', 'OFAC clear', 'ISO 20022 memo attached'].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-sm text-white/80">{item}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-48 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-white/35">Yield comparison</p>
      <div className="mt-8 space-y-5">
        <div>
          <div className="flex items-center justify-between text-sm text-white/50">
            <span>Traditional bank</span>
            <span>0.5%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-white/5">
            <div className="h-full w-[14%] rounded-full bg-white/20" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>Remlo treasury</span>
            <span className="text-accent">3.7%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-white/5">
            <div className="h-full w-[72%] rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SolutionSection() {
  return (
    <section id="features" className="py-32">
      <div className="mx-auto max-w-5xl px-6">
        <FadeInUp>
          <p className="mb-4 text-xs font-mono uppercase tracking-widest text-accent">THE SOLUTION</p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Global payroll that feels like sending a Venmo.
          </h2>
          <p className="mb-16 max-w-2xl text-lg text-white/50">
            Remlo replaces multi-day payroll settlement with 0.4-second batch execution, embedded wallets, protocol-level compliance, gas sponsorship, and yield on treasury float.
          </p>
        </FadeInUp>

        <div className="space-y-6">
          {FEATURE_BLOCKS.map((feature, index) => {
            const reverse = index % 2 === 1

            return (
              <FadeInUp key={feature.title} delay={index * 0.06}>
                <div className={`flex flex-col items-center gap-8 md:flex-row ${reverse ? 'md:flex-row-reverse' : ''}`}>
                  <div className="flex-1 space-y-3">
                    <p className="text-xs font-mono uppercase tracking-[0.18em] text-accent">Feature 0{index + 1}</p>
                    <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                    <p className="leading-relaxed text-white/50">{feature.body}</p>
                  </div>
                  <div className="flex-1">
                    <FeatureVisual index={index} />
                  </div>
                </div>
              </FadeInUp>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  {
    n: '01',
    icon: Building2,
    title: 'Connect your company',
    body: 'Register, verify your business, and link your bank account through Stripe.',
  },
  {
    n: '02',
    icon: Users,
    title: 'Add your team',
    body: 'Upload a CSV or add employees one by one. They get an email invite and set up their account.',
  },
  {
    n: '03',
    icon: Send,
    title: 'Run payroll',
    body: 'Select employees, set amounts, click confirm. Payroll settles in under a second.',
  },
  {
    n: '04',
    icon: CreditCard,
    title: 'Team gets paid',
    body: 'Funds hit employee wallets instantly. They spend via Visa card or off-ramp to their local bank.',
  },
]

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-white/5 py-32">
      <div className="mx-auto max-w-5xl px-6">
        <FadeInUp>
          <p className="mb-4 text-xs font-mono uppercase tracking-widest text-accent">HOW IT WORKS</p>
          <h2 className="mb-16 text-3xl font-bold tracking-tight text-white md:text-5xl">
            From signup to first payroll in 15 minutes.
          </h2>
        </FadeInUp>

        <div className="relative hidden grid-cols-4 gap-4 md:grid">
          <div className="absolute left-[12.5%] right-[12.5%] top-8 h-px bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20" />

          {STEPS.map((step, index) => (
            <FadeInUp key={step.n} delay={index * 0.08}>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/5">
                  <step.icon className="h-6 w-6 text-accent" />
                </div>
                <p className="text-sm font-mono text-white/30">{step.n}</p>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/40">{step.body}</p>
              </div>
            </FadeInUp>
          ))}
        </div>

        <div className="space-y-6 md:hidden">
          {STEPS.map((step, index) => (
            <FadeInUp key={step.n} delay={index * 0.06}>
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/20 bg-accent/5">
                    <step.icon className="h-5 w-5 text-accent" />
                  </div>
                  {index < STEPS.length - 1 ? <div className="mt-2 w-px flex-1 bg-white/5" /> : null}
                </div>
                <div className="pb-6">
                  <p className="mb-1 text-xs font-mono text-white/30">{step.n}</p>
                  <h3 className="mb-1 text-base font-bold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/40">{step.body}</p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>

        <FadeInUp delay={0.16} className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Start your free trial →
          </Link>
        </FadeInUp>
      </div>
    </section>
  )
}

const COMPARISON_ROWS = [
  { feature: 'Settlement speed', remlo: 'Under 1 second', deel: '1–5 days', bitwage: '1–3 days', wire: '1–5 days' },
  { feature: 'Transaction cost', remlo: '< $0.01', deel: '$5–$25', bitwage: '1% fee', wire: '$25–$75' },
  { feature: 'FX fee', remlo: '0%', deel: '0.5–2%', bitwage: '0.5%', wire: '1–3%' },
  { feature: 'Visa cards for employees', remlo: true, deel: false, bitwage: false, wire: false },
  { feature: 'Yield on treasury', remlo: '3.5%+ APY', deel: false, bitwage: false, wire: false },
  { feature: 'Compliance built-in', remlo: 'On-chain', deel: 'Manual', bitwage: 'Manual', wire: 'Manual' },
  { feature: 'Coverage', remlo: '120+ countries', deel: '150+', bitwage: '100+', wire: '200+' },
  { feature: 'No crypto knowledge needed', remlo: true, deel: true, bitwage: false, wire: true },
]

function ComparisonSection() {
  return (
    <section className="border-t border-white/5 py-32">
      <div className="mx-auto max-w-5xl px-6">
        <FadeInUp>
          <p className="mb-4 text-xs font-mono uppercase tracking-widest text-accent">COMPARISON</p>
          <h2 className="mb-16 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Remlo vs the alternatives.
          </h2>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/40">Feature</th>
                  <th className="border-x border-accent/10 bg-accent/5 px-6 py-4 text-sm font-semibold">
                    <span className="text-accent">Remlo</span>
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Deel</th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Bitwage</th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Wire Transfer</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, index) => (
                  <tr key={row.feature} className={`border-b border-white/5 ${index % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-6 py-3.5 text-sm text-white/60">{row.feature}</td>
                    <td className="border-x border-accent/10 bg-accent/5 px-6 py-3.5 text-center">
                      {typeof row.remlo === 'boolean' ? (
                        row.remlo ? <CheckCircle className="mx-auto h-4 w-4 text-accent" /> : <XCircle className="mx-auto h-4 w-4 text-white/20" />
                      ) : (
                        <span className="text-sm font-semibold text-accent">{row.remlo}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof row.deel === 'boolean' ? (
                        row.deel ? <CheckCircle className="mx-auto h-4 w-4 text-white/40" /> : <XCircle className="mx-auto h-4 w-4 text-white/20" />
                      ) : (
                        <span className="text-sm text-white/40">{row.deel}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof row.bitwage === 'boolean' ? (
                        row.bitwage ? <CheckCircle className="mx-auto h-4 w-4 text-white/40" /> : <XCircle className="mx-auto h-4 w-4 text-white/20" />
                      ) : (
                        <span className="text-sm text-white/40">{row.bitwage}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof row.wire === 'boolean' ? (
                        row.wire ? <CheckCircle className="mx-auto h-4 w-4 text-white/40" /> : <XCircle className="mx-auto h-4 w-4 text-white/20" />
                      ) : (
                        <span className="text-sm text-white/40">{row.wire}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeInUp>
      </div>
    </section>
  )
}

const TESTIMONIALS = [
  {
    quote: 'We replaced a four-day cross-border payroll cycle with a flow our team finishes before standup.',
    name: 'Maya Chen',
    role: 'Finance Lead',
    company: 'Northline Labs',
  },
  {
    quote: 'The audit trail is the real unlock. Every payment lands with the metadata our finance team actually needs.',
    name: 'Daniel Okafor',
    role: 'Operations Director',
    company: 'Atlas People',
  },
  {
    quote: 'The card and bank off-ramp flow made stablecoin payroll usable for employees who never want to think about wallets.',
    name: 'Lucia Ramos',
    role: 'People Ops',
    company: 'Beacon Remote',
  },
]

function TestimonialsSection() {
  return (
    <section className="border-t border-white/5 py-32">
      <div className="mx-auto max-w-5xl px-6">
        <FadeInUp>
          <p className="mb-4 text-xs font-mono uppercase tracking-widest text-accent">SOCIAL PROOF</p>
          <h2 className="mb-12 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Operators who need payroll to move fast.
          </h2>
        </FadeInUp>

        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((item, index) => (
            <FadeInUp key={item.name} delay={index * 0.06}>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <p className="text-base leading-relaxed text-white/80">“{item.quote}”</p>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-white/40">
                    {item.role} · {item.company}
                  </p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  )
}

const PLANS = [
  {
    name: 'Starter',
    price: '0',
    period: '/mo',
    description: 'For small teams getting started with global payroll.',
    features: ['Up to 10 employees', 'Manual payroll runs', 'Embedded wallets', 'Basic compliance', 'Visa cards'],
    cta: 'Start Free',
    href: '/register',
    accent: false,
  },
  {
    name: 'Growth',
    price: '199',
    period: '/mo',
    description: 'For scaling companies running recurring international payroll.',
    features: ['Up to 100 employees', 'Scheduled payroll', 'Yield routing', 'AI compliance screening', 'Salary streaming', 'API access'],
    cta: 'Start Free Trial',
    href: '/register',
    accent: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For enterprises needing custom controls, integrations, and response guarantees.',
    features: ['Unlimited employees', 'Custom contracts', 'Dedicated support', 'SLA', 'Audit logs', 'Custom compliance rules'],
    cta: 'Contact Sales',
    href: '/register',
    accent: false,
  },
]

function PricingSection() {
  return (
    <section id="pricing" className="border-t border-white/5 py-32">
      <div className="mx-auto max-w-5xl px-6">
        <FadeInUp>
          <p className="mb-4 text-xs font-mono uppercase tracking-widest text-accent">PRICING</p>
          <h2 className="mb-16 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Simple, transparent pricing.
          </h2>
          <p className="mb-16 max-w-2xl text-lg text-white/50">
            SaaS plans cover your payroll platform. AI agent and machine-payment actions stay pay-per-call through HTTP 402, so you only pay when software actually executes work.
          </p>
        </FadeInUp>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan, index) => (
            <FadeInUp key={plan.name} delay={index * 0.07}>
              <div
                className={`relative flex h-full flex-col rounded-2xl p-6 ${
                  plan.accent ? 'border-2 border-accent/40 bg-accent/5' : 'border border-white/5 bg-white/[0.02]'
                }`}
              >
                {plan.badge ? (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground">
                    {plan.badge}
                  </div>
                ) : null}
                <div className="mb-6">
                  <p className="mb-1 text-sm font-semibold text-white/60">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    {plan.price !== 'Custom' ? <span className="text-xl text-white/40">$</span> : null}
                    <span className={`font-mono text-4xl font-bold ${plan.accent ? 'text-accent' : 'text-white'}`}>{plan.price}</span>
                    {plan.period ? <span className="text-sm text-white/40">{plan.period}</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-white/40">{plan.description}</p>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/60">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 ${
                    plan.accent ? 'bg-accent text-accent-foreground' : 'border border-white/10 text-white hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </FadeInUp>
          ))}
        </div>

        <FadeInUp delay={0.2}>
          <div className="mt-8 text-center text-sm text-white/45">
            All plans include unlimited payroll transactions at &lt;$0.01 each. No hidden fees.
          </div>
        </FadeInUp>
      </div>
    </section>
  )
}

const FAQS = [
  {
    q: 'Is Remlo safe for my employees?',
    a: 'Yes. Stripe Bridge operates the regulated fiat layer for balances, off-ramping, and card issuance, while Tempo gives every payroll movement a fast, auditable settlement record. Employees get a familiar USD experience without touching crypto primitives directly.',
  },
  {
    q: 'Do employees need to understand crypto?',
    a: 'No. Employees sign up with email or SMS, see USD balances, and use a Visa card or local bank transfer flow. Their embedded wallet is provisioned automatically in the background, so they never manage seed phrases, MetaMask, gas, or tokens.',
  },
  {
    q: 'How long does settlement take?',
    a: 'Tempo uses Simplex BFT consensus with 0.4-second finality. PayrollBatcher can batch all salaries into a single TempoTransaction, so an entire payroll run settles in one confirmed block.',
  },
  {
    q: 'Is Remlo custodial?',
    a: 'Remlo does not directly custody employee funds. Employee wallets are provisioned through Privy, while fiat balances, cards, and off-ramp flows are handled through Stripe Bridge and its regulated banking stack.',
  },
  {
    q: 'What countries and payout rails are supported?',
    a: 'Remlo is designed for payroll across 47+ countries. Payroll is denominated in USD, and employees can move funds out through rails like ACH in the US, SEPA in Europe, SPEI in Mexico, and PIX in Brazil, with card-based spend where Bridge card issuance is available.',
  },
  {
    q: 'How does the 3.7% APY work?',
    a: 'Idle treasury funds can be routed through YieldRouter into yield-bearing reserve strategies backed by short-duration US Treasury exposure. Employers can keep that yield, share it with employees, or use it to offset payroll operating costs.',
  },
  {
    q: 'What is an AI agent payroll run?',
    a: 'Remlo exposes MPP-protected payroll actions over HTTP 402, so an AI agent can check compliance, inspect treasury readiness, and execute payroll as paid API actions instead of using long-lived API keys or manual ops flows.',
  },
  {
    q: 'What happens if a transaction fails?',
    a: 'Tempo’s Simplex BFT consensus means transactions either finalize in 0.5s or are rejected immediately — no stuck pending states. Failed transactions are automatically retried or flagged with full details.',
  },
  {
    q: 'Is Remlo compliant with labor laws?',
    a: 'Remlo handles the payment rails. You remain responsible for labor law compliance in each jurisdiction. We recommend structuring stablecoin payroll as an optional settlement preference for employees.',
  },
]

function FAQSection() {
  const [open, setOpen] = React.useState<number | null>(null)

  return (
    <section className="border-t border-white/5 py-32">
      <div className="mx-auto max-w-3xl px-6">
        <FadeInUp>
          <p className="mb-4 text-xs font-mono uppercase tracking-widest text-accent">FAQ</p>
          <h2 className="mb-12 text-3xl font-bold tracking-tight text-white md:text-4xl">Common questions.</h2>
        </FadeInUp>

        <div className="space-y-1">
          {FAQS.map((faq, index) => (
            <FadeInUp key={faq.q} delay={index * 0.04}>
              <div className="border-b border-white/5 last:border-0">
                <button
                  onClick={() => setOpen(open === index ? null : index)}
                  className="group flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-sm font-medium text-white transition-colors group-hover:text-accent">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${
                      open === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: open === index ? 'auto' : 0, opacity: open === index ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="pb-4 text-sm leading-relaxed text-white/50">{faq.a}</p>
                </motion.div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  useForceDark()

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <ComparisonSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <PublicFooter />
    </div>
  )
}
