import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCallerEmployer } from '@/lib/auth'

const DEFAULT_PAGE_SIZE = 25

/**
 * GET /api/transactions
 * Query params: page (1-indexed), limit (max 100), employeeId, status, from, to
 *
 * Returns paginated payment_items with decoded ISO 20022 memo fields.
 * Employer sees all their transactions. Employee sees only their own.
 */
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const url = req.nextUrl

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10))
  const offset = (page - 1) * limit
  const employeeId = url.searchParams.get('employeeId')
  const status = url.searchParams.get('status')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  // Resolve caller as employer or employee
  const employer = await getCallerEmployer(req)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let query = supabase
    .from('payment_items')
    .select(
      `
      id, amount, status, tx_hash, memo_decoded, created_at,
      payroll_runs!inner(id, total_amount, finalized_at, block_number, employer_id),
      employees!inner(id, email, first_name, last_name, wallet_address)
    `,
      { count: 'exact' }
    )
    .eq('payroll_runs.employer_id', employer.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (employeeId) query = query.eq('employee_id', employeeId)
  if (status) query = query.eq('status', status)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = (data ?? []).map((item) => {
    const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees
    const memo = (item.memo_decoded && typeof item.memo_decoded === 'object')
      ? item.memo_decoded as Record<string, unknown>
      : null
    const payPeriod = typeof memo?.payPeriod === 'string' ? memo.payPeriod : null
    const employeeName = [employee?.first_name, employee?.last_name]
      .filter(Boolean)
      .join(' ')
      || employee?.email
      || 'employee'

    return {
      id: item.id,
      type: 'payroll',
      description: payPeriod
        ? `Payroll payment to ${employeeName} · ${payPeriod}`
        : `Payroll payment to ${employeeName}`,
      amount: item.amount,
      tx_hash: item.tx_hash,
      created_at: item.created_at,
      status: item.status,
      memo_decoded: item.memo_decoded,
    }
  })

  return NextResponse.json({
    items,
    total: count ?? 0,
    page,
    limit,
    transactions: items,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    },
  })
}
