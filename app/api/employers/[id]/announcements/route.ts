import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import {
  createAnnouncement,
  type AnnouncementSeverity,
} from '@/lib/queries/announcements'
import { notify, type EmailPart } from '@/lib/notify'

type RouteContext = { params: Promise<{ id: string }> }

const SEVERITIES: AnnouncementSeverity[] = ['info', 'success', 'warning', 'error']

/**
 * GET /api/employers/[id]/announcements
 * List the employer's own announcements (history). Auth: employer owner.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data } = await supabase
    .from('system_announcements')
    .select('*')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('employer_id' as any, employerId)
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json({ items: data ?? [] })
}

interface CreateBody {
  title?: unknown
  body?: unknown
  link_url?: unknown
  link_label?: unknown
  severity?: unknown
  expires_at?: unknown
  /** When true, send an email to every active employee in addition to the banner. Default false. */
  send_email?: unknown
}

/**
 * POST /api/employers/[id]/announcements
 * Create a new employer-scoped announcement, optionally fanned out as an email.
 *
 * Always written with audience='employees' and employer_id=this employer.
 * Visible only to employees of this employer (banner + activity feed).
 *
 * If send_email is true, every active employee with an email AND
 * employer_message_email=true gets the EmployerMessage template.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const linkUrl = (() => {
    if (typeof body.link_url !== 'string') return null
    const trimmed = body.link_url.trim()
    if (trimmed === '') return null
    if (!/^(https?:\/\/|\/)/.test(trimmed)) return undefined as unknown as null
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
  const expiresAt =
    typeof body.expires_at === 'string' && body.expires_at.trim() !== ''
      ? body.expires_at
      : null
  const sendEmailFlag = body.send_email === true

  const created = await createAnnouncement({
    title,
    body: message,
    severity,
    audience: 'employees',
    employer_id: employerId,
    link_url: linkUrl,
    link_label: linkLabel,
    expires_at: expiresAt,
    created_by: employer.owner_user_id,
  })
  if (!created) {
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }

  if (sendEmailFlag) {
    void fanOutEmployerMessage({
      employerId,
      companyName: employer.company_name,
      title,
      body: message,
      linkUrl,
      linkLabel,
      announcementId: created.id,
    }).catch((err) => console.error('[employer-announcement] fan-out failed', err))
  }

  return NextResponse.json({ announcement: created }, { status: 201 })
}

interface FanOutInput {
  employerId: string
  companyName: string
  title: string
  body: string
  linkUrl: string | null
  linkLabel: string | null
  announcementId: string
}

async function fanOutEmployerMessage(input: FanOutInput): Promise<void> {
  const supabase = createServerClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, email, first_name, user_id')
    .eq('employer_id', input.employerId)
    .eq('active', true)

  const recipients = (employees ?? []).filter(
    (e): e is { id: string; email: string; first_name: string | null; user_id: string | null } =>
      Boolean(e.email),
  )
  if (recipients.length === 0) return

  const emails: EmailPart[] = recipients.map((e) => {
    const part: EmailPart = {
      to: e.email,
      template: 'employer_message',
      idempotencyKey: `employer-message:${input.announcementId}:${e.id}`,
      employerId: input.employerId,
      props: {
        firstName: e.first_name,
        companyName: input.companyName,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl,
        linkLabel: input.linkLabel,
      },
    }
    if (e.user_id) {
      part.preferenceCheck = { userId: e.user_id, key: 'employerMessageEmail' }
    }
    return part
  })

  await notify({ emails })
}
