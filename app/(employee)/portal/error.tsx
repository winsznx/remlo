'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PortalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[var(--status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Something went wrong</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="h-9 px-4 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  )
}
