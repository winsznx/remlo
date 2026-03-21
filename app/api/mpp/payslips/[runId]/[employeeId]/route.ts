import { NextRequest } from 'next/server'
import { mppx } from '@/lib/mpp'
import { getPayslip } from '@/lib/queries/payroll'
import { decodeMemo } from '@/lib/memo'

/**
 * GET /api/mpp/payslips/[runId]/[employeeId]
 * MPP-7a — $0.02 single charge
 * Returns a single payslip for an employee within a payroll run.
 * Includes decoded ISO 20022 memo fields.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string; employeeId: string }> }
) {
  const { runId, employeeId } = await params

  return mppx.charge({ amount: '0.02' })(async () => {
    const result = await getPayslip(runId, employeeId)
    if (!result) {
      return Response.json({ error: 'Payslip not found' }, { status: 404 })
    }

    const { run, item } = result
    const memoFields = item.memo_decoded
      ? decodeMemo(item.memo_decoded as `0x${string}`)
      : null

    return Response.json({
      payslip: {
        run_id: run.id,
        employee_id: employeeId,
        amount_usd: item.amount,
        status: item.status,
        tx_hash: item.tx_hash,
        memo: memoFields,
        finalized_at: run.finalized_at,
        block_number: run.block_number,
        created_at: item.created_at,
      },
    })
  })(req)
}
