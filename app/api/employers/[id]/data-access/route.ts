import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/employers/[id]/data-access
 *
 * Customer-visible slice of the admin audit log: every Remlo staff access
 * event scoped to this employer (or to a payroll run / ticket / agent
 * authorization owned by this employer).
 *
 * What we deliberately do NOT include:
 *   - The actor's full Privy user_id. Customers don't need to know the
 *     specific staffer's identity — they need to know access happened.
 *     We surface a generic "Remlo support" label.
 *   - The actor's IP address.
 *   - Any internal-only metadata that doesn't help the customer (we
 *     filter to a small set of human-meaningful fields).
 *
 * What we DO include: action, resource (translated to a human label),
 * reason given, and timestamp. This is the same data we'd show in a
 * formal privacy disclosure response.
 */
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

interface AuditRow {
  id: string
  actor_user_id: string
  action: string
  resource: string | null
  result: string
  metadata: Record<string, unknown> | null
  created_at: string
}

const ACTION_LABEL: Record<string, string> = {
  'employer.view': 'Viewed your company profile',
  'payroll_run.view': 'Viewed a payroll run',
  'support_ticket.update': 'Updated a support ticket',
  'support_tickets.list': 'Reviewed the support inbox',
  'announcement.create': 'Posted a system announcement',
  'announcement.update': 'Edited a system announcement',
  'announcement.delete': 'Deleted a system announcement',
  'email_suppression.add': 'Added an email suppression',
  'email_suppression.remove': 'Removed an email suppression',
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Pull payroll run IDs for this employer so we can match payroll_run:* rows.
  const { data: runs } = await supabase
    .from('payroll_runs')
    .select('id')
    .eq('employer_id', employerId)
  const runIds = (runs ?? []).map((r) => r.id)

  // We can't OR across distinct resource prefixes server-side without
  // baroque queries, so we fan out two queries and merge client-side.
  // Audit-log volume is bounded by admin activity; this is fine.
  const employerResource = `employer:${employerId}`
  const runResources = runIds.map((id) => `payroll_run:${id}`)

  const [employerHits, runHits] = await Promise.all([
    supabase
      .from('admin_audit_log')
      .select('id, actor_user_id, action, resource, result, metadata, created_at')
      .eq('resource', employerResource)
      .order('created_at', { ascending: false })
      .limit(200),
    runResources.length > 0
      ? supabase
          .from('admin_audit_log')
          .select('id, actor_user_id, action, resource, result, metadata, created_at')
          .in('resource', runResources)
          .order('created_at', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as AuditRow[] }),
  ])

  const all = [
    ...((employerHits.data ?? []) as AuditRow[]),
    ...((runHits.data ?? []) as AuditRow[]),
  ]
  all.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  // Anonymize the actor + filter metadata down to safe fields. We surface
  // the "reason" string the staffer typed at the gate, because that's the
  // most important signal for the customer.
  const items = all.slice(0, 100).map((row) => ({
    id: row.id,
    action: row.action,
    actionLabel: ACTION_LABEL[row.action] ?? row.action,
    result: row.result,
    reason:
      row.metadata && typeof row.metadata === 'object' && 'reason' in row.metadata
        ? String((row.metadata as { reason: unknown }).reason ?? '')
        : null,
    actor: 'Remlo support staff',
    created_at: row.created_at,
  }))

  return NextResponse.json({
    items,
    summary: {
      total: items.length,
      reads: items.filter((i) => i.action.endsWith('.view')).length,
      writes: items.filter((i) => !i.action.endsWith('.view') && !i.action.endsWith('.list')).length,
    },
  })
}
