import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCallerEmployer } from '@/lib/auth'
import { bridgeRequest } from '@/lib/bridge'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/employees/[id]/kyc
 * Creates a Bridge KYC link for the employee, stores bridge_customer_id, returns the link URL.
 * Employer-only: caller must own the employer record that employs this employee.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params

  const caller = await getCallerEmployer(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: employee, error: fetchErr } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('employer_id', caller.id)
    .single()

  if (fetchErr || !employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  interface KycLink { url: string }
  interface Customer { id: string }

  // If already has a KYC link (bridge_customer_id present), generate a fresh link URL
  if (employee.bridge_customer_id) {
    const link = await bridgeRequest<KycLink>(`/kyc_links`, {
      method: 'POST',
      body: JSON.stringify({
        customer_id: employee.bridge_customer_id,
        type: 'individual',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${id}?kyc=complete`,
      }),
      headers: { 'Idempotency-Key': `kyc-${id}-${Date.now()}` },
    })
    return NextResponse.json({ kycUrl: link.url, customerId: employee.bridge_customer_id })
  }

  // Create a new Bridge customer for this employee
  const customer = await bridgeRequest<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      type: 'individual',
      email: employee.email,
      first_name: employee.first_name ?? undefined,
      last_name: employee.last_name ?? undefined,
    }),
    headers: { 'Idempotency-Key': `customer-${id}` },
  })

  await supabase
    .from('employees')
    .update({ bridge_customer_id: customer.id })
    .eq('id', id)

  // Create KYC link
  const link = await bridgeRequest<KycLink>('/kyc_links', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customer.id,
      type: 'individual',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${id}?kyc=complete`,
    }),
    headers: { 'Idempotency-Key': `kyc-${id}` },
  })

  return NextResponse.json({ kycUrl: link.url, customerId: customer.id }, { status: 201 })
}
