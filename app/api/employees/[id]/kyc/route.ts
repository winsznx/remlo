import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCallerEmployer } from '@/lib/auth'
import { ensureEmployeeKycLink } from '@/lib/employee-onboarding'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/employees/[id]/kyc
 * Creates a Bridge KYC link for the employee, stores bridge_customer_id, returns the link URL.
 * Employer-only: caller must own the employer record that employs this employee.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params

  const caller = await getCallerEmployer(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: employee, error: fetchErr } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('employer_id', caller.id)
    .single()

  if (fetchErr || !employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  try {
    const result = await ensureEmployeeKycLink(employee)
    if (!result) {
      return NextResponse.json(
        { error: 'Bridge is not configured for KYC link generation' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { kycUrl: result.kycUrl, customerId: result.customerId },
      { status: employee.bridge_customer_id ? 200 : 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create KYC link' },
      { status: 500 }
    )
  }
}
