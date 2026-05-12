'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'sonner'
import { CheckCircle2, ExternalLink, Loader2, MessageSquare, ShieldCheck } from 'lucide-react'

/**
 * /support — public support form.
 *
 * Three audiences land here:
 *   1. An employer or employee logged in, hitting "Contact support" from
 *      the footer. Their email + role are pre-filled; the ticket is
 *      auto-linked to their employer.
 *   2. A locked-out user who can't sign in (forgot password, MFA broken).
 *      They submit anonymously; the ticket is filed as user_role=public.
 *   3. Anyone with a question — pre-sales, integration partner, etc.
 *
 * The form is small on purpose: email, subject, body. We've watched too
 * many corporate support forms inflate to 12 fields and abandon-rate
 * spike. The metadata column gives us room to capture extra context
 * without changing the form (URL, user agent, app version, etc).
 */
export default function SupportPage() {
  const router = useRouter()
  const { user, authenticated } = usePrivy()
  const [email, setEmail] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState<{ id: string } | null>(null)

  // Pre-fill email when authenticated. Don't pre-fill on every render —
  // user may want to override (e.g. file a ticket from a different
  // address than their account).
  React.useEffect(() => {
    if (authenticated && user?.email?.address && !email) {
      setEmail(user.email.address)
    }
  }, [authenticated, user?.email?.address, email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      // Note: we don't add Authorization here — the backend reads the
      // Privy session if present and gracefully falls back to public.
      // Sending the bearer would require a separate hook, and we want
      // this page to work even when auth is broken (the locked-out case).
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          subject: subject.trim(),
          body: body.trim(),
          metadata: {
            href: typeof window !== 'undefined' ? window.location.href : null,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            authenticated,
          },
        }),
      })
      const json = (await response.json().catch(() => ({}))) as {
        ticket?: { id: string }
        error?: string
      }
      if (!response.ok) {
        throw new Error(json.error ?? `${response.status}`)
      }
      if (!json.ticket) throw new Error('No ticket returned')
      setSuccess({ id: json.ticket.id })
      toast.success('Ticket received — we will reply by email.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl border border-[var(--status-success)]/30 bg-[var(--status-success)]/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--status-success)]/10">
              <CheckCircle2 className="h-4 w-4 text-[var(--status-success)]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                Ticket received
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                We logged your ticket and sent a confirmation email to{' '}
                <span className="font-medium text-[var(--text-primary)]">{email}</span>. Reply
                to that thread anytime — we&rsquo;ll see it. Your reference:
              </p>
              <p className="mt-3 font-mono text-xs text-[var(--text-muted)]">
                #{success.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setSuccess(null)
                setSubject('')
                setBody('')
              }}
              className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              File another
            </button>
            <button
              onClick={() =>
                router.push(`/support/status?code=${success.id.slice(0, 8)}&email=${encodeURIComponent(email)}`)
              }
              className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              Check status
            </button>
            <button
              onClick={() => router.push(authenticated ? '/dashboard' : '/')}
              className="h-9 px-3 rounded-lg bg-[var(--accent)] text-xs font-semibold text-[#0B1220] hover:opacity-90"
            >
              {authenticated ? 'Back to dashboard' : 'Back to home'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 lg:py-16">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          <MessageSquare className="h-3 w-3" />
          Support
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
          Tell us what&rsquo;s going wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Whether you&rsquo;re an employer, an employee, or a partner — describe the issue and we
          will reply by email. We answer technical issues directly. For disputes about pay
          amounts between an employee and an employer, we hand you the on-chain record so you
          can resolve it together; we don&rsquo;t arbitrate the underlying employment relationship.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6"
      >
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Reply-to email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          />
          <p className="text-[10px] text-[var(--text-muted)]">
            We answer here. Doesn&rsquo;t have to match your Remlo login.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Subject
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="One-line summary"
            maxLength={200}
            className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            What&rsquo;s happening
          </label>
          <textarea
            required
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What you tried, what you expected, what you saw. Include any tx hashes or run IDs you can find — they help us locate the issue fast."
            maxLength={5000}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          />
          <p className="text-[10px] text-[var(--text-muted)]">{body.length} / 5000</p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Your ticket is private to Remlo support staff.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 inline-flex items-center gap-2 px-4 rounded-lg bg-[var(--accent)] text-sm font-semibold text-[#0B1220] hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send to support
          </button>
        </div>
      </form>

      <p className="mt-6 text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
        Prefer email? Write to{' '}
        <a
          href="mailto:support@remlo.xyz"
          className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
        >
          support@remlo.xyz
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  )
}
