import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createEmployeeInvite } from '@/lib/employee-onboarding'
import { derivePaymentHoldStatus } from '@/lib/payment-holds'

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

  const employees = data ?? []
  if (employees.length === 0) {
    return NextResponse.json({ employees: [] })
  }

  const employeeIds = employees.map((employee) => employee.id)
  const { data: holdEvents, error: holdEventsError } = await supabase
    .from('compliance_events')
    .select('employee_id, event_type, created_at')
    .eq('employer_id', id)
    .in('employee_id', employeeIds)
    .in('event_type', ['payments_paused', 'payments_resumed'])
    .order('created_at', { ascending: false })

  if (holdEventsError) {
    return NextResponse.json({ error: holdEventsError.message }, { status: 500 })
  }

  const latestEventByEmployee = new Map<string, { event_type: string | null }>()
  for (const event of holdEvents ?? []) {
    if (event.employee_id && !latestEventByEmployee.has(event.employee_id)) {
      latestEventByEmployee.set(event.employee_id, { event_type: event.event_type })
    }
  }

  return NextResponse.json({
    employees: employees.map((employee) => ({
      ...employee,
      payment_status: derivePaymentHoldStatus(
        latestEventByEmployee.has(employee.id)
          ? [latestEventByEmployee.get(employee.id)!]
          : []
      ),
    })),
  })
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
