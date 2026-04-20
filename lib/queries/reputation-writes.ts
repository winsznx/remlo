/**
 * lib/queries/reputation-writes.ts
 *
 * Thin Supabase wrapper around the `reputation_writes` queue table introduced
 * in 20260421_add_reputation_writes.sql. Service-role only for writes; public
 * read is enforced at the RLS layer (only `status='written'` rows visible).
 *
 * Uses a locally-typed Supabase client because `database.types.ts` lags the
 * migration. After the operator regenerates types, this file can switch back
 * to the shared `createServerClient` from `@/lib/supabase-server`.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ReputationChain = 'solana' | 'tempo'
export type ReputationStatus = 'pending' | 'written' | 'failed' | 'giving_up'
export type ReputationSourceType = 'payment_item' | 'escrow' | 'agent_pay_call' | 'employer'

export interface ReputationWrite {
  id: string
  chain: ReputationChain
  subject_address: string
  schema_id: string
  source_type: ReputationSourceType
  source_id: string | null
  payload: Record<string, unknown>
  attestation_pda: string | null
  tx_signature: string | null
  status: ReputationStatus
  attempts: number
  last_error: string | null
  tempo_broadcast_failures: number
  last_tempo_error: string | null
  last_signer_path: 'privy' | 'legacy' | null
  created_at: string
  updated_at: string
  written_at: string | null
}

// We can't extend the generated Database type cleanly with v2 supabase-js
// (PostgrestVersion 12 generic resolution rejects intersected schemas).
// So we declare a standalone Database type containing only the new table and
// use it for this module's client. Other modules continue to use the full
// generated Database type from `@/lib/supabase-server`.
// We use an untyped Supabase client here because (a) the generated
// `database.types.ts` lags this migration and (b) Postgrest 12's generic
// resolution doesn't accept locally-declared schema augmentations cleanly.
// Type safety is enforced at this module's exported function boundaries —
// each function accepts/returns concrete `ReputationWrite*` interfaces.
// Cleanup: after `pnpm supabase gen types` is re-run post-migration,
// switch back to `createServerClient` from `@/lib/supabase-server`.
function reputationClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface EnqueueParams {
  chain: ReputationChain
  subject_address: string
  schema_id: string
  source_type: ReputationSourceType
  source_id?: string | null
  payload?: Record<string, unknown>
}

export async function enqueueReputationWrite(
  params: EnqueueParams,
): Promise<ReputationWrite | null> {
  const client = reputationClient()
  const { data, error } = await client
    .from('reputation_writes')
    .insert({
      chain: params.chain,
      subject_address: params.subject_address,
      schema_id: params.schema_id,
      source_type: params.source_type,
      source_id: params.source_id ?? null,
      payload: params.payload ?? {},
      status: 'pending',
    })
    .select('*')
    .single()
  if (error) {
    throw new Error(
      `enqueueReputationWrite failed (chain=${params.chain}, schema=${params.schema_id}): ${error.message}`,
    )
  }
  return (data as ReputationWrite | null) ?? null
}

/**
 * Used by the cron worker — pulls a bounded batch of pending+failed rows
 * with attempt count below the give-up threshold.
 */
export async function fetchPendingReputationWrites(
  limit = 20,
  maxAttempts = 5,
): Promise<ReputationWrite[]> {
  const client = reputationClient()
  const { data } = await client
    .from('reputation_writes')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempts', maxAttempts)
    .order('created_at', { ascending: true })
    .limit(limit)
  return (data as ReputationWrite[] | null) ?? []
}

export async function markReputationWriteWritten(
  id: string,
  details: {
    attestation_pda?: string | null
    tx_signature?: string | null
    signer_path?: 'privy' | 'legacy' | null
  },
): Promise<void> {
  const client = reputationClient()
  await client
    .from('reputation_writes')
    .update({
      status: 'written',
      attestation_pda: details.attestation_pda ?? null,
      tx_signature: details.tx_signature ?? null,
      last_signer_path: details.signer_path ?? null,
      last_tempo_error: null,
      written_at: new Date().toISOString(),
    })
    .eq('id', id)
}

