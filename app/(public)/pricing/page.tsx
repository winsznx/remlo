import * as React from 'react'
import { Check, Info } from 'lucide-react'

export const metadata = { title: 'Pricing | Remlo' }

const PLANS = [
  {
    name: 'Starter',
    price: '0',
    description: 'For teams exploring local crypto payroll.',
    features: ['Up to 5 employees', 'Manual execution', 'Basic compliance screening', 'Email support'],
  },
  {
    name: 'Pro',
    price: '99',
    popular: true,
    description: 'For growing companies with global teams.',
    features: ['Unlimited employees', 'AI-native compliance', 'Priority support', 'Basic API access', 'Payroll scheduling'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Bespoke infrastructure for large organizations.',
    features: ['Custom compliance rules', 'Dedicated account manager', 'SLA guarantees', 'Full API + Webhooks', 'Audit logs'],
  },
]

export default function PricingPage() {
  return (
    <div className="space-y-16">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Transparent Pricing</h1>
        <p className="text-lg text-[var(--text-secondary)]">Choose the plan that fits your current payroll volume. No hidden wire fees, ever.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <div 
            key={plan.name}
            className={`relative p-8 rounded-2xl border ${plan.popular ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/5 ring-1 ring-[var(--accent)]' : 'border-[var(--border-default)] bg-[var(--bg-surface)]'} flex flex-col`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </span>
            )}
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              {plan.price !== 'Custom' && <span className="text-2xl font-medium text-[var(--text-secondary)]">$</span>}
              <span className="text-5xl font-bold text-[var(--text-primary)] tracking-tight">{plan.price}</span>
              {plan.price !== 'Custom' && <span className="text-[var(--text-muted)]">/mo</span>}
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-8 flex-1">{plan.description}</p>
            <ul className="space-y-4 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                  <Check className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className={`w-full h-11 rounded-xl font-semibold transition-opacity hover:opacity-90 ${plan.popular ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-overlay)] text-[var(--text-primary)] border border-[var(--border-default)]'}`}>
              Get Started
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-overlay)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <Info className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">MPP: Pay-Per-Call Infrastructure</h2>
        </div>
        <p className="text-[var(--text-secondary)] mb-8">
          AI agents and developers can access our on-chain infrastructure directly via our Micro-Payment Protocol (MPP). No subscription required.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold">Standard Read</p>
            <p className="text-[var(--text-primary)] font-mono font-bold">$0.01</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold">Standard Write</p>
            <p className="text-[var(--text-primary)] font-mono font-bold">$0.05</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold">Complex Execution</p>
            <p className="text-[var(--text-primary)] font-mono font-bold">$1.00</p>
          </div>
        </div>
      </div>
    </div>
  )
}
