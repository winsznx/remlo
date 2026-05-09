import * as React from 'react'

export const metadata = { title: 'Privacy Policy | Remlo' }

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-8 tracking-tight">Privacy Policy</h1>
      <p className="text-lg text-[var(--text-secondary)] mb-12">Last Updated: May 9, 2026</p>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">1. Information We Collect</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            We collect information that you provide directly to us when you create an account, use our services, or communicate with us. This includes:
          </p>
          <ul className="list-disc pl-6 mt-4 space-y-2 text-[var(--text-secondary)]">
            <li>Account details (email address, name, organization)</li>
            <li>Financial information necessary for payroll processing</li>
            <li>Compliance data required by governing regulations (KYC/KYB)</li>
            <li>Technical data (IP address, browser type, device information)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">2. How We Use Your Information</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Your data is used strictly to provide and improve the Remlo payroll infrastructure:
          </p>
          <ul className="list-disc pl-6 mt-4 space-y-2 text-[var(--text-secondary)]">
            <li>Facilitating on-chain payroll and salary streaming</li>
            <li>Enforcing TIP-403 compliance policies</li>
            <li>Preventing fraud and ensuring network security</li>
            <li>Providing customer support and service updates</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">3. Data Security</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Remlo employs industry-standard security measures to protect your information. Since we utilize non-custodial wallets via Privy, we never have access to employee private keys or seed phrases. All sensitive data is encrypted at rest and in transit.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">4. How Remlo Personnel Access Your Data</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Operating a payroll service requires our staff to occasionally access account data — for example, when you contact support, when our systems flag a transaction for review, or when we investigate a security or reliability incident. We have built the platform so this access is the exception, not the default, and so every instance is recorded.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
            Specifically:
          </p>
          <ul className="list-disc pl-6 mt-4 space-y-2 text-[var(--text-secondary)]">
            <li>
              <strong className="text-[var(--text-primary)]">Purpose limitation.</strong> We access your data only for operating, supporting, securing, and improving Remlo. We do not access account data out of curiosity, for marketing decisions, or to share with third parties unless legally compelled by a valid order from a competent authority.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Reason capture.</strong> When a Remlo staff member opens a sensitive view (for example, the detail of an employer&rsquo;s payroll run, or an individual employee record), they must record a reason — a support ticket reference, an incident ID, or a free-text note. The reason is stored alongside the access event.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Audit trail.</strong> Every staff access to account data — every read of a sensitive view and every write — is captured in an append-only audit log with the staff member&rsquo;s identity, timestamp, IP address, and the reason given. The log is internal today; we plan to expose a per-account access view inside the dashboard so you can see exactly who looked at what.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Access control.</strong> Staff access is gated by a vetted allow-list of Remlo personnel. Access cannot be self-granted. Adding a person to or removing them from the allow-list is itself a logged event.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">No password access.</strong> Remlo never sees your sign-in credentials or your wallet keys. Authentication runs through Privy; signing happens locally on your device.
            </li>
          </ul>
          <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
            If you want to know about access events on your account, write to{' '}
            <a href="mailto:privacy@remlo.xyz" className="text-[var(--accent)] hover:underline">
              privacy@remlo.xyz
            </a>{' '}
            and we will pull the relevant log entries for you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">5. Your Rights</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Depending on your jurisdiction, you have the right to access the personal data we hold about you, ask us to correct it, ask us to delete it, ask for a portable copy, and object to specific processing. You can manage most account settings directly in the Remlo dashboard. For anything else — including a copy of the audit-log entries that touched your data — write to{' '}
            <a href="mailto:privacy@remlo.xyz" className="text-[var(--accent)] hover:underline">
              privacy@remlo.xyz
            </a>
            . We respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">6. Contacting Us</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            For product questions, account help, or anything that isn&rsquo;t a privacy request, the dashboard has a &ldquo;Contact support&rdquo; link in the footer that opens a ticket directly with the team. For privacy-specific requests, write to{' '}
            <a href="mailto:privacy@remlo.xyz" className="text-[var(--accent)] hover:underline">
              privacy@remlo.xyz
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  )
}
