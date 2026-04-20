import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import {
  listAuthorizations,
  createAuthorization,
  revokeAuthorization,
} from '@/lib/queries/agent-authorizations'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authorizations = await listAuthorizations(employerId)
  return NextResponse.json(authorizations)
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    label?: string
    agent_identifier?: string
    per_tx_cap_usd?: number
    per_day_cap_usd?: number
  }

  if (!body.label?.trim() || !body.agent_identifier?.trim()) {
    return NextResponse.json({ error: 'label and agent_identifier are required' }, { status: 400 })
  }

  const perTx = Number(body.per_tx_cap_usd ?? 100)
  const perDay = Number(body.per_day_cap_usd ?? 500)
  if (!Number.isFinite(perTx) || perTx <= 0 || !Number.isFinite(perDay) || perDay <= 0) {
    return NextResponse.json({ error: 'Spend caps must be positive numbers' }, { status: 400 })
  }

  const created = await createAuthorization({
    employer_id: employerId,
    label: body.label.trim(),
    agent_identifier: body.agent_identifier.trim(),
    per_tx_cap_usd: perTx,
    per_day_cap_usd: perDay,
  })

  if (!created) {
    return NextResponse.json(
      { error: 'Failed to create authorization (duplicate agent_identifier?)' },
      { status: 409 },
    )
  }

  return NextResponse.json(created, { status: 201 })
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authorizationId = req.nextUrl.searchParams.get('authorization_id')
  if (!authorizationId) {
    return NextResponse.json({ error: 'authorization_id query param required' }, { status: 400 })
  }

  const ok = await revokeAuthorization(authorizationId, employerId)
  return NextResponse.json({ revoked: ok })
}
