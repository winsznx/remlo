import { createServerClient } from '@/lib/supabase-server'
import { getComplianceEventsByEmployerId } from '@/lib/queries/compliance'

export interface ComplianceReport {
  employer_id: string
  total_employees: number
  verified: number
  pending: number
  blocked: number
  expired: number
  recent_events: {
    event_type: string | null
    result: string | null
    wallet_address: string | null
    created_at: string
  }[]
  generated_at: string
}

export async function generateComplianceReport(
  employerId: string,
): Promise<ComplianceReport> {
  const client = createServerClient()

  const [{ data: employees }, events] = await Promise.all([
    client
      .from('employees')
      .select('id, kyc_status')
      .eq('employer_id', employerId)
      .eq('active', true),
    getComplianceEventsByEmployerId(employerId, 20),
  ])

  const all = employees ?? []
  const verified = all.filter((e) => e.kyc_status === 'verified').length
  const pending = all.filter((e) => e.kyc_status === 'pending').length
  const blocked = all.filter((e) => e.kyc_status === 'blocked').length
  const expired = all.filter((e) => e.kyc_status === 'expired').length

  return {
    employer_id: employerId,
    total_employees: all.length,
    verified,
    pending,
    blocked,
    expired,
    recent_events: events.map((e) => ({
      event_type: e.event_type,
      result: e.result,
      wallet_address: e.wallet_address,
      created_at: e.created_at,
    })),
    generated_at: new Date().toISOString(),
  }
}
