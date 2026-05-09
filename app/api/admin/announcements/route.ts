import { NextRequest, NextResponse } from 'next/server'
import { getCallerAdmin } from '@/lib/auth'
import { recordAdminAction, inspectRequest } from '@/lib/admin-audit'
import {
  createAnnouncement,
  listAllAnnouncements,
  type AnnouncementAudience,
  type AnnouncementSeverity,
} from '@/lib/queries/announcements'

const SEVERITIES: AnnouncementSeverity[] = ['info', 'success', 'warning', 'error']
const AUDIENCES: AnnouncementAudience[] = ['all', 'employers', 'employees', 'admins']

/**
 * GET /api/admin/announcements
 *
 * Returns every announcement (including unpublished and expired) so the
 * admin UI can show a full audit. Requires platform admin.
 */
export async function GET(req: NextRequest) {
  const claims = await getCallerAdmin(req)
  if (!claims) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const items = await listAllAnnouncements()
  return NextResponse.json({ items })
}

interface CreateBody {
  title?: unknown
  body?: unknown
  link_url?: unknown
  link_label?: unknown
  severity?: unknown
  audience?: unknown
  published_at?: unknown
  expires_at?: unknown
}

/**
 * POST /api/admin/announcements
 *
 * Create a new announcement. Body fields validated server-side; type/length
 * mirror the SQL CHECKs so we surface clean 400s instead of opaque 23xxx
 * errors.
 */
export async function POST(req: NextRequest) {
  const claims = await getCallerAdmin(req)
  if (!claims) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const message = typeof body.body === 'string' ? body.body.trim() : ''
  if (title.length < 1 || title.length > 120) {
    return NextResponse.json({ error: 'title must be 1–120 chars.' }, { status: 400 })
  }
  if (message.length < 1 || message.length > 600) {
    return NextResponse.json({ error: 'body must be 1–600 chars.' }, { status: 400 })
  }

  const severity: AnnouncementSeverity =
    typeof body.severity === 'string' && SEVERITIES.includes(body.severity as AnnouncementSeverity)
      ? (body.severity as AnnouncementSeverity)
      : 'info'
  const audience: AnnouncementAudience =
    typeof body.audience === 'string' && AUDIENCES.includes(body.audience as AnnouncementAudience)
      ? (body.audience as AnnouncementAudience)
      : 'all'

  const linkUrl = (() => {
    if (typeof body.link_url !== 'string') return null
    const trimmed = body.link_url.trim()
    if (trimmed === '') return null
    if (!/^(https?:\/\/|\/)/.test(trimmed)) {
      return undefined as unknown as null // sentinel: caller error below
    }
    return trimmed
  })()
  if (linkUrl === undefined) {
    return NextResponse.json(
      { error: 'link_url must be an https:// URL or a /-rooted path.' },
      { status: 400 },
    )
  }
  const linkLabel =
    typeof body.link_label === 'string' && body.link_label.trim().length > 0
      ? body.link_label.trim().slice(0, 40)
      : null

  const publishedAt =
    typeof body.published_at === 'string' && body.published_at.trim() !== ''
      ? body.published_at
      : null
  const expiresAt =
    typeof body.expires_at === 'string' && body.expires_at.trim() !== ''
      ? body.expires_at
      : null

  const created = await createAnnouncement({
    title,
    body: message,
    severity,
    audience,
    link_url: linkUrl,
    link_label: linkLabel,
    published_at: publishedAt,
    expires_at: expiresAt,
    created_by: claims.sub,
  })
  if (!created) {
    const meta = inspectRequest(req)
    void recordAdminAction({
      actorUserId: claims.sub,
      action: 'announcement.create',
      result: 'error',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { title, audience },
    })
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
  const meta = inspectRequest(req)
  void recordAdminAction({
    actorUserId: claims.sub,
    action: 'announcement.create',
    resource: `system_announcement:${created.id}`,
    result: 'success',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: { title, audience, severity },
  })
  return NextResponse.json({ announcement: created }, { status: 201 })
}
