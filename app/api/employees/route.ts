import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'

/**
 * POST /api/employees
 * Body: { employerId, email, firstName, lastName, jobTitle, department,
 *         countryCode, salaryAmount, salaryCurrency, payFrequency }
 *
 * Creates an employee record and sends an invite email via Resend.
 * Bridge KYC link generation happens in /api/employees/[id]/kyc.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    employerId?: string
    email?: string
    firstName?: string
    lastName?: string
    jobTitle?: string
    department?: string
    countryCode?: string
    salaryAmount?: number
    salaryCurrency?: string
    payFrequency?: string
  }

  const { employerId, email } = body
  if (!employerId || !email?.trim()) {
    return NextResponse.json({ error: 'employerId and email are required' }, { status: 400 })
  }

  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const supabase = createServerClient()

  // Idempotent: return existing if present
  const { data: existing } = await supabase
    .from('employees')
    .select('id')
    .eq('employer_id', employerId)
    .eq('email', normalizedEmail)
    .single()

  if (existing) {
    return NextResponse.json({ employeeId: existing.id })
  }

  const { data, error } = await supabase
    .from('employees')
    .insert({
      employer_id: employerId,
      email: normalizedEmail,
      first_name: body.firstName ?? null,
      last_name: body.lastName ?? null,
      job_title: body.jobTitle ?? null,
      department: body.department ?? null,
      country_code: body.countryCode ?? null,
      salary_amount: body.salaryAmount ?? null,
      salary_currency: body.salaryCurrency ?? 'USD',
      pay_frequency: body.payFrequency ?? 'monthly',
      kyc_status: 'pending',
      active: true,
      invited_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create employee' }, { status: 500 })
  }

  // Send invite email via Resend
  await sendInviteEmail({
    to: normalizedEmail,
    firstName: body.firstName ?? '',
    companyName: employer.company_name,
    employeeId: data.id,
  })

  return NextResponse.json({ employeeId: data.id }, { status: 201 })
}

async function sendInviteEmail(opts: {
  to: string
  firstName: string
  companyName: string
  employeeId: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return // Skip silently if not configured

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://remlo.app'
  const inviteUrl = `${appUrl}/invite/${opts.employeeId}`
  const firstName = opts.firstName || 'there'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Remlo <no-reply@remlo.app>',
      to: opts.to,
      subject: `${opts.companyName} invited you to Remlo`,
      html: [
        `<p>Hi ${firstName},</p>`,
        `<p>${opts.companyName} uses Remlo to pay their team. Click the link below to set up your account and receive your salary directly to your digital wallet.</p>`,
        `<p><a href="${inviteUrl}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Accept invite</a></p>`,
        `<p style="color:#94A3B8;font-size:12px;">This link is unique to you. Do not share it.</p>`,
      ].join(''),
    }),
  }).catch(() => {
    // Non-fatal — employee can still be invited manually
  })
}
