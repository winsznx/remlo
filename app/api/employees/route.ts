import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createEmployeeInvite } from '@/lib/employee-onboarding'

/**
 * POST /api/employees
 * Body: { employerId, email, firstName, lastName, jobTitle, department,
 *         countryCode, salaryAmount, salaryCurrency, payFrequency }
 *
 * Creates an employee record, triggers a Bridge KYC link when available,
 * and sends an invite email via Resend.
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

  try {
    const created = await createEmployeeInvite({
      employerId,
      companyName: employer.company_name,
      email,
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
