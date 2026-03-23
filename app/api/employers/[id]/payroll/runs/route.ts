import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)

  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = req.nextUrl
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '10', 10))
  const offset = (page - 1) * limit

  const supabase = createServerClient()
  const { data, error, count } = await supabase
    .from('payroll_runs')
    .select(
      'id, status, total_amount, employee_count, tx_hash, finalized_at, created_at',
      { count: 'exact' }
    )
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    runs: data ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}

export const dynamic = 'force-dynamic'
