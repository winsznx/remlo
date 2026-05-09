'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  MessageSquare,
  Plus,
} from 'lucide-react'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Severity = 'info' | 'success' | 'warning' | 'error'

interface EmployerAnnouncement {
  id: string
  title: string
  body: string
  link_url: string | null
  link_label: string | null
  severity: Severity
  audience: string
  employer_id: string | null
  published_at: string | null
  expires_at: string | null
  created_at: string
}

const SEVERITY_META: Record<
  Severity,
  { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  info: { label: 'Info', icon: Info, tint: 'text-[var(--text-muted)]' },
  success: { label: 'Success', icon: CheckCircle2, tint: 'text-[var(--status-success)]' },
  warning: { label: 'Warning', icon: AlertTriangle, tint: 'text-[var(--status-pending)]' },
  error: { label: 'Error', icon: AlertCircle, tint: 'text-[var(--status-error)]' },
}

export default function MessagesPage(): React.ReactElement {
  const { data: employer, isLoading: employerLoading } = useEmployer()
  const fetchJson = usePrivyAuthedJson()
  const qc = useQueryClient()
  const [composing, setComposing] = React.useState(false)

  const list = useQuery<{ items: EmployerAnnouncement[] }>({
    queryKey: ['employer-messages', employer?.id],
    queryFn: () => fetchJson(`/api/employers/${employer!.id}/announcements`),
    enabled: Boolean(employer?.id),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--text-muted)]" />
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Team messages</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Send a banner — and optionally an email — to every active employee on your team.
            Use it for benefits updates, policy changes, or maintenance windows.
          </p>
        </div>
        <Button onClick={() => setComposing(true)} disabled={composing || !employer?.id}>
          <Plus className="h-4 w-4" />
          New message
        </Button>
      </div>

      {composing && employer?.id && (
        <ComposeForm
          employerId={employer.id}
          onCancel={() => setComposing(false)}
          onSaved={() => {
            setComposing(false)
            void qc.invalidateQueries({ queryKey: ['employer-messages', employer.id] })
          }}
        />
      )}

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <header className="border-b border-[var(--border-default)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
          Sent messages
        </header>
        {employerLoading || list.isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        ) : !list.data?.items.length ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No messages sent yet.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-default)]">
            {list.data.items.map((a) => {
              const Sev = SEVERITY_META[a.severity].icon
              const isLive = isLiveAnnouncement(a)
              return (
                <li key={a.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <Sev className={`h-3.5 w-3.5 mt-1 ${SEVERITY_META[a.severity].tint}`} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</span>
                        {isLive ? (
                          <span className="text-[10px] uppercase tracking-wider text-[var(--status-success)] rounded-md border border-[var(--status-success)]/20 bg-[var(--status-success)]/10 px-1.5 py-0.5">
                            Live
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-1.5 py-0.5">
                            {a.published_at ? 'Expired' : 'Draft'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a.body}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Sent {new Date(a.created_at).toLocaleString()}
                        {a.expires_at ? ` · expires ${new Date(a.expires_at).toLocaleString()}` : ' · no expiry'}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )

  function isLiveAnnouncement(a: EmployerAnnouncement): boolean {
    if (!a.published_at) return false
    const now = Date.now()
    if (new Date(a.published_at).getTime() > now) return false
    if (a.expires_at && new Date(a.expires_at).getTime() <= now) return false
    return true
  }
}

interface ComposeFormProps {
  employerId: string
  onCancel: () => void
  onSaved: () => void
}

function ComposeForm({ employerId, onCancel, onSaved }: ComposeFormProps) {
  const fetchJson = usePrivyAuthedJson()
  const [form, setForm] = React.useState({
    title: '',
    body: '',
    severity: 'info' as Severity,
    link_url: '',
    link_label: '',
    expires_at: '',
    send_email: true,
  })
  const [submitting, setSubmitting] = React.useState(false)
  const canSubmit = form.title.trim().length > 0 && form.body.trim().length > 0 && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await fetchJson(`/api/employers/${employerId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body.trim(),
          severity: form.severity,
          link_url: form.link_url.trim() || null,
          link_label: form.link_label.trim() || null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          send_email: form.send_email,
        }),
      })
      toast.success(form.send_email ? 'Message sent — banner + email' : 'Message posted as banner')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4"
    >
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--text-muted)]">Title</label>
        <Input
          placeholder="New benefits plan kicks in next pay period"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--text-muted)]">Body</label>
        <textarea
          rows={4}
          placeholder="Heads up — starting May payroll, …"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          maxLength={600}
          className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-muted)]">Severity</label>
          <select
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {(Object.keys(SEVERITY_META) as Severity[]).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-muted)]">Expires at (optional)</label>
          <Input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-muted)]">Link URL (optional)</label>
          <Input
            placeholder="/benefits or https://..."
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-muted)]">Link label (optional)</label>
          <Input
            placeholder="Read the details"
            value={form.link_label}
            onChange={(e) => setForm({ ...form, link_label: e.target.value })}
            maxLength={40}
          />
        </div>
      </div>
      <label className="flex items-start gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2.5">
        <input
          type="checkbox"
          checked={form.send_email}
          onChange={(e) => setForm({ ...form, send_email: e.target.checked })}
          className="mt-0.5 accent-[var(--accent)]"
        />
        <span className="text-xs leading-5 text-[var(--text-primary)]">
          Also email every active employee
          <span className="block text-[var(--text-muted)]">
            Honors per-employee preferences (employees who turned off &ldquo;Messages from your employer&rdquo; are skipped).
          </span>
        </span>
      </label>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
        >
          Cancel
        </button>
        <Button type="submit" disabled={!canSubmit}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Send
        </Button>
      </div>
    </form>
  )
}
