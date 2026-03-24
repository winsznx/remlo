import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createEmployeeInvite } from '@/lib/employee-onboarding'

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

  const email = body.email?.trim()
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    const created = await createEmployeeInvite({
      employerId: id,
      companyName: employer.company_name,
      email,
      appUrl: req.nextUrl.origin,
      firstName: body.firstName,
      lastName: body.lastName,
      jobTitle: body.jobTitle,
      department: body.department,
      countryCode: body.countryCode,
      salaryAmount: body.salaryAmount,
      salaryCurrency: body.salaryCurrency,
      payFrequency: body.payFrequency,
    })

    return NextResponse.json(created, { status: created.existing ? 200 : 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create employee' },
      { status: 500 }
    )
  }
}
