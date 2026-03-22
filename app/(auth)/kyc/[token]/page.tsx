'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

export default function KYCVerificationPage() {
  const params = useParams()
  const token = params.token as string

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
      <div className="h-16 w-16 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)]">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">KYC Verification</h1>
      <p className="text-[var(--text-secondary)] max-w-md mx-auto">
        Please complete identity verification to clear your pending payroll transfer.
      </p>
      <div className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-2 rounded mt-6">
        Token: {token}
      </div>
    </div>
  )
}
