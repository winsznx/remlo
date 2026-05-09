import type { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * lib/admin-audit.ts — append-only audit trail for /api/admin/* mutations.
 *
 * Call recordAdminAction() at the end of every admin POST/PATCH/DELETE
 * (success or failure). Reads stay un-logged for now to keep this cheap;
 * if/when we add SOC2-style "every read is auditable" we'll extend the
 * helper rather than instrument every endpoint.
 *
 * The helper never throws — admin actions must complete even if logging
 * is offline (e.g. Supabase blip). Failures are console.errored.
 */

export type AdminAuditResult = 'success' | 'forbidden' | 'error'

export interface AdminAuditInput {
  actorUserId: string
  action: string
  resource?: string | null
  result: AdminAuditResult
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}

export async function recordAdminAction(input: AdminAuditInput): Promise<void> {
  try {
    const supabase = createServerClient()
    await supabase.from('admin_audit_log').insert({
      actor_user_id: input.actorUserId,
      action: input.action,
      resource: input.resource ?? null,
      result: input.result,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      metadata: (input.metadata ?? null) as never,
    })
  } catch (err) {
    console.error('[admin-audit] insert failed', {
      action: input.action,
      error: err instanceof Error ? err.message : err,
    })
  }
}

/** Pull IP + UA from the incoming request (best-effort, headers are spoofable). */
export function inspectRequest(req: NextRequest): {
  ipAddress: string | null
  userAgent: string | null
} {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  const userAgent = req.headers.get('user-agent') ?? null
  return { ipAddress, userAgent }
}
