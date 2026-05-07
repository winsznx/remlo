'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Plus, Trash2, Shield, Loader2, Search, BadgeCheck, ExternalLink, ShieldAlert, Pause, Play, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

interface AgentAuthorization {
  id: string
  employer_id: string
  label: string
  agent_identifier: string
  per_tx_cap_usd: number
  per_day_cap_usd: number
  active: boolean
  created_at: string
  revoked_at: string | null
  identity_kind?: 'hmac' | 'erc8004_tempo' | 'sas_solana'
  solana_pubkey?: string | null
  erc8004_agent_id?: string | null
  erc8004_owner_address?: string | null
  velocity_per_minute?: number
  allowed_recipients?: string[] | null
  paused_at?: string | null
  pause_reason?: string | null
  per_tx_cap_original_usd?: number | null
  cap_halved_at?: string | null
  cap_halved_reason?: string | null
}

interface AgentReputation {
  total_feedback_count: number
  average_score: number | null
  feedback_by_tag: Record<string, number>
  latest_feedback_at: string | null
}

interface AgentProfile {
  agent_identifier: string
  agent_id: string
  chain: 'tempo' | 'solana'
  owner_address: string
  display_name: string | null
  description: string | null
  endpoint: string | null
  capabilities: string[]
  contact_url: string | null
  registered_at: string | null
  last_refreshed_at: string | null
  reputation?: AgentReputation | null
}

interface ProfileResolution {
  kind: 'remlo_registered' | 'unregistered'
  profile: AgentProfile
}

interface DirectoryResponse {
  agents: AgentProfile[]
  next_cursor: string | null
  listed_at: string
}

type IdentityKind = 'hmac' | 'erc8004_tempo' | 'sas_solana'

