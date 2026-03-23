'use client'

import * as React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RemloLogo } from '@/components/brand/RemloLogo'
import { getPrimaryPrivyEthereumWallet } from '@/lib/privy-wallet'

const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-1000', label: '201–1,000 employees' },
  { value: '1001+', label: '1,001+ employees' },
]

export default function RegisterPage() {
  const { ready, authenticated, getAccessToken, user } = usePrivy()
  const router = useRouter()

  const [companyName, setCompanyName] = React.useState('')
  const [companySize, setCompanySize] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/employers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName,
          companySize: companySize || undefined,
          employerAdminWallet: getPrimaryPrivyEthereumWallet(user) ?? undefined,
        }),
      })

      const json = (await res.json()) as { employerId?: string; error?: string }
      if (!res.ok || !json.employerId) {
        throw new Error(json.error ?? 'Something went wrong')
      }

      router.push('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (!ready || !authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 bg-[var(--bg-surface)] border-r border-[var(--border-default)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle at center, var(--accent) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle at center, var(--mono) 0%, transparent 70%)' }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10"
        >
          <RemloLogo
            className="gap-2.5"
            markClassName="h-8 w-8"
            labelClassName="text-[var(--text-primary)] text-lg tracking-tight"
          />
        </motion.div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <p className="text-xs font-mono text-[var(--accent)] tracking-widest uppercase mb-4">
              Get started in minutes
            </p>
            <h1 className="text-[2.5rem] leading-[1.1] font-bold text-[var(--text-primary)] tracking-tight mb-6">
              Run payroll{' '}
              <span className="text-[var(--accent)]">onchain</span>{' '}
              from day one.
            </h1>
            <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-sm">
              Set up your company in under two minutes. Add employees, fund your treasury, and run your first payroll — all from a single dashboard.
            </p>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mt-10 space-y-4"
          >
            {[
              { step: '01', label: 'Create your company profile' },
              { step: '02', label: 'Invite employees via link' },
              { step: '03', label: 'Fund treasury and run payroll' },
            ].map((item) => (
              <li key={item.step} className="flex items-center gap-4">
                <span className="font-mono text-xs text-[var(--accent)] w-6 shrink-0">{item.step}</span>
                <div className="h-px flex-1 bg-[var(--border-default)]" />
                <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="relative z-10"
        >
          <p className="text-xs text-[var(--text-muted)]">
            Powered by Tempo · Secured by TIP-403 · Compliant by default
          </p>
        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <RemloLogo
            className="lg:hidden mb-10"
            markClassName="h-7 w-7"
            labelClassName="text-[var(--text-primary)] text-base"
          />

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Set up your company
            </h2>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Tell us a bit about your organization
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="company-name">
                Company name
              </label>
              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                required
                autoFocus
                className="w-full h-11 px-3.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]
                  text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)]
                  focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)]
                  transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="company-size">
                Company size
                <span className="ml-1 text-[var(--text-muted)] font-normal">(optional)</span>
              </label>
              <select
                id="company-size"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]
                  text-[var(--text-primary)] text-sm
                  focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)]
                  transition-colors appearance-none cursor-pointer"
              >
                <option value="">Select size</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-[var(--status-error)] px-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!companyName.trim() || submitting}
              className="w-full h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold
                hover:opacity-90 active:opacity-80 transition-opacity
                disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating…
                </>
              ) : (
                'Create company'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[var(--text-muted)] leading-relaxed">
            Already have a company?{' '}
            <a href="/dashboard" className="text-[var(--accent)] hover:underline">
              Go to dashboard
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
