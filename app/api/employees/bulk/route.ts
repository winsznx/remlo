import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployer } from '@/lib/auth'
import { createEmployeeInvite } from '@/lib/employee-onboarding'

const VALID_FREQUENCIES = new Set(['monthly', 'biweekly', 'weekly', 'stream'])
const MAX_BULK_EMPLOYEES = 250

interface BulkEmployeeInput {
  email?: string
  first_name?: string
  last_name?: string
  job_title?: string
  department?: string
  country_code?: string
  salary_amount?: string
  salary_currency?: string
  pay_frequency?: string
}

interface ValidationIssue {
  row: number
  errors: string[]
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  const caller = await getCallerEmployer(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    employees?: BulkEmployeeInput[]
  }

  const employees = body.employees ?? []
  if (!Array.isArray(employees) || employees.length === 0) {
    return NextResponse.json({ error: 'employees must be a non-empty array' }, { status: 400 })
  }

  if (employees.length > MAX_BULK_EMPLOYEES) {
    return NextResponse.json(
      { error: `Bulk import is limited to ${MAX_BULK_EMPLOYEES} employees per request` },
      { status: 400 }
    )
  }

  const validationIssues: ValidationIssue[] = []

  const normalized = employees.map((employee, index) => {
    const row = index + 1
    const errors: string[] = []

    const email = employee.email?.trim().toLowerCase() ?? ''
    const firstName = employee.first_name?.trim() ?? ''
    const lastName = employee.last_name?.trim() ?? ''
    const jobTitle = employee.job_title?.trim() ?? ''
    const department = employee.department?.trim() ?? ''
    const countryCode = employee.country_code?.trim().toUpperCase() ?? ''
    const salaryCurrency = employee.salary_currency?.trim().toUpperCase() || 'USD'
    const payFrequency = employee.pay_frequency?.trim().toLowerCase() || 'monthly'

    if (!email) {
      errors.push('Email is required')
    } else if (!isValidEmail(email)) {
      errors.push('Email is invalid')
    }

    if (!firstName) {
      errors.push('First name is required')
    }

    if (!lastName) {
      errors.push('Last name is required')
    }

    if (countryCode && countryCode.length !== 2) {
      errors.push('Country code must be a 2-letter ISO code')
    }

    if (salaryCurrency.length !== 3) {
      errors.push('Currency must be a 3-letter code')
    }

    if (!VALID_FREQUENCIES.has(payFrequency)) {
      errors.push('Pay frequency must be monthly, biweekly, weekly, or stream')
    }

    let salaryAmount: number | undefined
    if (employee.salary_amount?.trim()) {
      salaryAmount = Number(employee.salary_amount.trim())
      if (!Number.isFinite(salaryAmount) || salaryAmount <= 0) {
        errors.push('Salary amount must be a positive number')
      }
    }

    if (errors.length > 0) {
      validationIssues.push({ row, errors })
    }

    return {
      row,
      email,
      firstName,
      lastName,
      jobTitle: jobTitle || undefined,
      department: department || undefined,
      countryCode: countryCode || undefined,
      salaryAmount,
      salaryCurrency,
      payFrequency,
    }
  })

  if (validationIssues.length > 0) {
    return NextResponse.json(
      {
        error: 'Some rows failed validation',
        rows: validationIssues,
      },
      { status: 400 }
    )
  }

  const results: Array<{
    row: number
    employeeId: string
    email: string
    existing: boolean
    emailSent: boolean
    kycPrepared: boolean
  }> = []

  for (const employee of normalized) {
    try {
      const created = await createEmployeeInvite({
        employerId: caller.id,
        companyName: caller.company_name,
        email: employee.email,
        appUrl: req.nextUrl.origin,
        firstName: employee.firstName,
        lastName: employee.lastName,
        jobTitle: employee.jobTitle,
        department: employee.department,
        countryCode: employee.countryCode,
        salaryAmount: employee.salaryAmount,
        salaryCurrency: employee.salaryCurrency,
        payFrequency: employee.payFrequency,
      })

      results.push({
        row: employee.row,
        employeeId: created.employeeId,
        email: employee.email,
        existing: created.existing,
        emailSent: created.emailSent,
        kycPrepared: Boolean(created.kycUrl),
      })
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Bulk import failed',
          row: employee.row,
          email: employee.email,
        },
        { status: 500 }
      )
    }
  }

  const createdCount = results.filter((item) => !item.existing).length
  const existingCount = results.filter((item) => item.existing).length
  const emailedCount = results.filter((item) => item.emailSent).length
  const kycPreparedCount = results.filter((item) => item.kycPrepared).length

  return NextResponse.json({
    imported: results.length,
    created: createdCount,
    existing: existingCount,
    emailSent: emailedCount,
    kycPrepared: kycPreparedCount,
    employees: results,
  })
}
