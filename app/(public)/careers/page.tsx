import * as React from 'react'
import { ArrowRight } from 'lucide-react'

export const metadata = { title: 'Careers | Remlo' }

const ROLES = [
  { title: 'Core Protocol Engineer', team: 'Engineering', type: 'Full-time', location: 'Remote (UTC+8 to UTC-4)' },
  { title: 'AI Solutions Architect', team: 'Product', type: 'Full-time', location: 'Remote' },
  { title: 'Compliance & Legal Counsel', team: 'Legal', type: 'Part-time / Contract', location: 'Remote (EU preferred)' },
]

export default function CareersPage() {
  return (
    <div className="space-y-16">
      <div className="max-w-xl">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Join the Revolution</h1>
        <p className="text-lg text-[var(--text-secondary)]">Help us build the financial nervous system for the autonomous economy.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Why Remlo?</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            We are a distributed team of engineers, designers, and thinkers who are obsessed with solving hard problems. At Remlo, you'll have the autonomy to make a massive impact and build software that genuinely shifts the paradigm of how people get paid.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[var(--text-secondary)]">
            <li>Remote-first, async culture</li>
            <li>Paid in stablecoins (via Remlo!)</li>
            <li>Learning and wellness stipends</li>
          </ul>
        </section>
        
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Open Roles</h2>
          <div className="space-y-4">
            {ROLES.map((role) => (
              <div key={role.title} className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] flex items-center justify-between hover:border-[var(--accent)] transition-colors group">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{role.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{role.team} · {role.type} · {role.location}</p>
                </div>
                <button className="h-8 w-8 rounded-full border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)] group-hover:border-transparent transition-all">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
