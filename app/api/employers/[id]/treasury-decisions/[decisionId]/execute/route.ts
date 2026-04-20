import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { executeTreasuryAction, getTreasuryDecisionDetail } from '@/lib/treasury-council'

type RouteContext = { params: Promise<{ id: string; decisionId: string }> }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employerId, decisionId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const detail = await getTreasuryDecisionDetail(decisionId, employerId)
  if (!detail) return NextResponse.json({ error: 'Decision not found' }, { status: 404 })

  try {
    const result = await executeTreasuryAction(decisionId)
    return NextResponse.json({
      decision_id: decisionId,
      signature: result.signature,
      message: result.message,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    const status = msg.includes('requires') ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
