import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import {
  listTreasuryDecisions,
  proposeTreasuryAction,
  type TreasuryActionType,
} from '@/lib/treasury-council'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_ACTION_TYPES: ReadonlySet<TreasuryActionType> = new Set([
  'yield_route_change',
  'allocation_rebalance',
  'large_payroll_approval',
])

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decisions = await listTreasuryDecisions(employerId)
  return NextResponse.json({ decisions })
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { action_type?: string; action_payload?: Record<string, unknown>; rationale?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.action_type || !VALID_ACTION_TYPES.has(body.action_type as TreasuryActionType)) {
    return NextResponse.json(
      {
        error: `action_type must be one of: ${[...VALID_ACTION_TYPES].join(', ')}`,
      },
      { status: 400 },
    )
  }
  if (!body.rationale || !body.rationale.trim()) {
    return NextResponse.json({ error: 'rationale is required' }, { status: 400 })
  }

  try {
    const decision = await proposeTreasuryAction({
      employerId,
      actionType: body.action_type as TreasuryActionType,
      actionPayload: body.action_payload ?? {},
      rationale: body.rationale,
      proposerUserId: employer.owner_user_id,
    })
    return NextResponse.json({ decision_id: decision.id, status: decision.status }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
