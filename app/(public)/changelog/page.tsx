import * as React from 'react'

export const metadata = { title: 'Changelog | Remlo' }

const UPDATES = [
  {
    version: 'v0.1.2',
    date: 'March 20, 2026',
    title: 'Public Infrastructure Milestone',
    description: 'Scaffolded complete public portal including detailed legal policies, pricing tiers, and developer documentation.',
    items: ['Added detailed Privacy Policy and Terms of Service', 'Implemented new pricing comparison table', 'Refined API documentation with examples'],
  },
  {
    version: 'v0.1.1',
    date: 'March 15, 2026',
    title: 'Tempo Network Stability',
    description: 'Stabilized the bridge connectors and improved the MPP-12 session charging logic for AI agents.',
    items: ['Improved bridge off-ramp reliability', 'Unified environment variable naming', 'Internal billing logic refinements'],
  },
  {
    version: 'v0.1.0',
    date: 'March 1, 2026',
    title: 'Initial Alpha Launch',
    description: 'The world\'s first AI-native global payroll infrastructure goes live on Tempo.',
    items: ['Embedded wallet provisioning', 'Stripe multi-rail support', 'TIP-403 compliance engine'],
  },
]

export default function ChangelogPage() {
  return (
    <div className="space-y-16">
      <div className="max-w-xl">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Changelog</h1>
        <p className="text-lg text-[var(--text-secondary)]">The latest updates, improvements, and fixes for the Remlo infrastructure.</p>
      </div>

      <div className="space-y-16">
        {UPDATES.map((u) => (
          <div key={u.version} className="relative pl-12 before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-px before:bg-[var(--border-default)] last:before:hidden">
            <div className="absolute left-0 top-1.5 h-10 w-10 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center z-10">
              <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider">{u.version}</span>
                <span className="text-sm text-[var(--text-muted)]">{u.date}</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{u.title}</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">{u.description}</p>
              <ul className="list-disc pl-6 space-y-2 text-sm text-[var(--text-secondary)] pt-2">
                {u.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
