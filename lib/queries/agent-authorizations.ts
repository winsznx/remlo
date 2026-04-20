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

export async function createAuthorization(input: {
  employer_id: string
  label: string
  agent_identifier: string
  per_tx_cap_usd: number
  per_day_cap_usd: number
}): Promise<AgentAuthorization | null> {
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
