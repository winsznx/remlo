import { NextRequest, NextResponse } from 'next/server'
import { getCallerAdmin } from '@/lib/auth'
import { recordAdminAction, inspectRequest } from '@/lib/admin-audit'
import { removeSuppression } from '@/lib/queries/email-suppressions'

type RouteContext = { params: Promise<{ email: string }> }

/**
 * DELETE /api/admin/email-suppressions/{email}
 * Remove a suppression so future sends to that recipient resume. The email
 * path param is URL-decoded — callers must `encodeURIComponent` it.
 *
 * Operationally: if the user re-bounces or re-complains via Resend's
 * webhook, the row will be re-inserted automatically. So manual removal is
 * for cases where you've confirmed the original suppression was a false
 * positive (e.g. a transient mailbox-full bounce that's since cleared).
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const claims = await getCallerAdmin(req)
  if (!claims) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { email } = await ctx.params
  const decoded = decodeURIComponent(email)
  const ok = await removeSuppression(decoded)
  const meta = inspectRequest(req)
  void recordAdminAction({
    actorUserId: claims.sub,
    action: 'email_suppression.remove',
    resource: `email_suppression:${decoded}`,
    result: ok ? 'success' : 'error',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  })
  if (!ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return NextResponse.json({ removed: decoded })
}
