import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/employers/[id]/name — public endpoint, returns only company_name. */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = createServerClient()
  const { data } = await supabase
    .from('employers')
    .select('company_name')
    .eq('id', id)
    .eq('active', true)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ company_name: data.company_name })
}
