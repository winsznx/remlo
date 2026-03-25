import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ token: string }> }

/**
 * GET /api/invite/[token]
 * Public — no auth required. Returns safe display fields for the invite card.
 * Uses service role to bypass RLS so unclaimed rows are readable.
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, email, first_name, last_name, job_title, department, salary_amount, salary_currency, pay_frequency, user_id')
    .eq('id', token)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (data.user_id) {
    return NextResponse.json({ error: 'Invite already claimed' }, { status: 409 })
  }

  return NextResponse.json({
    employeeId: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    jobTitle: data.job_title,
    department: data.department,
    salaryAmount: data.salary_amount,
    salaryCurrency: data.salary_currency,
    payFrequency: data.pay_frequency,
  })
}