const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export default function AgentsSettingsPage(): React.ReactElement {
  const { data: employer } = useEmployer()
  const fetchJson = usePrivyAuthedJson()
  const queryClient = useQueryClient()

  const employerId = employer?.id
  const queryKey = ['agent-authorizations', employerId]

  const { data: authorizations, isLoading } = useQuery<AgentAuthorization[]>({
    queryKey,
    queryFn: () => fetchJson(`/api/employers/${employerId}/authorize-agent`),
    enabled: Boolean(employerId),
  })

  const [identityKind, setIdentityKind] = React.useState<IdentityKind>('hmac')
  const [form, setForm] = React.useState({
    label: '',
    agent_identifier: '',
    erc8004_agent_id: '',
    solana_pubkey: '',
    per_tx_cap_usd: '100',
    per_day_cap_usd: '500',
  })
  const [browseOpen, setBrowseOpen] = React.useState(false)

  // Live profile lookup as the employer types an ERC-8004 agent ID. Hits the
  // public /api/agents/profile/erc8004:tempo:<id> endpoint with a 350ms
  // debounce so we don't pound the Tempo RPC on every keystroke. Returns
  // either a Remlo-registered profile (rich) or an "unregistered" fallback
  // (just the on-chain owner). 404 surfaces as null.
  const debouncedAgentId = useDebouncedValue(form.erc8004_agent_id.trim(), 350)
  const profileQueryEnabled =
    identityKind === 'erc8004_tempo' && /^\d+$/.test(debouncedAgentId)
  const profileQuery = useQuery<ProfileResolution | null>({
    queryKey: ['agent-profile-resolve', debouncedAgentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/agents/profile/${encodeURIComponent(`erc8004:tempo:${debouncedAgentId}`)}`,
      )
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`Lookup failed (${res.status})`)
      return (await res.json()) as ProfileResolution
    },
    enabled: profileQueryEnabled,
    staleTime: 60_000,
  })

  const create = useMutation({
    mutationFn: async () => {
      const payload =
        identityKind === 'erc8004_tempo'
          ? {
              identity_kind: 'erc8004_tempo' as const,
              label: form.label,
              erc8004_agent_id: form.erc8004_agent_id.trim(),
              per_tx_cap_usd: Number(form.per_tx_cap_usd),
              per_day_cap_usd: Number(form.per_day_cap_usd),
            }
          : identityKind === 'sas_solana'
            ? {
                identity_kind: 'sas_solana' as const,
                label: form.label,
                solana_pubkey: form.solana_pubkey.trim(),
                per_tx_cap_usd: Number(form.per_tx_cap_usd),
                per_day_cap_usd: Number(form.per_day_cap_usd),
              }
            : {
                identity_kind: 'hmac' as const,
                label: form.label,
                agent_identifier: form.agent_identifier,
                per_tx_cap_usd: Number(form.per_tx_cap_usd),
                per_day_cap_usd: Number(form.per_day_cap_usd),
              }
      return fetchJson(`/api/employers/${employerId}/authorize-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success('Agent authorized.')
      setForm({
        label: '',
        agent_identifier: '',
        erc8004_agent_id: '',
        solana_pubkey: '',
        per_tx_cap_usd: '100',
        per_day_cap_usd: '500',
      })
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to authorize agent')
    },
  })

  const revoke = useMutation({
    mutationFn: async (authorizationId: string) => {
      return fetchJson(`/api/employers/${employerId}/authorize-agent?authorization_id=${authorizationId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      toast.success('Authorization revoked.')
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke')
    },
  })

  // Emergency kill switch — gate 1 of the six-gate security model. Pauses
  // every active authorization in one call. Subsequent /api/mpp/agent/pay
  // requests for any of these agents return 403 AGENT_PAUSED until the
  // employer hits the resume button. See docs/protocol/security.
  const pauseAll = useMutation({
    mutationFn: async (reason: string | null) => {
      return fetchJson(`/api/employers/${employerId}/agents/pause-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reason ? { reason } : {}),
      })
    },
    onSuccess: (data: unknown) => {
      const count =
        typeof data === 'object' && data !== null && 'paused_count' in data
          ? (data as { paused_count: number }).paused_count
          : 0
      toast.success(
        count > 0
          ? `Paused ${count} agent${count === 1 ? '' : 's'}. All payments blocked until resumed.`
          : 'No agents needed pausing — all already paused.',
      )
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to pause agents')
    },
  })

  const resumeAll = useMutation({
    mutationFn: async () => {
      return fetchJson(`/api/employers/${employerId}/agents/pause-all`, {
        method: 'DELETE',
      })
    },
    onSuccess: (data: unknown) => {
      const count =
        typeof data === 'object' && data !== null && 'resumed_count' in data
          ? (data as { resumed_count: number }).resumed_count
          : 0
      toast.success(
        count > 0
          ? `Resumed ${count} agent${count === 1 ? '' : 's'}.`
          : 'No paused agents to resume.',
      )
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to resume agents')
    },
  })

  const pausedCount = (authorizations ?? []).filter(
    (a) => a.active && a.paused_at,
  ).length
  const activeUnpausedCount = (authorizations ?? []).filter(
    (a) => a.active && !a.paused_at,
  ).length

  const isErc8004Valid =
    identityKind === 'erc8004_tempo' && /^\d+$/.test(form.erc8004_agent_id.trim())
  const isHmacValid = identityKind === 'hmac' && form.agent_identifier.trim().length > 0
  const isSolanaValid =
    identityKind === 'sas_solana' && SOLANA_PUBKEY_REGEX.test(form.solana_pubkey.trim())
  const canSubmit =
    form.label.trim() &&
    (isErc8004Valid || isHmacValid || isSolanaValid) &&
    !create.isPending

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Authorized Agents"
        description="Grant external AI agents permission to trigger payments from your treasury. Every agent gets a per-transaction and per-day spend cap. Calls flow through the x402-gated /api/mpp/agent/pay endpoint."
      />

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Authorize a new agent</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)]">Identity kind</label>
            <div
              role="radiogroup"
              aria-label="Identity kind"
              className="grid gap-2 sm:grid-cols-3"
            >
              <KindRadio
                checked={identityKind === 'hmac'}
                title="Tier 1 — HMAC"
                subtitle="Issue a signing secret. Fast, single-employer."
                onSelect={() => setIdentityKind('hmac')}
              />
              <KindRadio
                checked={identityKind === 'erc8004_tempo'}
                title="Tier 2 — ERC-8004"
                subtitle="ERC-8004 identity on Tempo. Reputation portable."
                onSelect={() => setIdentityKind('erc8004_tempo')}
              />
              <KindRadio
                checked={identityKind === 'sas_solana'}
                title="Tier 2 — Solana"
                subtitle="Solana pubkey. Ed25519 signature, no on-chain mint."
                onSelect={() => setIdentityKind('sas_solana')}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-muted)]">Label</label>
              <Input
                placeholder="e.g. Payroll automation bot"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            {identityKind === 'hmac' && (
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-muted)]">Agent identifier</label>
                <Input
                  placeholder="0x... or https://agentcard.example/id"
                  value={form.agent_identifier}
                  onChange={(e) => setForm({ ...form, agent_identifier: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Anything stable the agent will send as <code className="font-mono">X-Agent-Identifier</code>.
                </p>
              </div>
            )}
            {identityKind === 'erc8004_tempo' && (
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[var(--text-muted)]">ERC-8004 agent ID</label>
                  <button
                    type="button"
                    onClick={() => setBrowseOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                  >
                    <Search className="h-3 w-3" />
                    Browse directory
                  </button>
                </div>
                <Input
                  inputMode="numeric"
                  placeholder="e.g. 42"
                  value={form.erc8004_agent_id}
                  onChange={(e) => setForm({ ...form, erc8004_agent_id: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  uint256 from the IdentityRegistry on Tempo. Agent operator can register at{' '}
                  <a className="text-[var(--accent)] hover:underline" href="/agents/register">
                    /agents/register
                  </a>
                  . We resolve the owner on-chain on submit.
                </p>
                <ProfilePreview
                  enabled={profileQueryEnabled}
                  loading={profileQuery.isFetching}
                  data={profileQuery.data ?? null}
                  error={profileQuery.error}
                />
              </div>
            )}
            {identityKind === 'sas_solana' && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs text-[var(--text-muted)]">Solana pubkey</label>
                <Input
                  placeholder="e.g. 3N5z9...DfA7"
                  value={form.solana_pubkey}
                  onChange={(e) => setForm({ ...form, solana_pubkey: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Base58-encoded 32-byte Solana public key. The agent signs every Remlo
                  request with the matching private key (Ed25519). No on-chain mint
                  required — the pubkey itself is the identity.
                </p>
                {form.solana_pubkey.trim() && !SOLANA_PUBKEY_REGEX.test(form.solana_pubkey.trim()) && (
                  <p className="text-[10px] text-[var(--status-error)]">
                    Not a valid base58 Solana pubkey (expected 32–44 chars, no 0/O/I/l).
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-muted)]">Per-transaction cap (USD)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.per_tx_cap_usd}
                onChange={(e) => setForm({ ...form, per_tx_cap_usd: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-muted)]">Per-day cap (USD)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.per_day_cap_usd}
                onChange={(e) => setForm({ ...form, per_day_cap_usd: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={() => create.mutate()} disabled={!canSubmit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Authorize agent
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active authorizations</h3>
            {pausedCount > 0 && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-medium bg-[var(--status-warning)]/10 text-[var(--status-warning)]">
                {pausedCount} paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {pausedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => resumeAll.mutate()}
                disabled={resumeAll.isPending}
              >
                {resumeAll.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Resume all
              </Button>
            )}
            {activeUnpausedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    !window.confirm(
                      `Emergency pause ${activeUnpausedCount} agent${activeUnpausedCount === 1 ? '' : 's'}? All payments will be blocked until you resume.`,
                    )
                  ) {
                    return
                  }
                  const reason = window.prompt('Optional pause reason (shown in audit log):') ?? null
                  pauseAll.mutate(reason && reason.trim().length > 0 ? reason.trim() : null)
                }}
                disabled={pauseAll.isPending}
                className="border-[var(--status-error)]/30 text-[var(--status-error)] hover:bg-[var(--status-error)]/5"
              >
                {pauseAll.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}
                Emergency pause all
              </Button>
            )}
          </div>
        </div>

        {pausedCount > 0 && (
          <div className="px-5 py-3 bg-[var(--status-warning)]/5 border-b border-[var(--status-warning)]/20">
            <div className="flex items-start gap-2">
              <Pause className="h-4 w-4 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--text-primary)]">
                <p className="font-medium">
                  {pausedCount} agent{pausedCount === 1 ? ' is' : 's are'} currently paused.
                </p>
                <p className="text-[var(--text-muted)] mt-0.5">
                  Calls to <code className="font-mono">/api/mpp/agent/pay</code> for paused agents return
                  403 immediately. Hit Resume all when the threat has cleared, or revoke individual agents
                  permanently.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-16 bg-[var(--bg-subtle)] rounded-xl" />
            <div className="h-16 bg-[var(--bg-subtle)] rounded-xl" />
          </div>
        ) : !authorizations?.length ? (
          <div className="p-8 text-center">
            <Bot className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No agents authorized yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Authorize an agent above to let it call /api/mpp/agent/pay with your treasury.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            <AnimatePresence initial={false}>
              {authorizations.map((auth) => (
                <motion.div
                  key={auth.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{auth.label}</p>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-medium ${
                            auth.active
                              ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                              : 'bg-[var(--status-error)]/10 text-[var(--status-error)]'
                          }`}
                        >
                          {auth.active ? 'Active' : 'Revoked'}
                        </span>
                        {auth.paused_at && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-medium bg-[var(--status-warning)]/10 text-[var(--status-warning)] inline-flex items-center gap-1">
                            <Pause className="h-2.5 w-2.5" />
                            Paused
                          </span>
                        )}
                        {auth.cap_halved_at && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-medium bg-[var(--status-error)]/10 text-[var(--status-error)] inline-flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Cap halved
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-medium ${
                            (auth.identity_kind ?? 'hmac') === 'hmac'
                              ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                              : 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                          }`}
                        >
                          {auth.identity_kind === 'erc8004_tempo'
                            ? 'Tier 2 · ERC-8004'
                            : auth.identity_kind === 'sas_solana'
                              ? 'Tier 2 · Solana'
                              : 'Tier 1 · HMAC'}
                        </span>
                        <p className="font-mono text-xs text-[var(--mono)] break-all">
                          {auth.agent_identifier}
                        </p>
                      </div>
                      {auth.solana_pubkey && (
                        <p className="font-mono text-[11px] text-[var(--text-muted)] break-all">
                          Pubkey: {auth.solana_pubkey}
                        </p>
                      )}
                      {auth.erc8004_owner_address && (
                        <p className="font-mono text-[11px] text-[var(--text-muted)] break-all">
                          Owner: {auth.erc8004_owner_address}
                        </p>
                      )}
                      <div className="flex gap-4 text-xs text-[var(--text-muted)] flex-wrap">
                        <span>
                          Per-tx: ${Number(auth.per_tx_cap_usd).toFixed(2)}
                          {auth.cap_halved_at && auth.per_tx_cap_original_usd && (
                            <span className="ml-1 line-through opacity-60">
                              ${Number(auth.per_tx_cap_original_usd).toFixed(2)}
                            </span>
                          )}
                        </span>
                        <span>Per-day: ${Number(auth.per_day_cap_usd).toFixed(2)}</span>
                        <span>Velocity: {auth.velocity_per_minute ?? 5}/min</span>
                        {auth.allowed_recipients && auth.allowed_recipients.length > 0 && (
                          <span>Allowlist: {auth.allowed_recipients.length} address(es)</span>
                        )}
                        <span>Created {new Date(auth.created_at).toLocaleDateString()}</span>
                      </div>
                      {auth.paused_at && auth.pause_reason && (
                        <p className="text-xs text-[var(--status-warning)] mt-1">
                          Pause reason: {auth.pause_reason}
                        </p>
                      )}
                      {auth.cap_halved_at && auth.cap_halved_reason && (
                        <p className="text-xs text-[var(--status-error)] mt-1">
                          {auth.cap_halved_reason}
                        </p>
                      )}
                    </div>
                    {auth.active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revoke.mutate(auth.id)}
                        disabled={revoke.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {browseOpen && (
        <BrowseDirectoryModal
          onClose={() => setBrowseOpen(false)}
          onPick={(profile) => {
            setIdentityKind('erc8004_tempo')
            setForm((f) => ({
              ...f,
              erc8004_agent_id: profile.agent_id,
              label: f.label.trim() || profile.display_name || `Agent ${profile.agent_id}`,
            }))
            setBrowseOpen(false)
          }}
        />
      )}
    </div>
  )
}

interface KindRadioProps {
  checked: boolean
  title: string
  subtitle: string
  onSelect: () => void
}

function KindRadio({ checked, title, subtitle, onSelect }: KindRadioProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex h-full flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        checked
          ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
          : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
      }`}
    >
      <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
      <span className="text-[11px] leading-snug text-[var(--text-secondary)]">{subtitle}</span>
    </button>
  )
}

interface ProfilePreviewProps {
  enabled: boolean
  loading: boolean
  data: ProfileResolution | null
  error: unknown
}

function ProfilePreview({ enabled, loading, data, error }: ProfilePreviewProps) {
  if (!enabled) return null
  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-muted)] flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Resolving on Tempo…
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-[var(--status-error)]/20 bg-[var(--status-error)]/5 px-3 py-2 text-xs text-[var(--status-error)]">
        {error instanceof Error ? error.message : 'Lookup failed'}
      </div>
    )
  }
  if (!data) {
    return (
      <div className="rounded-lg border border-[var(--status-error)]/20 bg-[var(--status-error)]/5 px-3 py-2 text-xs text-[var(--status-error)]">
        Agent ID not found on the IdentityRegistry. Confirm the operator has minted via{' '}
        <a className="underline" href="/agents/register" target="_blank" rel="noopener noreferrer">
          /agents/register
        </a>
        .
      </div>
    )
  }
  const isRegistered = data.kind === 'remlo_registered'
  return (
    <div
      className={`rounded-xl border p-3 space-y-2 ${
        isRegistered
          ? 'border-[var(--accent)]/30 bg-[var(--accent-subtle)]/40'
          : 'border-[var(--border-default)] bg-[var(--bg-subtle)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {isRegistered && <BadgeCheck className="h-4 w-4 text-[var(--accent)]" />}
        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {data.profile.display_name ?? `Agent ${data.profile.agent_id}`}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {isRegistered ? 'Registered on Remlo' : 'Unregistered (chain only)'}
        </span>
      </div>
      {data.profile.description && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {data.profile.description}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-[10px] uppercase text-[var(--text-muted)]">Owner</div>
          <div className="font-mono text-[var(--text-primary)] truncate">
            {data.profile.owner_address}
          </div>
        </div>
        {data.profile.last_refreshed_at && (
          <div>
            <div className="text-[10px] uppercase text-[var(--text-muted)]">Last refreshed</div>
            <div className="text-[var(--text-primary)]">
              {new Date(data.profile.last_refreshed_at).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
      {data.profile.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.profile.capabilities.map((cap) => (
            <span
              key={cap}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]"
            >
              {cap}
            </span>
          ))}
        </div>
      )}
      {data.profile.reputation && data.profile.reputation.total_feedback_count > 0 && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 mt-1">
          <ReputationStat label="Feedback" value={String(data.profile.reputation.total_feedback_count)} />
          <ReputationStat
            label="Avg score"
            value={data.profile.reputation.average_score !== null ? String(Math.round(data.profile.reputation.average_score)) : '—'}
          />
          <ReputationStat
            label="Tags"
            value={String(Object.keys(data.profile.reputation.feedback_by_tag).length)}
          />
        </div>
      )}
    </div>
  )
}

function ReputationStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

interface BrowseDirectoryModalProps {
  onClose: () => void
  onPick: (profile: AgentProfile) => void
}

function BrowseDirectoryModal({ onClose, onPick }: BrowseDirectoryModalProps) {
  const [search, setSearch] = React.useState('')
  const directoryQuery = useQuery<DirectoryResponse>({
    queryKey: ['agent-directory'],
    queryFn: async () => {
      const res = await fetch('/api/agents/directory?limit=50')
      if (!res.ok) throw new Error(`Directory failed (${res.status})`)
      return (await res.json()) as DirectoryResponse
    },
    staleTime: 60_000,
  })

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const filteredAgents = React.useMemo(() => {
    if (!directoryQuery.data) return []
    const needle = search.trim().toLowerCase()
    if (!needle) return directoryQuery.data.agents
    return directoryQuery.data.agents.filter((a) => {
      return (
        (a.display_name ?? '').toLowerCase().includes(needle) ||
        (a.description ?? '').toLowerCase().includes(needle) ||
        a.capabilities.some((c) => c.toLowerCase().includes(needle)) ||
        a.agent_id.includes(needle)
      )
    })
  }, [directoryQuery.data, search])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-overlay)] shadow-2xl">
        <header className="px-5 py-4 border-b border-[var(--border-default)] flex items-center gap-3">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            autoFocus
            placeholder="Search agents by name, capability, or agent ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Close ↵
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          {directoryQuery.isLoading ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading directory…
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              {search ? 'No agents match your search.' : 'No agents are registered yet.'}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filteredAgents.map((agent) => (
                <li key={agent.agent_identifier}>
                  <button
                    type="button"
                    onClick={() => onPick(agent)}
                    className="w-full text-left rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] p-3 transition-colors flex items-start gap-3"
                  >
                    <BadgeCheck className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {agent.display_name ?? `Agent ${agent.agent_id}`}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          erc8004:tempo:{agent.agent_id}
                        </span>
                      </div>
                      {agent.description && (
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                      {agent.capabilities.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {agent.capabilities.slice(0, 6).map((cap) => (
                            <span
                              key={cap}
                              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                      {agent.reputation && agent.reputation.total_feedback_count > 0 && (
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                          <span>
                            <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                              {agent.reputation.total_feedback_count}
                            </span>{' '}
                            feedback
                          </span>
                          {agent.reputation.average_score !== null && (
                            <span>
                              avg{' '}
                              <span className="text-[var(--text-primary)] font-semibold tabular-nums">
                                {Math.round(agent.reputation.average_score)}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)] mt-1 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="px-5 py-3 border-t border-[var(--border-default)] text-[11px] text-[var(--text-muted)]">
          {directoryQuery.data?.agents.length ?? 0} agent{(directoryQuery.data?.agents.length ?? 0) === 1 ? '' : 's'} listed.{' '}
          <a className="text-[var(--accent)] hover:underline" href="/agents" target="_blank" rel="noopener noreferrer">
            See full directory →
          </a>
        </footer>
      </div>
    </div>
  )
}
