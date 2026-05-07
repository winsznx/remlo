import { type NextRequest, NextResponse } from 'next/server'

import { getAuthorizedEmployer } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/employers/[id]/agents/pause-all
 *
 * Emergency pause / kill switch — Tier 1 security gate 1. Sets `paused_at`
 * on every active authorization owned by the employer. Subsequent calls
 * to `/api/mpp/agent/pay` for any of those agents return 403
 * `AGENT_PAUSED` immediately, regardless of caps or velocity.
 *
 * Body (optional):
 *   { reason?: string }
 *
 * Auth: Privy bearer of the employer owner. Agents (HMAC / Tier 2) cannot
 * pause — only the human owner can hit the kill switch from the dashboard.
 *
 * Idempotent: pausing an already-paused authorization keeps the original
 * `paused_at` timestamp so the audit trail of when the first pause happened
 * is preserved.
 *
 * DELETE /api/employers/[id]/agents/pause-all
 *   Resume — clears `paused_at` and `pause_reason` on every paused
 *   authorization for this employer. Same auth requirements.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PauseBody {
  reason?: unknown
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) {
    return NextResponse.json(
      { error: 'Not authorized for this employer' },
      { status: 403 },
    )
  }

  let body: PauseBody = {}
  try {
    body = (await req.json()) as PauseBody
  } catch {
    body = {}
  }
  const reason =
    typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 500)
      : null

  const supabase = createServerClient()
  const pausedAt = new Date().toISOString()
  const { data: paused, error } = await supabase
    .from('employer_agent_authorizations')
    .update({ paused_at: pausedAt, pause_reason: reason })
    .eq('employer_id', employerId)
    .eq('active', true)
    .is('paused_at', null)
    .select('id, label')

  if (error) {
    return NextResponse.json(
      { error: `Failed to pause agents: ${error.message}` },
      { status: 500 },
    )
  }

  if ((paused?.length ?? 0) > 0) {
    await createNotification({
      employerId,
      kind: 'agent_paused',
      title: `${paused!.length} agent(s) paused`,
      body: reason
        ? `Pause reason: ${reason}. Resume any time from /dashboard/settings/agents.`
        : 'Resume any time from /dashboard/settings/agents.',
      severity: 'warning',
      link: '/dashboard/settings/agents',
      metadata: {
        paused_at: pausedAt,
        authorization_ids: paused!.map((p) => p.id),
      },
    })
  }

  return NextResponse.json({
    success: true,
    paused_count: paused?.length ?? 0,
    paused_at: pausedAt,
    pause_reason: reason,
    paused_authorizations:
      paused?.map((p) => ({ id: p.id, label: p.label })) ?? [],
  })
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) {
    return NextResponse.json(
      { error: 'Not authorized for this employer' },
      { status: 403 },
    )
  }

  const supabase = createServerClient()
  const { data: resumed, error } = await supabase
    .from('employer_agent_authorizations')
    .update({ paused_at: null, pause_reason: null })
    .eq('employer_id', employerId)
    .not('paused_at', 'is', null)
    .select('id, label')

  if (error) {
    return NextResponse.json(
      { error: `Failed to resume agents: ${error.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    resumed_count: resumed?.length ?? 0,
    resumed_authorizations:
      resumed?.map((r) => ({ id: r.id, label: r.label })) ?? [],
  })
}
