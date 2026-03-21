import { NextRequest } from 'next/server'
import { mppx } from '@/lib/mpp'
import { getPaymentItemsByEmployeeId } from '@/lib/queries/payroll'
import { decodeMemo } from '@/lib/memo'

/**
 * GET /api/mpp/employee/[id]/history
 * MPP-7c — $0.05 single charge
 * Returns paginated payment history for an employee with decoded memos.
 *
 * Query params: ?limit=50
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(req.url)
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50', 10))

  return mppx.charge({ amount: '0.05' })(async () => {
    const items = await getPaymentItemsByEmployeeId(id, limit)

    const payments = items.map((item) => ({
      id: item.id,
      amount_usd: item.amount,
      status: item.status,
      tx_hash: item.tx_hash,
      memo: item.memo_decoded ? decodeMemo(item.memo_decoded as `0x${string}`) : null,
      created_at: item.created_at,
    }))

    return Response.json({
      employee_id: id,
      payments,
      count: payments.length,
    })
  })(req)
}
