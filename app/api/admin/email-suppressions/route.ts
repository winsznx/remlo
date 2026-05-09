import { NextRequest, NextResponse } from 'next/server'
import { getCallerAdmin } from '@/lib/auth'
import { recordAdminAction, inspectRequest } from '@/lib/admin-audit'
import {
  listSuppressions,
  addSuppression,
  suppressionStats,
  type SuppressionReason,
} from '@/lib/queries/email-suppressions'

const VALID_REASONS: SuppressionReason[] = ['hard_bounce', 'complaint', 'unsubscribe', 'manual']

/**
 * GET /api/admin/email-suppressions
 * Returns paginated suppression rows + reason histogram. Admin only.
 *
 * Query params:
 *   ?search=<text>        ILIKE match against the email field.
 *   ?reason=<reason>      Filter to one of: hard_bounce | complaint | unsubscribe | manual.
 *   ?cursor=<iso>         created_at cursor for paging older rows.
 *   ?limit=<n>            Page size, max 200, default 50.
 */
export async function GET(req: NextRequest) {
  const claims = await getCallerAdmin(req)
  if (!claims) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = req.nextUrl
  const search = url.searchParams.get('search') ?? undefined
  const reason = url.searchParams.get('reason') as SuppressionReason | null
  const cursor = url.searchParams.get('cursor') ?? undefined
  const limitRaw = url.searchParams.get('limit')
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50

  if (reason && !VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 },
    )
  }

  const [{ items, nextCursor }, stats] = await Promise.all([
    listSuppressions({
      search,
      reason: reason ?? undefined,
      cursor,
      limit: Number.isFinite(limit) ? limit : 50,
    }),
    suppressionStats(),
  ])

  return NextResponse.json({ items, next_cursor: nextCursor, stats })
}

interface AddBody {
  email?: unknown
  reason?: unknown
}

/**
 * POST /api/admin/email-suppressions
 * Manually add a suppression. Use case: a deliverability spike from a domain
 * we want to temporarily quarantine, or a customer asking us to block their
 * employee's address proactively. Reason defaults to 'manual'.
 */
export async function POST(req: NextRequest) {
  const claims = await getCallerAdmin(req)
  if (!claims) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: AddBody
  try {
    body = (await req.json()) as AddBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'email must be a valid address' }, { status: 400 })
  }
  const reason: SuppressionReason =
    typeof body.reason === 'string' && VALID_REASONS.includes(body.reason as SuppressionReason)
      ? (body.reason as SuppressionReason)
      : 'manual'

  const created = await addSuppression({ email, reason })
  const meta = inspectRequest(req)
  if (!created) {
    void recordAdminAction({
      actorUserId: claims.sub,
      action: 'email_suppression.add',
      resource: `email_suppression:${email}`,
      result: 'error',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { reason },
    })
    return NextResponse.json({ error: 'Failed to add suppression' }, { status: 500 })
  }
  void recordAdminAction({
    actorUserId: claims.sub,
    action: 'email_suppression.add',
    resource: `email_suppression:${email}`,
    result: 'success',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: { reason },
  })
  return NextResponse.json({ suppression: created }, { status: 201 })
}
