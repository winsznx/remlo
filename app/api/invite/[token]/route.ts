import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getPrivyClaims } from '@/lib/auth'

type RouteContext = { params: Promise<{ token: string }> }

/**
 * GET /api/invite/[token]
 * Public — no auth required. Returns safe display fields for the invite card.
 * Uses service role to bypass RLS so unclaimed rows are readable.
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, email, first_name, last_name, job_title, department, salary_amount, salary_currency, pay_frequency, user_id')
    .eq('id', token)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (data.user_id) {
    return NextResponse.json({ error: 'Invite already claimed' }, { status: 409 })
  }

  return NextResponse.json({
    employeeId: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    jobTitle: data.job_title,
    department: data.department,
    salaryAmount: data.salary_amount,
    salaryCurrency: data.salary_currency,
    payFrequency: data.pay_frequency,
  })
}

/**
 * POST /api/invite/[token]/claim
 * Requires Privy Bearer token. Claims the invite for the authenticated user.
 * Blocks employer DIDs from accidentally claiming employee invites.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const claims = getPrivyClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  // Block employer DIDs — they should not be claiming employee invites
  const { data: existingEmployer } = await supabase
    .from('employers')
    .select('id')
    .eq('owner_user_id', claims.sub)
    .eq('active', true)
    .maybeSingle()

  if (existingEmployer) {
    return NextResponse.json(
      { error: 'This Privy account is already registered as an employer. Use a separate account to accept employee invites.' },
      { status: 403 }
    )
  }

  // Fetch the unclaimed employee row
  const { data: employee, error: fetchError } = await supabase
    .from('employees')
    .select('id, user_id')
    .eq('id', token)
    .eq('active', true)
    .maybeSingle()

  if (fetchError || !employee) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (employee.user_id) {
    return NextResponse.json({ error: 'Invite already claimed' }, { status: 409 })
  }

  // Extract wallet address from request body (client sends Privy wallet)
  const body = (await req.json().catch(() => ({}))) as { walletAddress?: string }

  const { error: updateError } = await supabase
    .from('employees')
    .update({
      user_id: claims.sub,
      wallet_address: body.walletAddress ?? null,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', token)
    .is('user_id', null) // idempotency guard — only update if still unclaimed

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
