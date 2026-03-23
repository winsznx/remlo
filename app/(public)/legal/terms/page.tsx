import * as React from 'react'

export const metadata = { title: 'Terms of Service | Remlo' }

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-8 tracking-tight">Terms of Service</h1>
      <p className="text-lg text-[var(--text-secondary)] mb-12">Last Updated: March 22, 2026</p>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">1. Acceptance of Terms</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            By accessing or using Remlo, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our payroll infrastructure or services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">2. Description of Service</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Remlo provides AI-native global payroll infrastructure on the Tempo network. This includes embedded wallet provisioning, compliance screening, salary streaming, and gas sponsorship.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">3. User Responsibilities</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Employers are responsible for the accuracy of payroll data and for ensuring compliance with local labor laws in their employees' jurisdictions. Users must maintain the security of their account credentials.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">4. Payment Terms</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            SaaS subscriptions are billed monthly. API access (MPP) is billed on a pay-per-call basis via HTTP 402. All fees are non-refundable except as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">5. Limitation of Liability</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Remlo is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from the use of our on-chain infrastructure.
          </p>
        </section>
      </div>
    </article>
  )
}
