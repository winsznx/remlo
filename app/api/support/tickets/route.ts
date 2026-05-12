import { NextRequest, NextResponse } from 'next/server'
import { getPrivyClaims } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email/client'
import type { Json } from '@/lib/database.types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.remlo.xyz'

/**
 * POST /api/support/tickets
 *
 * Public endpoint — anyone can file a support ticket, including users who
 * can't sign in. If the request carries a valid Privy bearer we resolve the
 * user's role + employer to attach the ticket to their record; otherwise
 * we treat it as a public submission.
 *
 * Validates input lengths to mirror the SQL CHECKs and returns a 400 with
 * a readable message instead of a constraint-violation 500. No rate
 * limiting yet — Resend / Cloudflare give us coarse abuse protection at
 * the edge; we'll add app-level rate limits if it becomes a problem.
 */
export const dynamic = 'force-dynamic'

interface CreateBody {
  email?: unknown
  subject?: unknown
  body?: unknown
  /** Optional context the form can attach: page they were on, version, etc. */
  metadata?: unknown
}

export async function POST(req: NextRequest) {
  let payload: CreateBody
  try {
    payload = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : ''
  const body = typeof payload.body === 'string' ? payload.body.trim() : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (subject.length < 1 || subject.length > 200) {
    return NextResponse.json({ error: 'Subject must be 1–200 characters.' }, { status: 400 })
  }
  if (body.length < 1 || body.length > 5000) {
    return NextResponse.json({ error: 'Body must be 1–5000 characters.' }, { status: 400 })
  }

  // Resolve the submitter — if they're authenticated, link the ticket to
  // their employer record. We don't require auth here because a locked-out
  // user is exactly who needs to reach support most.
  const claims = await getPrivyClaims(req)
  const supabase = createServerClient()

  let userId: string | null = null
  let userRole: 'employer' | 'employee' | 'public' = 'public'
  let employerId: string | null = null
  let employeeId: string | null = null

  if (claims) {
    userId = claims.sub
    const [{ data: employer }, { data: employee }] = await Promise.all([
      supabase
        .from('employers')
        .select('id')
        .eq('owner_user_id', claims.sub)
        .eq('active', true)
        .maybeSingle(),
      supabase
        .from('employees')
        .select('id, employer_id')
        .eq('user_id', claims.sub)
        .eq('active', true)
        .maybeSingle(),
    ])
    if (employer) {
      userRole = 'employer'
      employerId = employer.id
    } else if (employee) {
      userRole = 'employee'
      employerId = employee.employer_id
      employeeId = employee.id
    }
  }

  const metadata: Json | null =
    payload.metadata && typeof payload.metadata === 'object'
      ? (payload.metadata as Json)
      : null

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      user_role: userRole,
      employer_id: employerId,
      employee_id: employeeId,
      email,
      subject,
      body,
      metadata,
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[support-tickets] insert failed', error.message)
    return NextResponse.json(
      { error: 'Could not file your ticket. Try emailing support@remlo.xyz directly.' },
      { status: 500 },
    )
  }

  // Fire-and-forget confirmation email. The reference code is the first
  // 8 chars of the ticket id — same prefix shown on screen and used in
  // the admin search. Subject is `Re: <subject> [Ticket #<code>]` so it
  // threads with future replies in Gmail/Outlook.
  const refCode = data.id.slice(0, 8)
  void sendEmail({
    to: email,
    template: 'support_ticket_received',
    props: {
      refCode,
      subject,
      statusUrl: `${APP_URL}/support/status?code=${refCode}`,
      appUrl: APP_URL,
    },
    idempotencyKey: `support_received:${data.id}`,
    tags: [
      { name: 'flow', value: 'support' },
      { name: 'event', value: 'received' },
    ],
  })

  return NextResponse.json({ ticket: data, ok: true }, { status: 201 })
}
