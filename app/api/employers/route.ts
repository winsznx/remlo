import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

function decodePrivyToken(token: string): { sub: string } | null {
  try {
    const [, payload] = token.split('.')
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = JSON.parse(atob(padded)) as { sub?: string; exp?: number }
    if (!decoded.sub) return null
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null
    return { sub: decoded.sub }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const decoded = decodePrivyToken(token)
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const body = (await req.json()) as { companyName?: string; companySize?: string }
  const companyName = body.companyName?.trim()
  if (!companyName) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Check if this user already has an employer record
  const { data: existing } = await supabase
    .from('employers')
    .select('id')
    .eq('owner_user_id', decoded.sub)
    .single()

  if (existing) {
    return NextResponse.json({ employerId: existing.id })
  }

  const { data, error } = await supabase
    .from('employers')
    .insert({
      owner_user_id: decoded.sub,
      company_name: companyName,
      company_size: body.companySize ?? null,
      subscription_tier: 'starter',
      active: true,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create employer' }, { status: 500 })
  }

  return NextResponse.json({ employerId: data.id }, { status: 201 })
}
