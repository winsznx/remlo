import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployee } from '@/lib/auth'
import { createOffRampTransfer } from '@/lib/bridge'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employeeId } = await ctx.params
  const employee = await getAuthorizedEmployee(req, employeeId)

  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    amount?: number | string
    destinationType?: 'ach' | 'sepa' | 'spei' | 'pix'
  }

  const rawAmount =
    typeof body.amount === 'number'
      ? body.amount.toFixed(2)
      : body.amount?.trim()

  if (!rawAmount || Number.isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
    return NextResponse.json({ error: 'A positive amount is required' }, { status: 400 })
  }

  if (!employee.bridge_customer_id) {
    return NextResponse.json({ error: 'Complete Bridge KYC before initiating transfers' }, { status: 422 })
  }

  if (!employee.bridge_bank_account_id) {
    return NextResponse.json({ error: 'Connect a bank account before transferring funds' }, { status: 422 })
  }

  const destinationType = body.destinationType ?? 'ach'
  const transfer = await createOffRampTransfer({
    customerId: employee.bridge_customer_id,
    amount: Number(rawAmount).toFixed(2),
    currency: 'usd',
    destinationType,
    bankAccountId: employee.bridge_bank_account_id,
    idempotencyKey: randomUUID(),
  })

  return NextResponse.json({
    success: true,
    transfer_id: transfer.id,
    status: transfer.status,
    amount: transfer.amount,
    destination_type: destinationType,
    created_at: transfer.created_at,
  })
}
