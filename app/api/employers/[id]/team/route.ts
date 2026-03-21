import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/employers/[id]/team — list all active employees for this employer. */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params

  const employer = await getAuthorizedEmployer(req, id)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employer_id', id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ employees: data ?? [] })
}

/** POST /api/employers/[id]/team — invite a new employee. */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params

  const employer = await getAuthorizedEmployer(req, id)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
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

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Idempotent — if employee with this email already exists for this employer, return it
  const { data: existing } = await supabase
    .from('employees')
    .select('id')
    .eq('employer_id', id)
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json({ employeeId: existing.id })
  }

  const { data, error } = await supabase
    .from('employees')
    .insert({
      employer_id: id,
      email,
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
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create employee' }, { status: 500 })
  }

  return NextResponse.json({ employeeId: data.id }, { status: 201 })
}
