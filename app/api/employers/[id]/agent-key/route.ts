import { randomBytes, createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

function hashKey(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)

  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawKey = `rmlo_agent_${randomBytes(24).toString('hex')}`
  const hashed = hashKey(rawKey)

  const supabase = createServerClient()
  const { error } = await supabase
    .from('employers')
    .update({
      mpp_agent_key_hash: hashed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employerId)
    .eq('owner_user_id', employer.owner_user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    apiKey: rawKey,
    generatedAt: new Date().toISOString(),
    rotated: Boolean(employer.mpp_agent_key_hash),
  })
}
