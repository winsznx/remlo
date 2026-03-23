import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

interface ReceiptItem {
  id: string
  amount: string
  route: string
  receiptHash?: string
  createdAt: string
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)

  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const [{ data: payrollRuns, error: payrollError }, { data: complianceEvents, error: complianceError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase
      .from('payroll_runs')
      .select('id, mpp_receipt_hash, created_at')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('compliance_events')
      .select('id, created_at, event_type, metadata')
      .eq('employer_id', employerId)
      .eq('event_type', 'mpp_check')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('mpp_sessions')
      .select('id, opened_at, total_spent, channel_tx_hash, status, last_action')
      .eq('employer_id', employerId)
      .order('opened_at', { ascending: false })
      .limit(20),
  ])

  if (payrollError) {
    return NextResponse.json({ error: payrollError.message }, { status: 500 })
  }

  if (complianceError) {
    return NextResponse.json({ error: complianceError.message }, { status: 500 })
  }

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  }

  const items: ReceiptItem[] = []

  for (const run of payrollRuns ?? []) {
    items.push({
      id: `payroll-${run.id}`,
      amount: '1.00',
      route: 'POST /api/mpp/payroll/execute',
      receiptHash: run.mpp_receipt_hash ?? undefined,
      createdAt: run.created_at,
    })
  }

  for (const event of complianceEvents ?? []) {
    const metadata = (event.metadata && typeof event.metadata === 'object')
      ? event.metadata as Record<string, unknown>
      : {}
    const receiptHash = typeof metadata.receiptHash === 'string'
      ? metadata.receiptHash
      : typeof metadata.reference === 'string'
        ? metadata.reference
        : undefined

    items.push({
      id: `compliance-${event.id}`,
      amount: '0.05',
      route: 'POST /api/mpp/compliance/check',
      receiptHash,
      createdAt: event.created_at,
    })
  }

  for (const session of sessions ?? []) {
    items.push({
      id: `session-${session.id}`,
      amount: Number(session.total_spent ?? 0).toFixed(2),
      route: 'POST /api/mpp/agent/session/treasury',
      receiptHash: session.channel_tx_hash ?? undefined,
      createdAt: session.opened_at,
    })
  }

  items.sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })

  return NextResponse.json({
    receipts: items.slice(0, 25),
  })
}

export const dynamic = 'force-dynamic'
