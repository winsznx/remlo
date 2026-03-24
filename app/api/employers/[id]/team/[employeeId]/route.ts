import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer, getCallerAdmin } from '@/lib/auth'
import { derivePaymentHoldStatus } from '@/lib/payment-holds'

type RouteContext = { params: Promise<{ id: string; employeeId: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId, employeeId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)

  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const [{ data: employee, error: employeeError }, { data: payments, error: paymentsError }, { data: complianceEvents, error: complianceError }] = await Promise.all([
    supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .eq('employer_id', employerId)
      .eq('active', true)
      .maybeSingle(),
    supabase
      .from('payment_items')
      .select(`
        id,
        amount,
        memo_bytes,
        memo_decoded,
        status,
        tx_hash,
        created_at,
        payroll_run:payroll_runs!inner(id, employer_id, finalized_at, settlement_time_ms, block_number)
      `)
      .eq('employee_id', employeeId)
      .eq('payroll_runs.employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('compliance_events')
      .select('*')
      .eq('employer_id', employerId)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (employeeError || !employee) {
    return NextResponse.json({ error: employeeError?.message ?? 'Employee not found' }, { status: 404 })
  }

  if (paymentsError) {
    return NextResponse.json({ error: paymentsError.message }, { status: 500 })
  }

  if (complianceError) {
    return NextResponse.json({ error: complianceError.message }, { status: 500 })
  }

  return NextResponse.json({
    employee: {
      ...employee,
      payment_status: derivePaymentHoldStatus(complianceEvents ?? []),
    },
    payments: payments ?? [],
    complianceEvents: complianceEvents ?? [],
  })
}

type TeamPatchBody =
  | {
      action: 'updateSalary'
      salaryAmount: number
      salaryCurrency?: string
      payFrequency?: string
    }
  | {
      action: 'pausePayments'
      reason?: string
    }
  | {
      action: 'resumePayments'
      reason?: string
    }
  | {
      action: 'removeEmployee'
    }
  | {
      action: 'manualReview'
      reason?: string
    }

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id: employerId, employeeId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)

  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .eq('employer_id', employerId)
    .maybeSingle()

  if (employeeError || !employee) {
    return NextResponse.json({ error: employeeError?.message ?? 'Employee not found' }, { status: 404 })
  }

  const body = (await req.json()) as TeamPatchBody

  const getCurrentPaymentStatus = async () => {
    const { data: paymentEvents, error: paymentEventsError } = await supabase
      .from('compliance_events')
      .select('event_type, created_at')
      .eq('employer_id', employerId)
      .eq('employee_id', employeeId)
      .in('event_type', ['payments_paused', 'payments_resumed'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (paymentEventsError) {
      throw new Error(paymentEventsError.message)
    }

    return derivePaymentHoldStatus(paymentEvents ?? [])
  }

  switch (body.action) {
    case 'updateSalary': {
      if (!Number.isFinite(body.salaryAmount) || body.salaryAmount <= 0) {
        return NextResponse.json({ error: 'salaryAmount must be a positive number' }, { status: 400 })
      }

      const { error } = await supabase
        .from('employees')
        .update({
          salary_amount: body.salaryAmount,
          salary_currency: body.salaryCurrency ?? employee.salary_currency,
          pay_frequency: body.payFrequency ?? employee.pay_frequency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId)
        .eq('employer_id', employerId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Employee compensation updated' })
    }

    case 'pausePayments': {
      let currentPaymentStatus: ReturnType<typeof derivePaymentHoldStatus>
      try {
        currentPaymentStatus = await getCurrentPaymentStatus()
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to read payment status' },
          { status: 500 }
        )
      }

      if (currentPaymentStatus === 'paused') {
        return NextResponse.json({ error: 'Payments are already paused for this employee' }, { status: 409 })
      }

      const { error } = await supabase.from('compliance_events').insert({
        employer_id: employerId,
        employee_id: employeeId,
        wallet_address: employee.wallet_address,
        event_type: 'payments_paused',
        result: 'BLOCKED',
        description: body.reason ?? 'Payroll paused by employer operator.',
        metadata: {
          source: 'dashboard_team',
          employeeEmail: employee.email,
        },
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Employee payroll paused' })
    }

    case 'resumePayments': {
      let currentPaymentStatus: ReturnType<typeof derivePaymentHoldStatus>
      try {
        currentPaymentStatus = await getCurrentPaymentStatus()
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to read payment status' },
          { status: 500 }
        )
      }

      if (currentPaymentStatus === 'active') {
        return NextResponse.json({ error: 'Payments are already active for this employee' }, { status: 409 })
      }

      const { error } = await supabase.from('compliance_events').insert({
        employer_id: employerId,
        employee_id: employeeId,
        wallet_address: employee.wallet_address,
        event_type: 'payments_resumed',
        result: 'CLEAR',
        description: body.reason ?? 'Payroll resumed by employer operator.',
        metadata: {
          source: 'dashboard_team',
          employeeEmail: employee.email,
        },
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Employee payroll resumed' })
    }

    case 'removeEmployee': {
      const { error } = await supabase
        .from('employees')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId)
        .eq('employer_id', employerId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Employee removed from active directory' })
    }

    case 'manualReview': {
      const admin = await getCallerAdmin(req)
      if (!admin) {
        return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 })
      }

      const { error } = await supabase.from('compliance_events').insert({
        employer_id: employerId,
        employee_id: employeeId,
        wallet_address: employee.wallet_address,
        event_type: 'manual_review',
        result: 'BLOCKED',
        description: body.reason ?? 'Flagged for manual review by platform operations.',
        metadata: {
          source: 'platform_admin',
          flaggedBy: admin.sub,
          employeeEmail: employee.email,
        },
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Manual review flag recorded' })
    }

    default:
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }
}

export const dynamic = 'force-dynamic'
