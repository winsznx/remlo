'use client'

import * as React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { RemloLogo } from '@/components/brand/RemloLogo'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/lib/queries/employees'

type Step = 'loading' | 'invalid' | 'claimed' | 'welcome' | 'authenticating' | 'claiming' | 'done'

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const router = useRouter()
  const { login, ready, authenticated, user } = usePrivy()

  const [step, setStep] = React.useState<Step>('loading')
  const [employee, setEmployee] = React.useState<Employee | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // 1. Verify token on mount
  React.useEffect(() => {
    if (!token) {
      setStep('invalid')
      return
    }
    void verifyToken(token)
  }, [token])

  async function verifyToken(t: string) {
    const { data: claimedRecord } = await supabase
      .from('employees')
      .select('id')
      .eq('id', t)
      .not('user_id', 'is', null)
      .maybeSingle()

    if (claimedRecord) {
      setStep('claimed')
      return
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', t)
      .is('user_id', null) // not yet claimed
      .single()

    if (error || !data) {
      setStep('invalid')
      return
    }
    setEmployee(data)
    setStep('welcome')
  }

  // 2. Watch for Privy auth completion
  React.useEffect(() => {
    if (step === 'authenticating' && ready && authenticated && user && employee) {
      void claimInvite()
    }
  }, [step, ready, authenticated, user, employee])

  async function claimInvite() {
    if (!user || !employee) return
    setStep('claiming')

    try {
      const walletAddress =
        user.wallet?.address ??
        user.linkedAccounts.find((a) => a.type === 'wallet')?.address ??
        null

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          user_id: user.id,
          wallet_address: walletAddress,
          onboarded_at: new Date().toISOString(),
        })
        .eq('id', employee.id)

      if (updateError) {
        setError(updateError.message)
        setStep('welcome')
        return
      }

      setStep('done')
      setTimeout(() => router.push('/portal'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('welcome')
    }
  }

  function handleAccept() {
    setStep('authenticating')
    login()
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <RemloLogo
          className="mb-10"
          markClassName="h-7 w-7"
          labelClassName="text-[var(--text-primary)] text-base"
        />

        {step === 'loading' && (
          <div className="space-y-3">
            <div className="h-6 w-48 bg-[var(--bg-subtle)] rounded animate-pulse" />
            <div className="h-4 w-full bg-[var(--bg-subtle)] rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-[var(--bg-subtle)] rounded animate-pulse" />
          </div>
        )}

        {step === 'claimed' && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11V7m0 8h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.93 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Invite already claimed</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              This employee invite has already been claimed. Sign in with the employee account that accepted it, or ask the employer to create a fresh test employee if you need a brand-new onboarding flow.
            </p>
          </div>
        )}

        {step === 'invalid' && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Invalid invite link</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              This link may have already been used or has expired. Contact your employer for a new invite.
            </p>
          </div>
        )}

        {(step === 'welcome' || step === 'authenticating') && employee && (
          <>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
              You&apos;ve been invited to Remlo
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mb-8">
              Accept this invite to receive your salary onchain. Your embedded wallet will be created automatically — no crypto knowledge required.
            </p>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {employee.email && (
                  <div>
                    <div className="text-[var(--text-muted)] text-xs mb-0.5">Email</div>
                    <div className="text-[var(--text-primary)] font-medium">{employee.email}</div>
                  </div>
                )}
                {employee.job_title && (
                  <div>
                    <div className="text-[var(--text-muted)] text-xs mb-0.5">Role</div>
                    <div className="text-[var(--text-primary)] font-medium">{employee.job_title}</div>
                  </div>
                )}
                {employee.salary_amount && (
                  <div>
                    <div className="text-[var(--text-muted)] text-xs mb-0.5">Salary</div>
                    <div className="number-lg text-[var(--text-primary)]">
                      ${employee.salary_amount.toLocaleString()}{' '}
                      <span className="text-[var(--text-muted)] font-normal text-xs">
                        {employee.salary_currency}/{employee.pay_frequency}
                      </span>
                    </div>
                  </div>
                )}
                {employee.department && (
                  <div>
                    <div className="text-[var(--text-muted)] text-xs mb-0.5">Department</div>
                    <div className="text-[var(--text-primary)] font-medium">{employee.department}</div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-xs text-[var(--status-error)] mb-4 px-1">{error}</p>
            )}

            <button
              onClick={handleAccept}
              disabled={step === 'authenticating'}
              className="w-full h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold
                hover:opacity-90 active:opacity-80 transition-opacity
                disabled:opacity-60 disabled:cursor-wait
                flex items-center justify-center gap-2"
            >
              {step === 'authenticating' ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Connecting…
                </>
              ) : (
                'Accept Invite'
              )}
            </button>

            <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
              A Tempo wallet will be created for you automatically.
            </p>
          </>
        )}

        {step === 'claiming' && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Setting up your account</h2>
            <p className="text-sm text-[var(--text-secondary)]">Creating your wallet and claiming your invite…</p>
          </div>
        )}

        {step === 'done' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">You&apos;re all set!</h2>
            <p className="text-sm text-[var(--text-secondary)]">Redirecting to your portal…</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
