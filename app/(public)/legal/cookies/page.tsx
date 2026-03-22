import * as React from 'react'

export const metadata = { title: 'Cookie Policy | Remlo' }

export default function CookiePolicyPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-8 tracking-tight">Cookie Policy</h1>
      <p className="text-lg text-[var(--text-secondary)] mb-12">Last Updated: March 22, 2026</p>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">What Are Cookies?</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Cookies are small text files stored on your device that help us remember your preferences and improve your overall experience.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">How We Use Cookies</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">Essential Cookies</h3>
              <p className="text-[var(--text-secondary)]">Required for basic site functionality, such as maintaining your login session and security features.</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">Preference Cookies</h3>
              <p className="text-[var(--text-secondary)]">Allow us to remember choices you make, like your preferred language or theme settings.</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">Analytics Cookies</h3>
              <p className="text-[var(--text-secondary)]">Help us understand how visitors interact with Remlo so we can refine our user interface and performance.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Managing Your Cookies</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Most web browsers allow you to control cookies through their settings. Please note that disabling essential cookies may impact your ability to use certain features of the Remlo dashboard.
          </p>
        </section>
      </div>
    </article>
  )
}
