import { Mppx } from 'mppx/server'
import { mppxMultiRail } from '@/lib/mpp-multirail'
import { payrollBatcher, getServerWalletClient } from '@/lib/contracts'
import { getPayrollRunById, getPaymentItemsByRunId } from '@/lib/queries/payroll'
import { createServerClient } from '@/lib/supabase-server'
import { keccak256, toBytes } from 'viem'
import { byteaMemoToHex } from '@/lib/memo'

const DEPLOYER_KEY = process.env.REMLO_AGENT_PRIVATE_KEY as `0x${string}`

/**
 * POST /api/mpp/payroll/execute
 * MPP-2 — $1.00 single charge
 * Executes a pending payroll batch on-chain via PayrollBatcher.
 * Fetches payment_items + employee wallets from Supabase, calls executeBatchPayroll,
 * and updates payroll_runs with tx_hash.
 *
 * Body: { payrollRunId: string }
 */
export async function POST(req: Request) {
  const mppxResult = await Mppx.compose(
    mppxMultiRail.tempo.charge({ amount: '1.00' }),
    mppxMultiRail.stripe.charge({ amount: '1.00', currency: 'usd', decimals: 2 })
  )(req)
  
  if (mppxResult.status === 402) return mppxResult.challenge

  const { payrollRunId } = await req.json() as { payrollRunId: string }

  if (!payrollRunId) {
    return Response.json({ error: 'payrollRunId required' }, { status: 400 })
  }

  const run = await getPayrollRunById(payrollRunId)
  if (!run) {
    return Response.json({ error: 'Payroll run not found' }, { status: 404 })
  }
  if (run.status !== 'pending') {
    return Response.json({ error: `Payroll run is ${run.status}, not pending` }, { status: 409 })
  }

  const items = await getPaymentItemsByRunId(payrollRunId)
  if (items.length === 0) {
    return Response.json({ error: 'No payment items found' }, { status: 400 })
  }

  // Fetch wallet addresses from employees table
  const supabase = createServerClient()
  const employeeIds = items.map((item) => item.employee_id)
  const { data: employees } = await supabase
    .from('employees')
    .select('id, wallet_address')
    .in('id', employeeIds)

  const walletMap = new Map<string, string>(
    (employees ?? [])
      .filter((e) => e.wallet_address)
      .map((e) => [e.id, e.wallet_address as string])
  )

  const missing = employeeIds.filter((id) => !walletMap.has(id))
  if (missing.length > 0) {
    return Response.json(
      { error: `${missing.length} employees missing wallet addresses` },
      { status: 422 }
    )
  }

  const recipients = items.map((item) => walletMap.get(item.employee_id)! as `0x${string}`)
  const amounts = items.map((item) => BigInt(Math.round(item.amount * 1e6)))
  const memos = items.map((item) => byteaMemoToHex(item.memo_bytes))
  if (memos.some((memo) => !memo)) {
    return Response.json(
      { error: 'One or more payment items are missing a valid 32-byte payroll memo' },
      { status: 422 }
    )
  }
  const employerIdHash = keccak256(toBytes(run.employer_id))

  const walletClient = getServerWalletClient(DEPLOYER_KEY)
  const txHash = await walletClient.writeContract({
    address: payrollBatcher.address,
    abi: payrollBatcher.abi,
    functionName: 'executeBatchPayroll',
    args: [recipients, amounts, memos as `0x${string}`[], employerIdHash],
  })

  await supabase
    .from('payroll_runs')
    .update({ status: 'submitted', tx_hash: txHash })
    .eq('id', payrollRunId)

  return mppxResult.withReceipt(Response.json({
    success: true,
    tx_hash: txHash,
    payroll_run_id: payrollRunId,
    recipient_count: recipients.length,
  }))
}
