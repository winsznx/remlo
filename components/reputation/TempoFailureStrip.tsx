'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

interface FailureSummary {
  pending: number
  failing: number
  lastFailedAt: string | null
  lastError: string | null
  lastSignerPath: 'privy' | 'legacy' | null
  failingRows: Array<{
    id: string
    subject_address: string
    schema_id: string
    tempo_broadcast_failures: number
    last_tempo_error: string | null
    last_signer_path: 'privy' | 'legacy' | null
    updated_at: string
  }>
}

export function TempoFailureStrip() {
  const [expanded, setExpanded] = React.useState(false)
  const fetchJson = usePrivyAuthedJson()
  const queryClient = useQueryClient()

  const summaryQuery = useQuery({
    queryKey: ['tempo-reputation-failures'],
    queryFn: () => fetchJson<FailureSummary>('/api/reputation/tempo-failures'),
    refetchInterval: 30_000,
  })

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetchJson<{ ok: true; id: string }>(
        '/api/reputation/tempo-failures',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tempo-reputation-failures'] })
    },
  })

  const summary = summaryQuery.data
  if (!summary) return null
  if (summary.pending === 0 && summary.failing === 0) return null

  return (
    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-3 text-sm">
      <button
        type="button"
        className="w-full flex items-center gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
        <span className="text-[var(--text-primary)]">
          Tempo reputation writes: {summary.pending} pending
          {summary.failing > 0 && (
            <>
              , <span className="text-orange-700 dark:text-orange-300">{summary.failing} failed</span>
            </>
          )}
          {summary.lastFailedAt && (
            <span className="text-[var(--text-muted)]">
              {' '}(last: {new Date(summary.lastFailedAt).toLocaleTimeString()})
            </span>
          )}
        </span>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {expanded ? 'hide' : 'show'}
        </span>
      </button>

      {expanded && summary.failingRows.length > 0 && (
        <div className="mt-3 space-y-2">
          {summary.failingRows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--text-primary)] truncate">
                    {row.schema_id}
                  </div>
                  <div className="text-[var(--text-muted)] font-mono truncate">
                    subject: {row.subject_address}
                  </div>
                  {row.last_tempo_error && (
                    <div className="mt-1 text-orange-700 dark:text-orange-300 line-clamp-2">
                      {row.last_tempo_error}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                    {row.tempo_broadcast_failures} failure{row.tempo_broadcast_failures === 1 ? '' : 's'}
                    {row.last_signer_path && ` · signer: ${row.last_signer_path}`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => retryMutation.mutate(row.id)}
                  disabled={retryMutation.isPending && retryMutation.variables === row.id}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
