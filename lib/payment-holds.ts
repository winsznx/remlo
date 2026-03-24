import type { Database } from '@/lib/database.types'

type ComplianceEvent = Pick<
  Database['public']['Tables']['compliance_events']['Row'],
  'event_type'
>

export type PaymentHoldStatus = 'active' | 'paused'

export function derivePaymentHoldStatus(events: ComplianceEvent[]): PaymentHoldStatus {
  for (const event of events) {
    if (event.event_type === 'payments_paused') return 'paused'
    if (event.event_type === 'payments_resumed') return 'active'
  }

  return 'active'
}
