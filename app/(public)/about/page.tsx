import * as React from 'react'

export const metadata = { title: 'About | Remlo' }

export default function AboutPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-8 tracking-tight">About Remlo</h1>
      <p className="text-xl text-[var(--text-secondary)] mb-12 italic border-l-2 border-[var(--accent)] pl-6">
        Our mission is to solve global payroll for the onchain era.
      </p>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">The Problem</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            In an increasingly remote and AI-agent-centric world, traditional fiat-based payroll systems remain prohibitively expensive and excruciatingly slow. Cross-border wires take days to settle and lose significant value to intermediary bank fees.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">The Solution</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Remlo leverages the Tempo network to provide a hyper-fast, low-cost settlement layer for the world's workforce. By automating compliance, identity verification, and tax treasury via AI agents, we enable businesses to scale their teams globally without the administrative overhead.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Our Vision</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            We believe that every employee—human or agent—deserves a friction-less, instant, and transparent compensation experience. Remlo is building the infrastructure that will power the next generation of decentralized labor markets.
          </p>
        </section>
      </div>
    </div>
  )
}
