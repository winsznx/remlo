import * as React from 'react'

export const metadata = { title: 'Privacy Policy | Remlo' }

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-8 tracking-tight">Privacy Policy</h1>
      <p className="text-lg text-[var(--text-secondary)] mb-12">Last Updated: March 22, 2026</p>

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
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">4. Your Rights</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data. You can manage most of your account settings directly within the Remlo dashboard.
          </p>
        </section>
      </div>
    </article>
  )
}
