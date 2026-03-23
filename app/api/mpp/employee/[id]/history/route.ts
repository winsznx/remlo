import { NextRequest } from 'next/server'
import { mppx } from '@/lib/mpp'
import { getPaymentItemsByEmployeeId } from '@/lib/queries/payroll'
import { byteaMemoToHex, decodeMemo } from '@/lib/memo'

/**
 * GET /api/mpp/employee/[id]/history
 * MPP-8 — $0.05 single charge
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

    const payments = items.map((item) => {
      const memoHex = byteaMemoToHex(item.memo_bytes)

      return {
        id: item.id,
        amount_usd: item.amount,
        status: item.status,
        tx_hash: item.tx_hash,
        memo: item.memo_decoded ?? (memoHex ? decodeMemo(memoHex) : null),
        created_at: item.created_at,
      }
    })

    return Response.json({
      employee_id: id,
      payments,
      count: payments.length,
    })
  })(req)
}
