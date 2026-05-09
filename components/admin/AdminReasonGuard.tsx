'use client'

import * as React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Loader2, ScrollText, ShieldAlert } from 'lucide-react'

/**
 * AdminReasonGuard — gates a sensitive admin view behind a reason capture.
 *
 * Why: GDPR / SOC 2 expectations require that staff access to user data be
 * tied to a stated purpose. We can't enforce intent in a vacuum — but
 * making the admin type the reason out (and storing it in the audit log)
 * is the strongest cheap mechanism. It also pulls them out of "browsing
 * mode" and back into "investigating a specific thing" mode.
 *
 * Behavior:
 *   1. On mount, check sessionStorage for `admin-reason:<resourceKey>`. If
 *      present, render children — the reason is reused for the rest of
 *      the session and threaded into the X-Admin-Reason header on every
 *      reasoned fetch inside this scope.
 *   2. Otherwise show a blocking modal with one required textarea. On
 *      submit, store the reason and reveal the children.
 *   3. The "Cancel" button takes the admin back to /admin (where browsing
 *      doesn't require a reason).
 *
 * Scope: per-resource. Opening employer A then employer B prompts twice;
 * that's intentional — we want the audit trail to record a reason against
 * each distinct subject.
 */

type ReasonState =
  | { status: 'pending' }
  | { status: 'gated' }
  | { status: 'cleared'; reason: string }

interface AdminReasonContextValue {
  reason: string | null
  resourceKey: string
}

const AdminReasonContext = React.createContext<AdminReasonContextValue | null>(null)

export function useAdminReason(): AdminReasonContextValue {
  const ctx = React.useContext(AdminReasonContext)
  if (!ctx) {
    throw new Error('useAdminReason must be used inside <AdminReasonGuard>')
  }
  return ctx
}

/**
 * useReasonedAuthedFetch — drop-in replacement for usePrivyAuthedFetch
 * inside an AdminReasonGuard scope. Adds the X-Admin-Reason header to
 * every request so the backend can attach it to the audit row.
 */
export function useReasonedAuthedFetch() {
  const { authenticated, getAccessToken } = usePrivy()
  const { reason } = useAdminReason()

  return React.useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      if (authenticated) {
        let token: string | null = null
        for (let attempt = 0; attempt < 5; attempt++) {
          token = await getAccessToken()
          if (token) break
          await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
        }
        if (token) headers.set('Authorization', `Bearer ${token}`)
      }
      if (reason) headers.set('X-Admin-Reason', reason)
      return fetch(input, { ...init, headers })
    },
    [authenticated, getAccessToken, reason],
  )
}

export function useReasonedAuthedJson() {
  const fetcher = useReasonedAuthedFetch()
  return React.useCallback(
    async function fetchJson<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
      const res = await fetcher(input, init)
      if (!res.ok) {
        let message = `${res.status} ${res.statusText}`
        try {
          const body = (await res.json()) as { error?: string }
          if (body.error) message = body.error
        } catch {
          /* keep status-based message */
        }
        throw new Error(message)
      }
      return res.json() as Promise<T>
    },
    [fetcher],
  )
}

interface AdminReasonGuardProps {
  /** Stable identifier for the subject — e.g. `employer:abc-123`. */
  resourceKey: string
  /** Title shown in the modal — e.g. "View employer detail". */
  purpose: string
  /** Description shown above the textarea. Should remind the admin what's at stake. */
  context?: React.ReactNode
  children: React.ReactNode
  /** Where to send them if they cancel. Defaults to /admin. */
  cancelHref?: string
}

const STORAGE_PREFIX = 'admin-reason:'

export function AdminReasonGuard({
  resourceKey,
  purpose,
  context,
  children,
  cancelHref = '/admin',
}: AdminReasonGuardProps) {
  const [state, setState] = React.useState<ReasonState>({ status: 'pending' })
  const [draft, setDraft] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Resolve from sessionStorage on mount. We deliberately use sessionStorage
  // (not localStorage) so the reason doesn't persist across browser
  // restarts — a fresh session gets a fresh prompt.
  React.useEffect(() => {
    const stored = window.sessionStorage.getItem(`${STORAGE_PREFIX}${resourceKey}`)
    if (stored && stored.trim().length > 0) {
      setState({ status: 'cleared', reason: stored })
    } else {
      setState({ status: 'gated' })
    }
  }, [resourceKey])

  const submit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = draft.trim()
      if (trimmed.length < 4) return
      setSubmitting(true)
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${resourceKey}`, trimmed.slice(0, 500))
      // Tiny delay so the spinner is visible — this is a deliberate friction
      // moment, not a race with backend latency.
      await new Promise((r) => setTimeout(r, 120))
      setState({ status: 'cleared', reason: trimmed.slice(0, 500) })
      setSubmitting(false)
    },
    [draft, resourceKey],
  )

  if (state.status === 'pending') {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Preparing access gate…
      </div>
    )
  }

  if (state.status === 'gated') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <form
          onSubmit={submit}
          className="w-full max-w-xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--status-pending)]/10">
              <ShieldAlert className="h-4 w-4 text-[var(--status-pending)]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{purpose}</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                You are about to read user data. Capture the reason — a support ticket ID, an
                incident reference, or a short note. The reason is stored alongside this access
                in the audit log and may be visible to the customer in their data-access view.
              </p>
              {context && (
                <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-[11px] leading-5 text-[var(--text-secondary)]">
                  {context}
                </div>
              )}
            </div>
          </div>

          <label className="mt-5 block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Reason
          </label>
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Ticket SUP-1234 — employer reports failed payroll on 2026-05-08"
            maxLength={500}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[10px] text-[var(--text-muted)]">
              {draft.trim().length < 4
                ? 'Minimum 4 characters.'
                : `${draft.trim().length} / 500`}
            </p>
            <ScrollText className="h-3 w-3 text-[var(--text-muted)]" />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <a
              href={cancelHref}
              className="h-10 inline-flex items-center px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={draft.trim().length < 4 || submitting}
              className="h-10 inline-flex items-center gap-2 px-4 rounded-lg bg-[var(--accent)] text-sm font-semibold text-[#0B1220] hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Continue and log this access
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <AdminReasonContext.Provider value={{ reason: state.reason, resourceKey }}>
      {children}
    </AdminReasonContext.Provider>
  )
}