export async function markReputationWriteFailed(
  id: string,
  attempts: number,
  error: string,
  giveUpAfter = 5,
  chain: ReputationChain = 'solana',
): Promise<void> {
  const client = reputationClient()
  const nextStatus: ReputationStatus = attempts >= giveUpAfter ? 'giving_up' : 'failed'
  const update: Record<string, unknown> = {
    status: nextStatus,
    attempts,
    last_error: error.slice(0, 2000),
  }
  if (chain === 'tempo') {
    // Bump Tempo-specific counters so the dashboard strip can surface
    // broadcast failures independently of the Solana counter.
    const { data: row } = await client
      .from('reputation_writes')
      .select('tempo_broadcast_failures')
      .eq('id', id)
      .single()
    const prev =
      ((row as { tempo_broadcast_failures?: number } | null)?.tempo_broadcast_failures ?? 0) + 1
    update.tempo_broadcast_failures = prev
    update.last_tempo_error = error.slice(0, 2000)
  }
  await client.from('reputation_writes').update(update).eq('id', id)
}

/**
 * Resets a failed/giving_up Tempo reputation write so the next cron tick
 * retries it. Keeps tempo_broadcast_failures (audit history) but clears
 * last_error so the dashboard strip can show the next attempt fresh.
 */
export async function retryTempoReputationWrite(id: string): Promise<void> {
  const client = reputationClient()
  await client
    .from('reputation_writes')
    .update({
      status: 'pending',
      attempts: 0,
      last_error: null,
    })
    .eq('id', id)
    .eq('chain', 'tempo')
}

export interface TempoReputationFailureSummary {
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

export async function getTempoReputationFailureSummary(
  maxFailingRows = 20,
): Promise<TempoReputationFailureSummary> {
  const client = reputationClient()

  const pendingPromise = client
    .from('reputation_writes')
    .select('id', { count: 'exact', head: true })
    .eq('chain', 'tempo')
    .eq('status', 'pending')

  const failingPromise = client
    .from('reputation_writes')
    .select(
      'id, subject_address, schema_id, tempo_broadcast_failures, last_tempo_error, last_signer_path, updated_at',
    )
    .eq('chain', 'tempo')
    .in('status', ['failed', 'giving_up'])
    .order('updated_at', { ascending: false })
    .limit(maxFailingRows)

  const [pendingRes, failingRes] = await Promise.all([pendingPromise, failingPromise])

  const failing =
    (failingRes.data as TempoReputationFailureSummary['failingRows'] | null) ?? []
  const latest = failing[0]

  return {
    pending: pendingRes.count ?? 0,
    failing: failing.length,
    lastFailedAt: latest?.updated_at ?? null,
    lastError: latest?.last_tempo_error ?? null,
    lastSignerPath: latest?.last_signer_path ?? null,
    failingRows: failing,
  }
}

export async function fetchWrittenReputationWritesForSubject(
  chain: ReputationChain,
  subjectAddress: string,
): Promise<ReputationWrite[]> {
  const client = reputationClient()
  const { data } = await client
    .from('reputation_writes')
    .select('*')
    .eq('chain', chain)
    .eq('subject_address', subjectAddress)
    .eq('status', 'written')
    .order('written_at', { ascending: false })
  return (data as ReputationWrite[] | null) ?? []
}

export async function hasEmployerVerifiedAttestation(
  employerSolanaAddress: string,
  schemaId: string,
): Promise<boolean> {
  const client = reputationClient()
  const { count } = await client
    .from('reputation_writes')
    .select('id', { count: 'exact', head: true })
    .eq('chain', 'solana')
    .eq('subject_address', employerSolanaAddress)
    .eq('schema_id', schemaId)
    .in('status', ['pending', 'written'])
  return (count ?? 0) > 0
}
