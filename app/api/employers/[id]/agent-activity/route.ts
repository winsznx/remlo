import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string }> }

interface AgentAggregate {
  authorization_id: string
  agent_identifier: string
  label: string
  call_count: number
  total_usd: number
  success_count: number
  latest_call_at: string | null
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServerClient()

  const { data: authorizations } = await sb
    .from('employer_agent_authorizations')
    .select('id, label, agent_identifier')
    .eq('employer_id', employerId)

  const { data: calls } = await sb
    .from('agent_pay_calls')
    .select('authorization_id, usd_amount, tx_hash, created_at')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(5000)

  const authMap = new Map(
    (authorizations ?? []).map((a) => [a.id, a] as const),
  )

  const agg = new Map<string, AgentAggregate>()
  for (const c of calls ?? []) {
    const auth = authMap.get(c.authorization_id)
    if (!auth) continue
    const key = auth.agent_identifier
    const existing = agg.get(key) ?? {
      authorization_id: auth.id,
      agent_identifier: auth.agent_identifier,
      label: auth.label,
      call_count: 0,
      total_usd: 0,
      success_count: 0,
      latest_call_at: null,
    }
    existing.call_count += 1
    existing.total_usd += Number(c.usd_amount) || 0
    if (c.tx_hash) existing.success_count += 1
    if (!existing.latest_call_at || c.created_at > existing.latest_call_at) {
      existing.latest_call_at = c.created_at
    }
    agg.set(key, existing)
  }

  const agents = Array.from(agg.values()).sort((a, b) => b.call_count - a.call_count)
  const totalCalls = agents.reduce((sum, a) => sum + a.call_count, 0)
  const totalUsd = agents.reduce((sum, a) => sum + a.total_usd, 0)

  return NextResponse.json({
    employer_id: employerId,
    totals: {
      external_agent_count: agents.length,
      total_calls: totalCalls,
      total_usd: totalUsd,
    },
    agents,
  })
}
