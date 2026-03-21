import { createServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'

export type ComplianceEvent = Database['public']['Tables']['compliance_events']['Row']

export async function insertComplianceEvent(event: {
  employer_id?: string | null
  employee_id?: string | null
  wallet_address?: string | null
  event_type: string
  result: string
  risk_score?: number | null
  description?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const client = createServerClient()
  await client.from('compliance_events').insert({
    ...event,
    metadata: event.metadata as unknown as import('@/lib/database.types').Json ?? null,
  })
}

export async function getComplianceEventsByEmployerId(
  employerId: string,
  limit = 100
): Promise<ComplianceEvent[]> {
  const client = createServerClient()
  const { data } = await client
    .from('compliance_events')
    .select('*')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
