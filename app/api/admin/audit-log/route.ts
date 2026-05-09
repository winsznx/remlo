import { NextRequest, NextResponse } from 'next/server'
import { getCallerAdmin } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/audit-log
 *
 * Returns admin_audit_log rows, newest first, with optional filters.
 *   ?actor=<user_id>     exact match on actor_user_id
 *   ?action=<text>       prefix match (e.g. 'announcement.' for all announcement ops)
 *   ?result=success|forbidden|error
 *   ?since=<iso>         created_at >= since
 *   ?limit=<n>           default 100, max 500
 *
 * No cursor pagination yet — the table is bounded by admin activity volume,
 * which for now is low. If/when this grows we'll add an opaque cursor.
 */
export const dynamic = 'force-dynamic'

interface AuditLogRow {
  id: string
  actor_user_id: string
  action: string
  resource: string | null
  result: string
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function GET(req: NextRequest) {
  const claims = await getCallerAdmin(req)
  if (!claims) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = req.nextUrl
  const actor = url.searchParams.get('actor')
  const action = url.searchParams.get('action')
  const result = url.searchParams.get('result')
  const since = url.searchParams.get('since')
  const limitRaw = url.searchParams.get('limit')
  const limit = Math.min(
    Math.max(limitRaw ? Number.parseInt(limitRaw, 10) : 100, 1),
    500,
  )

  const supabase = createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (actor) query = query.eq('actor_user_id', actor)
  if (action) query = query.like('action', `${action}%`)
  if (result) query = query.eq('result', result)
  if (since) query = query.gte('created_at', since)

  const { data, error } = await query
  if (error) {
    console.error('[admin-audit-log] query failed', error.message)
    return NextResponse.json({ items: [] })
  }

  return NextResponse.json({ items: (data ?? []) as AuditLogRow[] })
}
