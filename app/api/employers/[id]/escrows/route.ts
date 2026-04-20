import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/employers/[id]/escrows
 * Employer-scoped escrow list for the dashboard.
 */
export async function GET(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '50')
  const supabase = createServerClient()
  const { data } = await supabase
    .from('escrows')
    .select('*')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json(data ?? [])
}
