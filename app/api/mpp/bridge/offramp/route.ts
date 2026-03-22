import { Mppx } from 'mppx/server'
import { mppxMultiRail } from '@/lib/mpp-multirail'
import { createOffRampTransfer } from '@/lib/bridge'
import { createServerClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

/**
 * POST /api/mpp/bridge/offramp
 * MPP-9 — $0.25 single charge (Tempo + Stripe SPT fallback)
 * Initiates a Bridge off-ramp transfer for an employee.
 * Converts on-chain balance to fiat via ACH/SEPA/SPEI/PIX.
 *
 * Body: {
 *   employeeId: string
 *   amount: string          — USD amount e.g. "100.00"
 *   destinationType: 'ach' | 'sepa' | 'spei' | 'pix'
 *   bankAccountId: string
 * }
 */
export async function POST(req: Request) {
  const mppxResult = await Mppx.compose(
    mppxMultiRail.tempo.charge({ amount: '0.25' }),
    mppxMultiRail.stripe.charge({ amount: '0.25', currency: 'usd' })
  )(req)

  if (mppxResult.status === 402) return mppxResult.challenge

  const body = await req.json() as {
    employeeId: string
    amount: string
    destinationType: 'ach' | 'sepa' | 'spei' | 'pix'
    bankAccountId: string
  }

  const { employeeId, amount, destinationType, bankAccountId } = body

  if (!employeeId || !amount || !destinationType || !bankAccountId) {
    return Response.json({ error: 'employeeId, amount, destinationType, bankAccountId required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('id, bridge_customer_id')
    .eq('id', employeeId)
    .single()

  if (!employee?.bridge_customer_id) {
    return Response.json({ error: 'Employee has no Bridge account. Complete KYC first.' }, { status: 422 })
  }

  const transfer = await createOffRampTransfer({
    customerId: employee.bridge_customer_id,
    amount,
    currency: 'usd',
    destinationType,
    bankAccountId,
    idempotencyKey: randomUUID(),
  })

  return mppxResult.withReceipt(Response.json({
    success: true,
    transfer_id: transfer.id,
    status: transfer.status,
    amount,
    destination_type: destinationType,
    created_at: transfer.created_at,
  }))
}
