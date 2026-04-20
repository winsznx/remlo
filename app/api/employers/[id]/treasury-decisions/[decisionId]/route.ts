import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { getTreasuryDecisionDetail } from '@/lib/treasury-council'

type RouteContext = { params: Promise<{ id: string; decisionId: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId, decisionId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const detail = await getTreasuryDecisionDetail(decisionId, employerId)
  if (!detail) return NextResponse.json({ error: 'Decision not found' }, { status: 404 })

  return NextResponse.json(detail)
}
