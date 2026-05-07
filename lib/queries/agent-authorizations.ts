import { createServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'

export type AgentAuthorization = Database['public']['Tables']['employer_agent_authorizations']['Row']
export type AgentPayCall = Database['public']['Tables']['agent_pay_calls']['Row']

export async function listAuthorizations(employerId: string): Promise<AgentAuthorization[]> {
  const client = createServerClient()
  const { data } = await client
    .from('employer_agent_authorizations')
    .select('*')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export interface CreateAuthorizationInput {
  employer_id: string
  label: string
  agent_identifier: string
  per_tx_cap_usd: number
  per_day_cap_usd: number
  identity_kind?: 'hmac' | 'erc8004_tempo' | 'sas_solana'
  erc8004_agent_id?: string | null
  erc8004_owner_address?: string | null
  solana_pubkey?: string | null
}

export async function createAuthorization(
  input: CreateAuthorizationInput,
): Promise<AgentAuthorization | null> {
  const client = createServerClient()
  const { data } = await client
    .from('employer_agent_authorizations')
    .insert(input)
    .select('*')
    .single()
  return data ?? null
}

export async function revokeAuthorization(authorizationId: string, employerId: string): Promise<boolean> {
  const client = createServerClient()
  const { error } = await client
    .from('employer_agent_authorizations')
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq('id', authorizationId)
    .eq('employer_id', employerId)
  return !error
}

/**
 * Look up an authorization by employer + agent identifier (case-insensitive match).
 * Returns the authorization if active + not revoked, else null.
 */
export async function findActiveAuthorization(
  employerId: string,
  agentIdentifier: string,
): Promise<AgentAuthorization | null> {
  const client = createServerClient()
  const { data } = await client
    .from('employer_agent_authorizations')
    .select('*')
    .eq('employer_id', employerId)
    .eq('active', true)
    .ilike('agent_identifier', agentIdentifier)
    .is('revoked_at', null)
    .maybeSingle()
  return data ?? null
}

/** Sum of payments made under this authorization in the last 24 hours. */
export async function spentInLastDay(authorizationId: string): Promise<number> {
  const client = createServerClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await client
    .from('agent_pay_calls')
    .select('usd_amount')
    .eq('authorization_id', authorizationId)
    .gte('created_at', since)
  return (data ?? []).reduce((sum, row) => sum + Number(row.usd_amount), 0)
}

/**
 * Count of agent_pay calls under this authorization in the last 60 seconds.
 * Used to enforce `velocity_per_minute` (Tier 1 security gate 5).
 */
export async function callsInLastMinute(authorizationId: string): Promise<number> {
  const client = createServerClient()
  const since = new Date(Date.now() - 60 * 1000).toISOString()
  const { count } = await client
    .from('agent_pay_calls')
    .select('id', { count: 'exact', head: true })
    .eq('authorization_id', authorizationId)
    .gte('created_at', since)
  return count ?? 0
}

/**
 * Returns the rolling 7-day median of payment amounts under this
 * authorization. Used by the anomaly detector to spot spend spikes
 * (>10× median triggers a warning + cap halving).
 *
 * If the agent has fewer than 5 historical payments we return null —
 * not enough signal to define an outlier. Caller should treat null as
 * "skip anomaly check, the agent is too new".
 */
export async function rollingMedianAmount(authorizationId: string): Promise<number | null> {
  const client = createServerClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await client
    .from('agent_pay_calls')
    .select('usd_amount')
    .eq('authorization_id', authorizationId)
    .gte('created_at', since)
  if (!data || data.length < 5) return null
  const amounts = data.map((row) => Number(row.usd_amount)).sort((a, b) => a - b)
  const mid = Math.floor(amounts.length / 2)
  return amounts.length % 2 === 0 ? (amounts[mid - 1] + amounts[mid]) / 2 : amounts[mid]
}

/**
 * Halve `per_tx_cap_usd` on an authorization in response to a >10× spike,
 * preserving the original cap so the employer can restore it on ack.
 *
 * Idempotent: if the cap has already been halved (cap_halved_at is set),
 * we don't halve again. The employer must clear `cap_halved_at` via the
 * dashboard before another halving can fire.
 */
export async function halveCapOnAnomaly(input: {
  authorizationId: string
  reason: string
}): Promise<void> {
  const client = createServerClient()
  const { data: existing } = await client
    .from('employer_agent_authorizations')
    .select('per_tx_cap_usd, per_tx_cap_original_usd, cap_halved_at')
    .eq('id', input.authorizationId)
    .maybeSingle()
  if (!existing || existing.cap_halved_at) return
  await client
    .from('employer_agent_authorizations')
    .update({
      per_tx_cap_original_usd: existing.per_tx_cap_original_usd ?? existing.per_tx_cap_usd,
      per_tx_cap_usd: existing.per_tx_cap_usd / 2,
      cap_halved_at: new Date().toISOString(),
      cap_halved_reason: input.reason,
    })
    .eq('id', input.authorizationId)
}

export async function recordPayCall(input: {
  authorization_id: string
  employer_id: string
  recipient_wallet: string
  usd_amount: number
  tx_hash?: string | null
  reference?: string | null
}): Promise<AgentPayCall | null> {
  const client = createServerClient()
  const { data } = await client
    .from('agent_pay_calls')
    .insert(input)
    .select('*')
    .single()
  return data ?? null
}
