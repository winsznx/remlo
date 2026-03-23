import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCallerEmployer, getAuthorizedEmployee } from '@/lib/auth'
import { issueCard } from '@/lib/bridge'

type RouteContext = { params: Promise<{ id: string }> }

function normalizeCardStatus(employee: {
  bridge_card_id: string | null
  kyc_status: string
}) {
  if (!employee.bridge_card_id) return employee.kyc_status === 'approved' ? 'ready' : 'pending'
  return 'active'
}

async function getScopedEmployee(req: NextRequest, employeeId: string) {
  const employeeCaller = await getAuthorizedEmployee(req, employeeId)
  if (employeeCaller) return employeeCaller

  const employerCaller = await getCallerEmployer(req)
  if (!employerCaller) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .eq('employer_id', employerCaller.id)
    .eq('active', true)
    .maybeSingle()

  return data ?? null
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employeeId } = await ctx.params
  const employee = await getScopedEmployee(req, employeeId)

  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    hasCard: Boolean(employee.bridge_card_id),
    canIssue: employee.kyc_status === 'approved' && Boolean(employee.bridge_customer_id),
    card: employee.bridge_card_id
      ? {
          id: employee.bridge_card_id,
          last4: employee.bridge_card_id.slice(-4),
          expiryMonth: null,
          expiryYear: null,
          status: normalizeCardStatus(employee),
        }
      : null,
    transactions: [],
    bankAccountConnected: Boolean(employee.bridge_bank_account_id),
    kycStatus: employee.kyc_status,
  })
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employeeId } = await ctx.params
  const employee = await getScopedEmployee(req, employeeId)

  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (employee.bridge_card_id) {
    return NextResponse.json({
      hasCard: true,
      card: {
        id: employee.bridge_card_id,
        last4: employee.bridge_card_id.slice(-4),
        expiryMonth: null,
        expiryYear: null,
        status: 'active',
      },
      transactions: [],
    })
  }

  if (!employee.bridge_customer_id) {
    return NextResponse.json({ error: 'Complete employee onboarding before issuing a card' }, { status: 422 })
  }

  if (employee.kyc_status !== 'approved') {
    return NextResponse.json({ error: 'Employee KYC must be approved before card issuance' }, { status: 422 })
  }

  try {
    const card = await issueCard({
      customerId: employee.bridge_customer_id,
      idempotencyKey: `card-${employee.id}-${randomUUID()}`,
    })

    const supabase = createServerClient()
    const { error } = await supabase
      .from('employees')
      .update({
        bridge_card_id: card.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      hasCard: true,
      card: {
        id: card.id,
        last4: card.card_number_last4,
        expiryMonth: card.expiration_month,
        expiryYear: card.expiration_year,
        status: card.status,
      },
      transactions: [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to issue card' },
      { status: 500 }
    )
  }
}
