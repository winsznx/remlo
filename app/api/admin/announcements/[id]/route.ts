import { NextRequest, NextResponse } from 'next/server'
import { getCallerAdmin } from '@/lib/auth'
import { recordAdminAction, inspectRequest } from '@/lib/admin-audit'
import { updateAnnouncement, deleteAnnouncement } from '@/lib/queries/announcements'

type RouteContext = { params: Promise<{ id: string }> }

interface PatchBody {
  title?: string
  body?: string
  link_url?: string | null
  link_label?: string | null
  severity?: 'info' | 'success' | 'warning' | 'error'
  audience?: 'all' | 'employers' | 'employees' | 'admins'
  published_at?: string | null
  expires_at?: string | null
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const claims = await getCallerAdmin(req)
  if (!claims) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const body = (await req.json()) as PatchBody
  const updated = await updateAnnouncement({ id, ...body })
  const meta = inspectRequest(req)
  if (!updated) {
    void recordAdminAction({
      actorUserId: claims.sub,
      action: 'announcement.update',
      resource: `system_announcement:${id}`,
      result: 'error',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    })
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  void recordAdminAction({
    actorUserId: claims.sub,
    action: 'announcement.update',
    resource: `system_announcement:${id}`,
    result: 'success',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: body as Record<string, unknown>,
  })
  return NextResponse.json({ announcement: updated })
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const claims = await getCallerAdmin(req)
  if (!claims) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const ok = await deleteAnnouncement(id)
  const meta = inspectRequest(req)
  void recordAdminAction({
    actorUserId: claims.sub,
    action: 'announcement.delete',
    resource: `system_announcement:${id}`,
    result: ok ? 'success' : 'error',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  })
  if (!ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
