'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Clock, ThumbsDown, ThumbsUp } from 'lucide-react'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'

interface ValidatorVote {
  id: string
  validator_id: string
  validator_address: string
  validator_type: 'llm_claude' | 'llm_gpt4' | 'human' | 'oracle'
  verdict: 'approved' | 'rejected'
  confidence: number | null
  reasoning: string | null
  voted_at: string
}

interface VotesResponse {
  votes: ValidatorVote[]
  consensus: {
    reached: boolean
    verdict: 'approved' | 'rejected' | 'pending'
    approveCount: number
    rejectCount: number
    totalVotes: number
    requiredVotes: number
    confidence: number
  }
  caller_is_validator: boolean
  caller_has_voted: boolean
}

interface ValidatorVotesPanelProps {
  escrowId: string
  escrowStatus: string
}

export function ValidatorVotesPanel({
  escrowId,
  escrowStatus,
}: ValidatorVotesPanelProps): React.ReactElement | null {
  const authedFetch = usePrivyAuthedFetch()
  const queryClient = useQueryClient()
  const [reasoning, setReasoning] = React.useState('')
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const query = useQuery<VotesResponse | null>({
    queryKey: ['escrow-votes', escrowId],
    queryFn: async () => {
      const res = await authedFetch(`/api/escrows/${escrowId}/votes`)
      if (!res.ok) return null
      return (await res.json()) as VotesResponse
    },
    refetchInterval: escrowStatus === 'voting' ? 5_000 : false,
  })

  const voteMutation = useMutation({
    mutationFn: async (verdict: 'approved' | 'rejected') => {
      setSubmitError(null)
      const res = await authedFetch(`/api/escrows/${escrowId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict, reasoning: reasoning.trim() || undefined }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      setReasoning('')
      queryClient.invalidateQueries({ queryKey: ['escrow-votes', escrowId] })
      queryClient.invalidateQueries({ queryKey: ['escrow', escrowId] })
    },
    onError: (err) => {
      setSubmitError(err instanceof Error ? err.message : 'Vote failed')
    },
  })

  if (!query.data) return null
  const { votes, consensus, caller_is_validator, caller_has_voted } = query.data

  // Only show the panel if there are votes OR the escrow is in a voting
  // state — otherwise it's pure noise on a vanilla single-Claude flow.
  if (votes.length === 0 && escrowStatus !== 'voting') return null

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Validator votes
        </p>
        <ConsensusBadge consensus={consensus} />
      </div>

      {votes.length > 0 ? (
        <div className="space-y-2">
          {votes.map((v) => (
            <VoteRow key={v.id} vote={v} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          Waiting for the first validator vote…
        </p>
      )}

      {escrowStatus === 'voting' && caller_is_validator && !caller_has_voted && (
        <div className="border-t border-[var(--border-default)] pt-4 space-y-3">
          <p className="text-xs font-medium text-[var(--text-primary)]">Cast your vote</p>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Optional reasoning…"
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-md bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => voteMutation.mutate('approved')}
              disabled={voteMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--status-success)]/30 bg-[var(--status-success)]/10 text-[var(--status-success)] hover:bg-[var(--status-success)]/15 disabled:opacity-50"
            >
              <ThumbsUp className="h-3 w-3" /> Approve
            </button>
            <button
              type="button"
              onClick={() => voteMutation.mutate('rejected')}
              disabled={voteMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--status-error)]/30 bg-[var(--status-error)]/10 text-[var(--status-error)] hover:bg-[var(--status-error)]/15 disabled:opacity-50"
            >
              <ThumbsDown className="h-3 w-3" /> Reject
            </button>
            {voteMutation.isPending && (
              <span className="text-xs text-[var(--text-muted)] self-center">Casting…</span>
            )}
          </div>
          {submitError && (
            <p className="text-xs text-[var(--status-error)] flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {submitError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ConsensusBadge({
  consensus,
}: {
  consensus: VotesResponse['consensus']
}): React.ReactElement {
  const { approveCount, rejectCount, totalVotes, requiredVotes, reached, verdict } = consensus
  const summary = `${approveCount} approve / ${rejectCount} reject · ${totalVotes}/${requiredVotes}`
  if (reached) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          verdict === 'approved'
            ? 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/30'
            : 'bg-[var(--status-error)]/10 text-[var(--status-error)] border-[var(--status-error)]/30'
        }`}
      >
        <CheckCircle2 className="h-3 w-3" />
        {verdict} — {summary}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-pending)]/30 bg-[var(--status-pending)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--status-pending)]">
      <Clock className="h-3 w-3" /> awaiting — {summary}
    </span>
  )
}

function VoteRow({ vote }: { vote: ValidatorVote }): React.ReactElement {
  const confidencePct = vote.confidence !== null ? Math.round(vote.confidence * 100) : null
  return (
    <div className="flex items-start gap-3 text-xs">
      <span
        className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase ${
          vote.verdict === 'approved'
            ? 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/30'
            : 'bg-[var(--status-error)]/10 text-[var(--status-error)] border-[var(--status-error)]/30'
        }`}
      >
        {vote.verdict}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)]">{vote.validator_type}</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {vote.validator_address.slice(0, 12)}…
          </span>
          {confidencePct !== null && (
            <span className="text-[10px] text-[var(--text-muted)]">{confidencePct}% confidence</span>
          )}
        </div>
        {vote.reasoning && (
          <p className="text-[var(--text-secondary)] line-clamp-2 mt-0.5">{vote.reasoning}</p>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          {new Date(vote.voted_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
