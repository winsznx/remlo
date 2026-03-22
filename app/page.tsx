'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { RemloLogo } from '@/components/brand/RemloLogo'
import { PublicNavbar } from '@/components/layout/PublicNavbar'

// ─── Force dark mode on landing page ─────────────────────────────────────────
// Landing page is always dark regardless of user system preference.
// We set the class directly on mount.

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

// ─── Animated number counter ──────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1200 }: {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [displayed, setDisplayed] = React.useState(0)

  React.useEffect(() => {
    if (!inView) return
    const controls = animate(count, value, { duration: duration / 1000, ease: 'easeOut' })
    const unsubscribe = rounded.on('change', (v) => setDisplayed(v))
    return () => { controls.stop(); unsubscribe() }
  }, [inView, count, rounded, value, duration])

  return <span ref={ref}>{prefix}{displayed}{suffix}</span>
}

// ─── Fade-in-up on scroll ─────────────────────────────────────────────────────

function FadeInUp({ children, delay = 0, className }: {
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

// ─── Mesh gradient (animated) ─────────────────────────────────────────────────

function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Orb 1 — emerald */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(52,211,153,0.12) 0%, transparent 70%)',
          top: '-200px',
          left: '-100px',
        }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, 40, -30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Orb 2 — indigo */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(99,102,241,0.10) 0%, transparent 70%)',
          top: '100px',
          right: '-150px',
        }}
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 60, -20, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      {/* Orb 3 — subtle teal */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(16,185,129,0.08) 0%, transparent 70%)',
          bottom: '-100px',
          left: '40%',
        }}
        animate={{
          x: [0, 40, -60, 0],
          y: [0, -30, 50, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
    </div>
  )
}

// ─── Section: Hero ────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <MeshGradient />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-accent text-xs font-medium mb-8"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Now live on Tempo Moderato · AI-native payroll
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.05] mb-6"
        >
          Pay anyone, anywhere.{' '}
          <br className="hidden md:block" />
          Settle in{' '}
          <span className="text-accent">half a second.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10"
        >
          AI-native global payroll on Tempo. Compliance screening, gas sponsorship,
          and salary streaming — fully abstracted from your team. Employees never touch crypto.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          <Link
            href="/register"
            className="h-12 px-8 flex items-center justify-center rounded-xl bg-accent text-accent-foreground text-base font-bold hover:opacity-90 active:opacity-80 transition-opacity"
          >
            Start for free
          </Link>
          <a
            href="#how-it-works"
            className="h-12 px-8 flex items-center justify-center rounded-xl border border-white/10 text-white text-base font-medium hover:bg-white/5 transition-colors"
          >
            See how it works
          </a>
        </motion.div>

        {/* Hero stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-3 gap-4 max-w-sm mx-auto"
        >
          {[
            { value: 0.4, suffix: 's', label: 'settlement' },
            { value: 0.01, prefix: '$', label: 'per transaction' },
            { value: 47, suffix: '+', label: 'countries' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-xl font-bold text-white font-mono tabular-nums">
                {stat.prefix ?? ''}{stat.value}{stat.suffix ?? ''}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-16 flex justify-center"
        >
          <a href="#problem" className="text-white/20 hover:text-white/40 transition-colors">
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section: Problem ─────────────────────────────────────────────────────────

function ProblemSection() {
  const stats = [
    {
      value: 47,
      prefix: '$',
      label: 'Average wire transfer cost',
      context: 'per international payment',
      color: 'text-status-error',
    },
    {
      value: 4,
      suffix: ' days',
      label: 'Average settlement time',
      context: 'SWIFT cross-border',
      color: 'text-status-error',
    },
    {
      value: 6.2,
      suffix: '%',
      label: 'Hidden FX fees',
      context: 'buried in exchange rates',
      color: 'text-status-error',
    },
  ]

  return (
    <section id="problem" className="py-32 relative">
      <div className="max-w-5xl mx-auto px-6">
        <FadeInUp>
          <p className="text-xs font-mono text-accent tracking-widest uppercase mb-4">The problem</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Cross-border payroll is{' '}
            <span className="text-status-error">broken.</span>
          </h2>
          <p className="text-lg text-white/50 max-w-xl mb-16">
            The average CFO paid $47 to wire a salary to a contractor last week. It took 4 days.
            Remlo settled the same payment in 0.4 seconds for $0.01.
          </p>
        </FadeInUp>

        <div className="grid md:grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <FadeInUp key={stat.label} delay={i * 0.08}>
              <div className="rounded-2xl border border-status-error/10 bg-status-error/[0.03] p-8">
                <p className={`text-4xl font-bold font-mono tabular-nums mb-3 ${stat.color}`}>
                  <AnimatedNumber
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </p>
                <p className="text-base font-semibold text-white mb-1">{stat.label}</p>
                <p className="text-sm text-white/40">{stat.context}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section: Solution ────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: 'Embedded wallets',
    body: 'Every employee gets a non-custodial wallet provisioned on invite. No seed phrases, no MetaMask. Employees see USD, not USDC.',
    icon: '⬡',
    image: '/images/landing/image-2.png'
  },
  {
    title: 'AI-native compliance',
    body: 'TIP-403 policy registry gates every payment. Compliance screening runs in parallel with payroll — zero added latency.',
    icon: '⬡',
    image: '/images/landing/image-3.png'
  },
  {
    title: 'Real-time salary streaming',
    body: 'StreamVesting accrues salary per-second on-chain. Employees can claim earnings before payday. No waiting 30 days.',
    icon: '⬡',
    image: '/images/landing/image-4.png'
  },
  {
    title: 'Gas-sponsored transactions',
    body: 'Employers pre-deposit a gas budget. Every employee action — receiving salary, off-ramping, card spend — is gasless.',
    icon: '⬡',
    image: '/images/landing/image-5.png'
  },
]

function SolutionSection() {
  return (
    <section id="product" className="py-32">
      <div className="max-w-5xl mx-auto px-6">
        <FadeInUp>
          <p className="text-xs font-mono text-accent tracking-widest uppercase mb-4">The solution</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Payroll for the{' '}
            <span className="text-accent">onchain era.</span>
          </h2>
          <p className="text-lg text-white/50 max-w-xl mb-16">
            Remlo replaces the SWIFT wire with a 0.4-second on-chain batch. Your team pays out.
            Your employees receive. No bank integration required.
          </p>
        </FadeInUp>

        <div className="space-y-6">
          {FEATURES.map((f, i) => {
            const isEven = i % 2 === 0
            return (
              <FadeInUp key={f.title} delay={i * 0.06}>
                <div className={`flex flex-col md:flex-row gap-8 items-center ${isEven ? '' : 'md:flex-row-reverse'}`}>
                  {/* Text side */}
                  <div className="flex-1 space-y-3">
                    <div className="h-10 w-10 rounded-xl border border-accent/20 bg-accent/5 flex items-center justify-center text-accent text-xl">
                      {f.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white">{f.title}</h3>
                    <p className="text-white/50 leading-relaxed">{f.body}</p>
                  </div>
                  {/* Visual side */}
                  <div className="flex-1 h-40 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center overflow-hidden">
                    <Image src={f.image} alt={f.title} width={500} height={160} className="w-full h-full object-cover" />
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

// ─── Section: How It Works ────────────────────────────────────────────────────

const STEPS = [
  { n: '01', title: 'Deposit treasury', body: 'Fund your payroll treasury in USD via bank wire. Funds convert to pathUSD on Tempo, accruing 3.7% APY.' },
  { n: '02', title: 'Invite your team', body: 'Upload a CSV or add employees manually. Each employee receives an invite link and a gasless embedded wallet.' },
  { n: '03', title: 'Run payroll', body: 'One click — or let an AI agent do it. Compliance is checked, batch calldata is built, Privy signs the tx.' },
  { n: '04', title: 'Employees receive instantly', body: '0.4 second finality. ISO 20022 memo on every payment. Employees can spend on Visa or off-ramp to their bank.' },
]

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-32 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <FadeInUp>
          <p className="text-xs font-mono text-accent tracking-widest uppercase mb-4">How it works</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-16">
            From deposit to payday{' '}
            <span className="text-accent">in 4 steps.</span>
          </h2>
        </FadeInUp>

        {/* Desktop: horizontal with connecting lines */}
        <div className="hidden md:grid grid-cols-4 gap-4 relative">
          {/* Connecting line */}
          <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20" />

          {STEPS.map((step, i) => (
            <FadeInUp key={step.n} delay={i * 0.08}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl border border-accent/20 bg-accent/5 flex items-center justify-center relative z-10">
                  <span className="text-xl font-bold text-accent font-mono">{step.n}</span>
                </div>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{step.body}</p>
              </div>
            </FadeInUp>
          ))}
        </div>

        {/* Mobile: vertical */}
        <div className="md:hidden space-y-6">
          {STEPS.map((step, i) => (
            <FadeInUp key={step.n} delay={i * 0.06}>
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-xl border border-accent/20 bg-accent/5 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-accent font-mono">{step.n}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="flex-1 w-px bg-white/5 mt-2" />}
                </div>
                <div className="pb-6">
                  <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{step.body}</p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section: Comparison table ────────────────────────────────────────────────

const COMPARISON_ROWS = [
  { feature: 'Settlement time', remlo: '0.4 seconds', swift: '2–5 days', wise: '1–2 days' },
  { feature: 'Per transaction cost', remlo: '$0.01', swift: '$25–47', wise: '$3–8' },
  { feature: 'FX markup', remlo: '0%', swift: '2–5%', wise: '0.4–1.5%' },
  { feature: 'Embedded wallets', remlo: true, swift: false, wise: false },
  { feature: 'AI agent payroll', remlo: true, swift: false, wise: false },
  { feature: 'Salary streaming', remlo: true, swift: false, wise: false },
  { feature: 'Compliance registry (TIP-403)', remlo: true, swift: false, wise: false },
  { feature: 'Visa card for employees', remlo: true, swift: false, wise: true },
]

function ComparisonSection() {
  return (
    <section className="py-32 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <FadeInUp>
          <p className="text-xs font-mono text-accent tracking-widest uppercase mb-4">Comparison</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-16">
            Stack up against the{' '}
            <span className="text-white/40">old guard.</span>
          </h2>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-sm text-white/40 font-medium">Feature</th>
                  <th className="px-6 py-4 text-sm font-semibold bg-accent/5 border-x border-accent/10">
                    <span className="text-accent">Remlo</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-accent/10 text-accent font-normal">Recommended</span>
                  </th>
                  <th className="px-6 py-4 text-sm text-white/40 font-medium">SWIFT</th>
                  <th className="px-6 py-4 text-sm text-white/40 font-medium">Wise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-6 py-3.5 text-sm text-white/60">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center bg-accent/5 border-x border-accent/10">
                      {typeof row.remlo === 'boolean' ? (
                        row.remlo
                          ? <CheckCircle className="h-4 w-4 text-accent mx-auto" />
                          : <XCircle className="h-4 w-4 text-white/20 mx-auto" />
                      ) : (
                        <span className="text-sm font-semibold text-accent">{row.remlo}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof row.swift === 'boolean' ? (
                        <XCircle className="h-4 w-4 text-white/20 mx-auto" />
                      ) : (
                        <span className="text-sm text-white/40">{row.swift}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof row.wise === 'boolean' ? (
                        row.wise
                          ? <CheckCircle className="h-4 w-4 text-white/40 mx-auto" />
                          : <XCircle className="h-4 w-4 text-white/20 mx-auto" />
                      ) : (
                        <span className="text-sm text-white/40">{row.wise}</span>
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

// ─── Section: Pricing ─────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Starter',
    price: '0',
    period: '/mo',
    description: 'For small teams getting started with crypto payroll.',
    features: ['Up to 10 employees', 'Manual payroll runs', 'Embedded wallets', 'Basic compliance', 'Email support'],
    cta: 'Start free',
    href: '/register',
    accent: false,
  },
  {
    name: 'Growth',
    price: '199',
    period: '/mo',
    description: 'For scaling companies with global payroll needs.',
    features: ['Unlimited employees', 'Automated payroll scheduling', 'AI compliance screening', 'Salary streaming', 'Visa cards for employees', 'Priority support', 'API access'],
    cta: 'Start trial',
    href: '/register',
    accent: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For enterprises needing custom SLAs and integrations.',
    features: ['Everything in Growth', 'Custom compliance rules', 'Dedicated account manager', 'SLA guarantees', 'SAML SSO', 'Audit logs'],
    cta: 'Contact sales',
    href: '/register',
    accent: false,
  },
]

function PricingSection() {
  return (
    <section id="pricing" className="py-32 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <FadeInUp>
          <p className="text-xs font-mono text-accent tracking-widest uppercase mb-4">Pricing</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Transparent pricing.{' '}
            <span className="text-accent">No surprises.</span>
          </h2>
          <p className="text-lg text-white/50 mb-16">
            No per-transaction fees on the SaaS tier. AI agent API access is pay-per-call via HTTP 402.
          </p>
        </FadeInUp>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => (
            <FadeInUp key={plan.name} delay={i * 0.07}>
              <div className={`relative rounded-2xl p-6 flex flex-col h-full ${
                plan.accent
                  ? 'border-2 border-accent/40 bg-accent/5'
                  : 'border border-white/5 bg-white/[0.02]'
              }`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-white/60 mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    {plan.price !== 'Custom' && <span className="text-white/40 text-xl">$</span>}
                    <span className={`text-4xl font-bold ${plan.accent ? 'text-accent' : 'text-white'} font-mono`}>
                      {plan.price}
                    </span>
                    {plan.period && <span className="text-white/40 text-sm">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-white/40 mt-2">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`flex items-center justify-center h-11 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 ${
                    plan.accent
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-white/10 text-white hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </FadeInUp>
          ))}
        </div>

        <FadeInUp delay={0.2}>
          <div className="mt-8 p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">API Access (MPP pricing)</p>
              <p className="text-xs text-white/40 mt-0.5">Pay-per-call for AI agents and third-party integrations</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span>Yield rates: <span className="text-accent font-mono">$0.01</span></span>
              <span>Payroll execute: <span className="text-accent font-mono">$1.00</span></span>
              <span>Compliance check: <span className="text-accent font-mono">$0.05</span></span>
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  )
}

// ─── Section: FAQ ─────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Do employees need to understand crypto?',
    a: 'No. Employees see USD balances and a Visa card. The embedded wallet is provisioned automatically — no seed phrases, no MetaMask, no gas. Crypto is entirely abstracted away.',
  },
  {
    q: 'What countries are supported?',
    a: 'Remlo supports 47+ countries for payroll via Bridge. Visa prepaid debit cards are available in Latin America today (Argentina, Colombia, Mexico, Peru, Chile) with EU and Asia expanding.',
  },
  {
    q: 'How does the 3.7% APY work?',
    a: 'Idle treasury funds are routed to yield-bearing strategies via YieldRouter. The default strategy earns ~3.7% APY from US Treasuries. Employers can choose to keep the yield, pass it to employees, or split 50/50.',
  },
  {
    q: 'What is an AI agent payroll run?',
    a: 'The MPP API lets autonomous AI agents run payroll on behalf of employers. An agent can check compliance, verify treasury balance, and submit a payroll batch — paying $1.00 via HTTP 402 for the execution. No API keys, no subscriptions.',
  },
  {
    q: 'How long does settlement take?',
    a: 'Tempo uses Simplex BFT consensus with 0.4-second finality. PayrollBatcher batches all payments into a single TempoTransaction, so 47 employees are paid simultaneously in one 0.4-second block.',
  },
  {
    q: 'Is Remlo custodial?',
    a: 'No. Employee wallets are non-custodial, provisioned via Privy. Remlo never holds employee funds. Employer treasury funds are secured in the audited PayrollTreasury smart contract.',
  },
]

function FAQSection() {
  const [open, setOpen] = React.useState<number | null>(null)

  return (
    <section className="py-32 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6">
        <FadeInUp>
          <p className="text-xs font-mono text-accent tracking-widest uppercase mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-12">
            Common questions.
          </h2>
        </FadeInUp>

        <div className="space-y-1">
          {FAQS.map((faq, i) => (
            <FadeInUp key={i} delay={i * 0.04}>
              <div className="border-b border-white/5 last:border-0">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between py-4 text-left gap-4 group"
                >
                  <span className="text-sm font-medium text-white group-hover:text-accent transition-colors">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-white/40 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: open === i ? 'auto' : 0, opacity: open === i ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm text-white/50 leading-relaxed pb-4">{faq.a}</p>
                </motion.div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const FOOTER_COLS = [
  {
    label: 'Product',
    links: [
      { label: 'Overview', href: '#product' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    label: 'Developers',
    links: [
      { label: 'API reference', href: '/docs' },
      { label: 'MPP endpoints', href: '/docs#mpp' },
      { label: 'Agent SDK', href: '/docs#sdk' },
      { label: 'GitHub', href: 'https://github.com/winsznx/remlo' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Cookie Policy', href: '/legal/cookies' },
    ],
  },
]

function Footer() {
  return (
    <footer className="border-t border-white/5 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Logo col */}
          <div className="col-span-2 md:col-span-1">
            <RemloLogo
              className="mb-4"
              markClassName="h-7 w-7"
              labelClassName="text-white text-sm"
            />
            <p className="text-xs text-white/30 leading-relaxed max-w-[180px]">
              AI-native global payroll on Tempo. Pay anyone, anywhere, in 0.4 seconds.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.label}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">{col.label}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-white/40 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">© 2026 Remlo. Built on Tempo Moderato.</p>
          <div className="flex items-center gap-4">
            {/* X / Twitter */}
            <a href="https://x.com/remlo_xyz/" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/60 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* GitHub */}
            <a href="https://github.com/winsznx/remlo" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/60 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="#" className="text-white/20 hover:text-white/60 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Root page ────────────────────────────────────────────────────────────────

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
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  )
}
