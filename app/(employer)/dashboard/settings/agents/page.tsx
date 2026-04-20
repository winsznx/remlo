'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Plus, Trash2, Shield, Loader2 } from 'lucide-react'
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

  const [form, setForm] = React.useState({
    label: '',
    agent_identifier: '',
    per_tx_cap_usd: '100',
    per_day_cap_usd: '500',
  })

  const create = useMutation({
    mutationFn: async () => {
      return fetchJson(`/api/employers/${employerId}/authorize-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          agent_identifier: form.agent_identifier,
          per_tx_cap_usd: Number(form.per_tx_cap_usd),
          per_day_cap_usd: Number(form.per_day_cap_usd),
        }),
      })
    },
    onSuccess: () => {
      toast.success('Agent authorized.')
      setForm({ label: '', agent_identifier: '', per_tx_cap_usd: '100', per_day_cap_usd: '500' })
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

  const canSubmit = form.label.trim() && form.agent_identifier.trim() && !create.isPending

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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)]">Label</label>
            <Input
              placeholder="e.g. Payroll automation bot"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-muted)]">Agent identifier</label>
            <Input
              placeholder="0x... or https://agentcard.example/id"
              value={form.agent_identifier}
              onChange={(e) => setForm({ ...form, agent_identifier: e.target.value })}
              className="font-mono text-xs"
            />
          </div>
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

        <Button
          className="mt-4"
          onClick={() => create.mutate()}
          disabled={!canSubmit}
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Authorize agent
        </Button>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-default)]">
          <Shield className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active authorizations</h3>
        </div>

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
                      </div>
                      <p className="font-mono text-xs text-[var(--mono)] break-all">{auth.agent_identifier}</p>
                      <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                        <span>Per-tx: ${Number(auth.per_tx_cap_usd).toFixed(2)}</span>
                        <span>Per-day: ${Number(auth.per_day_cap_usd).toFixed(2)}</span>
                        <span>Created {new Date(auth.created_at).toLocaleDateString()}</span>
                      </div>
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
    </div>
  )
}
