import * as React from 'react'

export const metadata = { title: 'Documentation | Remlo' }

export default function DocsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-8 tracking-tight">Documentation</h1>
      <p className="text-lg text-[var(--text-secondary)] mb-12">Learn how to build on top of the world's first AI-native payroll network.</p>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">The Remlo API</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Our API follows standard REST principles and returns JSON-encoded responses. Some critical endpoints are protected by the MPP (Micro-Payment Protocol) and require on-chain vouchers for authorization.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Authentication</h2>
          <p className="text-[var(--text-secondary)] mb-4">Most endpoints require an API key passed in the Authorization header:</p>
          <pre className="bg-[var(--bg-overlay)] p-4 rounded-xl border border-[var(--border-default)] overflow-x-auto">
            <code className="text-sm font-mono text-[var(--text-primary)]">
              Authorization: Bearer rmlo_agent_xxxxxxxxxxxx
            </code>
          </pre>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Executing Payroll (MPP)</h2>
          <p className="text-[var(--text-secondary)] mb-4">To execute a payroll batch, your agent must handle the HTTP 402 Payment Required challenge:</p>
          <div className="bg-[var(--bg-overlay)] p-6 rounded-xl border border-[var(--border-default)] flex flex-col gap-4">
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest">Example Request</div>
            <pre className="overflow-x-auto text-[var(--text-primary)]">
              <code className="text-xs">
{`curl -X POST https://api.remlo.xyz/v1/payroll/execute \\
  -H "Authorization: Bearer $RMLO_API_KEY" \\
  -d '{ "batchId": "batch_123" }'`}
              </code>
            </pre>
            <div className="border-t border-[var(--border-default)] pt-4 mt-2">
              <p className="text-[var(--text-secondary)] text-sm italic">
                Note: Standard execution costs $1.00 USD. Ensure your agent has a sufficient Tempo voucher balance.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Rate Limits</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Free tier users are limited to 1,000 requests per day. Pro and Enterprise tiers have significantly higher limits suitable for high-volume automation.
          </p>
        </section>
      </div>
    </article>
  )
}
