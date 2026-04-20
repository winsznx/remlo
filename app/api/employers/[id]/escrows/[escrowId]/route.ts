import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string; escrowId: string }> }

/**
 * GET /api/employers/[id]/escrows/[escrowId]
 * Full escrow row for the detail page — includes all fields (validator_model,
 * hashes, agent identifiers) since the employer is authorized to see them.
 */
export async function GET(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { id: employerId, escrowId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', escrowId)
    .eq('employer_id', employerId)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
  return NextResponse.json(data)
}
