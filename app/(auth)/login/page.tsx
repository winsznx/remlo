'use client'

import * as React from 'react'
import Link from 'next/link'
import { useLoginWithPasskey, usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RemloLogo } from '@/components/brand/RemloLogo'

const STATS = [
  { value: '0.4s', label: 'settlement time' },
  { value: '$0.01', label: 'per transaction' },
  { value: '47+', label: 'countries supported' },
]

const FEATURES = [
  'Embedded wallets — employees never touch crypto',
  'AI-native payroll with compliance screening',
  'Real-time salary streaming via StreamVesting',
  'TIP-403 policy enforcement on every payment',
]

function ClientLoginContent() {
  const { login, ready, authenticated } = usePrivy()
  const { loginWithPasskey, state: passkeyState } = useLoginWithPasskey()
  const router = useRouter()
  const [authError, setAuthError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (ready && authenticated) {
      router.push('/dashboard')
    }
  }, [ready, authenticated, router])

  const handleLogin = () => {
    setAuthError(null)
    login({ loginMethods: ['email', 'sms', 'wallet'] })
  }

  const handlePasskeyLogin = async () => {
    setAuthError(null)

    try {
      await loginWithPasskey()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Passkey sign-in failed')
    }
  }

  const passkeyBusy = !ready || !passkeyState || !['initial', 'done', 'error'].includes(passkeyState.status)

  const passkeyLabel = (() => {
    switch (passkeyState?.status) {
      case 'generating-challenge':
        return 'Preparing passkey…'
      case 'awaiting-passkey':
        return 'Waiting for passkey…'
      case 'submitting-response':
        return 'Signing in…'
      default:
        return 'Sign in with Passkey'
    }
  })()

  const primaryLabel = ready ? 'Continue with Email, SMS, or Wallet' : 'Loading…'

  const helperCopy = 'Use email, SMS, wallet, or passkey to access Remlo.'

  const primaryBusy = !ready

  const passkeyError =
    passkeyState?.status === 'error'
      ? passkeyState.error?.message ?? 'Passkey sign-in failed'
      : null

  const visibleError = authError ?? passkeyError

  React.useEffect(() => {
    if (passkeyState?.status !== 'error') return
    setAuthError(null)
  }, [passkeyState?.status])

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 bg-[var(--bg-surface)] border-r border-[var(--border-default)] relative overflow-hidden">
        {/* Mesh background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
            style={{
              background:
                'radial-gradient(circle at center, var(--accent) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10"
            style={{
              background:
                'radial-gradient(circle at center, var(--mono) 0%, transparent 70%)',
            }}
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
              Payroll for the onchain era
            </p>
            <h1 className="text-[2.5rem] leading-[1.1] font-bold text-[var(--text-primary)] tracking-tight mb-6">
              Pay anyone,{' '}
              <span className="text-[var(--accent)]">anywhere</span>,{' '}
              in seconds.
            </h1>
            <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-sm">
              AI-native payroll infrastructure on Tempo. Compliance screening,
              gas sponsorship, and salary streaming — fully abstracted from your team.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-10 grid grid-cols-3 gap-4"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-default)]">
                <div className="number-xl text-[var(--text-primary)]">{stat.value}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 space-y-3"
          >
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-[var(--accent)]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
                {feature}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="flex -space-x-2">
            {['#059669', '#3B82F6', '#8B5CF6', '#F59E0B'].map((color, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-[var(--bg-surface)]"
                style={{ background: color }}
              />
            ))}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Trusted by finance teams across 47 countries
          </span>
        </motion.div>
      </div>

      {/* Right — auth panel */}
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
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              {helperCopy}
            </p>
          </div>

          <button
            onClick={handleLogin}
            disabled={primaryBusy}
            className="w-full h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold tracking-tight
              hover:opacity-90 active:opacity-80 transition-opacity
              disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {!ready ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Loading…
              </>
            ) : (
              primaryLabel
            )}
          </button>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border-default)]" />
            <span className="text-xs text-[var(--text-muted)]">or</span>
            <div className="h-px flex-1 bg-[var(--border-default)]" />
          </div>

          <button
            onClick={() => void handlePasskeyLogin()}
            disabled={passkeyBusy}
            className="mt-6 w-full h-11 rounded-lg border border-[var(--border-strong)] bg-transparent
              text-[var(--text-primary)] text-sm font-medium
              hover:bg-[var(--bg-subtle)] active:opacity-80 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            {passkeyLabel}
          </button>

          {visibleError ? (
            <p className="mt-4 text-center text-xs text-[var(--status-error)] leading-relaxed">
              {visibleError}
            </p>
          ) : null}

          <p className="mt-8 text-center text-xs text-[var(--text-muted)] leading-relaxed">
            By continuing, you agree to Remlo&apos;s{' '}
            <Link href="/legal/terms" className="text-[var(--accent)] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="text-[var(--accent)] hover:underline">
              Privacy Policy
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
            <p className="text-center text-xs text-[var(--text-muted)]">
              Employer?{' '}
              <a href="/register" className="text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] transition-colors">
                Create your company account
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Completely abort the server-side render tree here to prevent @privy-io hooks
  // from crashing Node's Edge runtime when they inevitably scan for window/navigator objects
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <span className="w-6 h-6 rounded-full border-2 border-[var(--text-muted)] border-t-[var(--accent)] animate-spin" />
      </div>
    )
  }

  return <ClientLoginContent />
}
