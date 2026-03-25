import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployee } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

/** GET /api/me/payments?limit=20 — return payment history for the authenticated employee. */
export async function GET(req: NextRequest) {
  const employee = await getCallerEmployee(req)
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '20'), 100)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('payment_items')
    .select(`
      id, amount, memo_bytes, memo_decoded, status, tx_hash, created_at,
      payroll_run:payroll_runs(id, finalized_at, settlement_time_ms, block_number)
    `)
    .eq('employee_id', employee.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
