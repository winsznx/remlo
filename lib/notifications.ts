import { createServerClient } from '@/lib/supabase-server'

export type NotificationKind =
  | 'payroll_finalized'
  | 'payroll_failed'
  | 'escrow_settled'
  | 'escrow_refunded'
  | 'council_decision'
  | 'kyc_update'
  | 'reputation_write_failed'
  | 'agent_spike_detected'
  | 'agent_paused'

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface CreateNotificationInput {
  employerId: string
  kind: NotificationKind
  title: string
  body?: string
  severity?: NotificationSeverity
  link?: string
  metadata?: Record<string, unknown>
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.from('notifications').insert({
    employer_id: input.employerId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    severity: input.severity ?? 'info',
    link: input.link ?? null,
    metadata: (input.metadata as never) ?? null,
  })
  if (error) {
    console.error('[notifications] insert failed', { kind: input.kind, error: error.message })
  }
}
