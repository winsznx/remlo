'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { usePrivyAuthedFetch, usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Severity = 'info' | 'success' | 'warning' | 'error'
type Audience = 'all' | 'employers' | 'employees' | 'admins'

interface Announcement {
  id: string
  title: string
  body: string
  link_url: string | null
  link_label: string | null
  severity: Severity
  audience: Audience
  published_at: string | null
  expires_at: string | null
  created_by: string
  created_at: string
  updated_at: string
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

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'Everyone',
  employers: 'Employers',
  employees: 'Employees',
  admins: 'Admins only',
}

export default function AnnouncementsAdminPage(): React.ReactElement {
  const fetchJson = usePrivyAuthedJson()
  const authedFetch = usePrivyAuthedFetch()
  const qc = useQueryClient()
  const [mode, setMode] = React.useState<
    | { kind: 'idle' }
    | { kind: 'create' }
    | { kind: 'edit'; announcement: Announcement }
  >({ kind: 'idle' })

  const list = useQuery<{ items: Announcement[] }>({
    queryKey: ['admin-announcements'],
    queryFn: () => fetchJson('/api/admin/announcements'),
  })

  const remove = useMutation({
    mutationFn: async (id: string) =>
      authedFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Announcement deleted')
      void qc.invalidateQueries({ queryKey: ['admin-announcements'] })
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[var(--text-muted)]" />
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">System announcements</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Banners that appear at the top of the dashboard for the chosen audience until
            expired or dismissed. Use sparingly — anything that fires every payroll run
            should live in operational notifications, not here.
          </p>
        </div>
        <Button onClick={() => setMode({ kind: 'create' })} disabled={mode.kind !== 'idle'}>
          <Plus className="h-4 w-4" />
          New announcement
        </Button>
      </div>

      {mode.kind === 'create' && (
        <ComposeForm
          mode="create"
          onCancel={() => setMode({ kind: 'idle' })}
          onSaved={() => {
            setMode({ kind: 'idle' })
            void qc.invalidateQueries({ queryKey: ['admin-announcements'] })
          }}
        />
      )}
      {mode.kind === 'edit' && (
        <ComposeForm
          mode="edit"
          existing={mode.announcement}
          onCancel={() => setMode({ kind: 'idle' })}
          onSaved={() => {
            setMode({ kind: 'idle' })
            void qc.invalidateQueries({ queryKey: ['admin-announcements'] })
          }}
        />
      )}

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <header className="border-b border-[var(--border-default)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
          All announcements
        </header>
        {list.isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        ) : !list.data?.items.length ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No announcements yet. Compose one above.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-default)]">
            {list.data.items.map((a) => {
              const Sev = SEVERITY_META[a.severity].icon
              const isLive = isLive_(a)
              return (
                <li key={a.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sev className={`h-3.5 w-3.5 ${SEVERITY_META[a.severity].tint}`} />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] px-1.5 py-0.5">
                          {AUDIENCE_LABEL[a.audience]}
                        </span>
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
                      {a.link_url && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Link: <span className="font-mono">{a.link_url}</span>
                          {a.link_label ? ` · ${a.link_label}` : ''}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Created {new Date(a.created_at).toLocaleString()}
                        {a.expires_at ? ` · expires ${new Date(a.expires_at).toLocaleString()}` : ' · no expiry'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMode({ kind: 'edit', announcement: a })}
                        disabled={mode.kind !== 'idle'}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => remove.mutate(a.id)}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
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
}

function isLive_(a: Announcement): boolean {
  if (!a.published_at) return false
  const now = Date.now()
  if (new Date(a.published_at).getTime() > now) return false
  if (a.expires_at && new Date(a.expires_at).getTime() <= now) return false
  return true
}

type ComposeFormProps =
  | {
      mode: 'create'
      onCancel: () => void
      onSaved: () => void
    }
  | {
      mode: 'edit'
      existing: Announcement
      onCancel: () => void
      onSaved: () => void
    }

/**
 * Convert ISO timestamp → `YYYY-MM-DDTHH:MM` for the datetime-local input.
 * Returns empty string for null. The local input expects no seconds and no
 * timezone suffix, both of which we strip.
 */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

function defaultExpiryInput(): string {
  // 7 days from now in the user's local timezone, formatted for the
  // datetime-local input (YYYY-MM-DDTHH:MM, no seconds, no Z).
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

function ComposeForm(props: ComposeFormProps) {
  const fetchJson = usePrivyAuthedJson()
  const isEdit = props.mode === 'edit'
  const initial = isEdit ? props.existing : null
  const [form, setForm] = React.useState({
    title: initial?.title ?? '',
    body: initial?.body ?? '',
    severity: (initial?.severity ?? 'info') as Severity,
    // Default audience to 'all' — covers the "send to everyone" case which
    // is the most common intent, and avoids the trap where the previous
    // default ('employers') hid messages from employees by mistake.
    audience: (initial?.audience ?? 'all') as Audience,
    link_url: initial?.link_url ?? '',
    link_label: initial?.link_label ?? '',
    // For new announcements, default expiry to 7 days out. For edits, keep
    // whatever's already on the row (could be null/never-expires).
    expires_at: initial
      ? isoToLocalInput(initial.expires_at ?? null)
      : defaultExpiryInput(),
  })
  const [submitting, setSubmitting] = React.useState(false)

  const canSubmit =
    form.title.trim().length > 0 && form.body.trim().length > 0 && !submitting

  // Warn when the chosen expiry is in the past or sooner than 30 minutes —
  // common foot-gun, since you composed a message and may not realize the
  // banner will disappear before anyone sees it.
  const expiryWarning = React.useMemo<string | null>(() => {
    if (!form.expires_at) return null
    const t = new Date(form.expires_at).getTime()
    if (!Number.isFinite(t)) return null
    const minutesAhead = (t - Date.now()) / 60_000
    if (minutesAhead <= 0) return 'Expiry is in the past — the banner will not show.'
    if (minutesAhead < 30) return `Expires in ~${Math.round(minutesAhead)} min — set further out unless this is intentional.`
    return null
  }, [form.expires_at])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        severity: form.severity,
        audience: form.audience,
        link_url: form.link_url.trim() || null,
        link_label: form.link_label.trim() || null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        // On create we publish immediately. On edit we leave published_at
        // alone (server PATCH doesn't read this field unless explicitly sent
        // and we deliberately don't send it).
        ...(isEdit ? {} : { published_at: new Date().toISOString() }),
      }
      const url = isEdit
        ? `/api/admin/announcements/${props.existing.id}`
        : '/api/admin/announcements'
      const method = isEdit ? 'PATCH' : 'POST'
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      toast.success(isEdit ? 'Announcement updated' : 'Announcement published')
      props.onSaved()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEdit
            ? 'Update failed'
            : 'Create failed',
      )
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
          placeholder="Mainnet is live"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--text-muted)]">Body</label>
        <textarea
          rows={3}
          placeholder="One or two sentences explaining the update."
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
          <label className="text-xs text-[var(--text-muted)]">Audience</label>
          <select
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value as Audience })}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-muted)]">Link URL (optional)</label>
          <Input
            placeholder="/changelog or https://docs.remlo.xyz/..."
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-muted)]">Link label (optional)</label>
          <Input
            placeholder="Read the changelog"
            value={form.link_label}
            onChange={(e) => setForm({ ...form, link_label: e.target.value })}
            maxLength={40}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs text-[var(--text-muted)]">Expires at (optional)</label>
          <Input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
          <p className="text-[10px] text-[var(--text-muted)]">
            Leave blank for no auto-expiry. Use this for maintenance windows so the banner clears itself.
          </p>
          {expiryWarning && (
            <p className="text-[11px] text-[var(--status-pending)]">{expiryWarning}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          className="h-10 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
        >
          Cancel
        </button>
        <Button type="submit" disabled={!canSubmit}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Publish'}
        </Button>
      </div>
    </form>
  )
}
