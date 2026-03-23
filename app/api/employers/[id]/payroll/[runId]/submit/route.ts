import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string; runId: string }> }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employerId, runId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)

  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { txHash } = (await req.json()) as { txHash?: string }
  if (!txHash?.startsWith('0x')) {
    return NextResponse.json({ error: 'Valid txHash is required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .select('id')
    .eq('id', runId)
    .eq('employer_id', employerId)
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
  }

  const [runUpdate, itemUpdate] = await Promise.all([
    supabase
      .from('payroll_runs')
      .update({ status: 'processing', tx_hash: txHash })
      .eq('id', runId)
      .eq('employer_id', employerId),
    supabase
      .from('payment_items')
      .update({ tx_hash: txHash, status: 'pending' })
      .eq('payroll_run_id', runId),
  ])

  if (runUpdate.error) {
    return NextResponse.json({ error: runUpdate.error.message }, { status: 500 })
  }

  if (itemUpdate.error) {
    return NextResponse.json({ error: itemUpdate.error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    payroll_run_id: runId,
    tx_hash: txHash,
  })
}
