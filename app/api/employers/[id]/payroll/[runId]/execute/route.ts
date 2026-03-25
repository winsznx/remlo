import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { payrollBatcher, getServerWalletClient } from '@/lib/contracts'
import { getEmployerOnchainIdentity, getEmployerOnchainIdentityError } from '@/lib/employer-onchain'
import { byteaMemoToHex } from '@/lib/memo'

type RouteContext = { params: Promise<{ id: string; runId: string }> }

const AGENT_KEY = process.env.REMLO_AGENT_PRIVATE_KEY as `0x${string}`

/**
 * POST /api/employers/[id]/payroll/[runId]/execute
 * Server-side payroll execution — the Remlo agent wallet signs the on-chain tx,
 * so the employer never needs a wallet popup. Employer auth is enforced via
 * getAuthorizedEmployer (Privy Bearer token).
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employerId, runId } = await ctx.params

  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const onchainIdentity = getEmployerOnchainIdentity(employer)
  if (!onchainIdentity) {
    return NextResponse.json(getEmployerOnchainIdentityError(employer), { status: 409 })
  }

  const supabase = createServerClient()

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('id, status, employer_id')
    .eq('id', runId)
    .eq('employer_id', employerId)
    .single()

  if (!run) {
    return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
  }
  if (run.status !== 'pending') {
    return NextResponse.json({ error: `Payroll run is ${run.status}, not pending` }, { status: 409 })
  }

  const { data: items } = await supabase
    .from('payment_items')
    .select('id, employee_id, amount, memo_bytes')
    .eq('payroll_run_id', runId)

  if (!items?.length) {
    return NextResponse.json({ error: 'No payment items found' }, { status: 400 })
  }

  const employeeIds = items.map((i) => i.employee_id)
  const { data: employees } = await supabase
    .from('employees')
    .select('id, wallet_address')
    .in('id', employeeIds)

  const walletMap = new Map<string, string>(
    (employees ?? [])
      .filter((e) => e.wallet_address)
      .map((e) => [e.id, e.wallet_address as string]),
  )

  const missing = employeeIds.filter((id) => !walletMap.has(id))
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `${missing.length} employee(s) missing wallet addresses` },
      { status: 422 },
    )
  }

  const recipients = items.map((i) => walletMap.get(i.employee_id)! as `0x${string}`)
  const amounts = items.map((i) => BigInt(Math.round(i.amount * 1e6)))
  const memos = items.map((i) => byteaMemoToHex(i.memo_bytes))

  if (memos.some((m) => !m)) {
    return NextResponse.json(
      { error: 'One or more payment items are missing a valid 32-byte memo' },
      { status: 422 },
    )
  }

  const walletClient = getServerWalletClient(AGENT_KEY)
  const txHash = await walletClient.writeContract({
    address: payrollBatcher.address,
    abi: payrollBatcher.abi,
    functionName: 'executeBatchPayroll',
    args: [recipients, amounts, memos as `0x${string}`[], onchainIdentity.employerAccountId],
  })

  await Promise.all([
    supabase
      .from('payroll_runs')
      .update({ status: 'processing', tx_hash: txHash })
      .eq('id', runId),
    supabase
      .from('payment_items')
      .update({ tx_hash: txHash, status: 'pending' })
      .eq('payroll_run_id', runId),
  ])

  return NextResponse.json({
    success: true,
    tx_hash: txHash,
    payroll_run_id: runId,
    recipient_count: recipients.length,
  })
}
