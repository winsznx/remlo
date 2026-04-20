import { NextRequest, NextResponse } from 'next/server'
import { parseUnits, keccak256, toBytes } from 'viem'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { streamVesting, getServerWalletClient, publicClient } from '@/lib/contracts'

type RouteContext = { params: Promise<{ id: string; employeeId: string }> }

const AGENT_KEY = process.env.REMLO_AGENT_PRIVATE_KEY as `0x${string}` | undefined
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60

/**
 * POST /api/employers/[id]/team/[employeeId]/stream
 * Starts an on-chain StreamVesting stream for an employee with pay_frequency='stream'.
 * Signs with REMLO_AGENT_PRIVATE_KEY today; Privy server wallet in Phase 2.
 */
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { id: employerId, employeeId } = await ctx.params

  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!AGENT_KEY) {
    return NextResponse.json(
      { error: 'REMLO_AGENT_PRIVATE_KEY not configured on server' },
      { status: 503 },
    )
  }

  const supabase = createServerClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('id, first_name, last_name, wallet_address, salary_amount, pay_frequency, stream_contract, employer_id')
    .eq('id', employeeId)
    .eq('employer_id', employerId)
    .single()

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  if (employee.pay_frequency !== 'stream') {
    return NextResponse.json(
      { error: `Employee pay_frequency is ${employee.pay_frequency}, not 'stream'` },
      { status: 409 },
    )
  }

  if (!employee.wallet_address) {
    return NextResponse.json({ error: 'Employee has no wallet_address' }, { status: 422 })
  }

  if (employee.stream_contract) {
    return NextResponse.json(
      {
        error: 'Stream already exists for this employee',
        existing_stream_tx: employee.stream_contract,
      },
      { status: 409 },
    )
  }

  if (!employee.salary_amount || employee.salary_amount <= 0) {
    return NextResponse.json({ error: 'Employee salary_amount not set' }, { status: 422 })
  }

  const totalAmount = parseUnits((employee.salary_amount * 12).toFixed(6), 6)
  const now = Math.floor(Date.now() / 1000)
  const payrollMemo = keccak256(toBytes(`stream:${employee.id}:${now}`))

  const walletClient = getServerWalletClient(AGENT_KEY)
  const txHash = await walletClient.writeContract({
    address: streamVesting.address,
    abi: streamVesting.abi,
    functionName: 'createStream',
    args: [
      employee.wallet_address as `0x${string}`,
      totalAmount,
      BigInt(now),
      BigInt(now + SECONDS_PER_YEAR),
      BigInt(0),
      payrollMemo,
    ],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

  await supabase
    .from('employees')
    .update({ stream_contract: txHash })
    .eq('id', employeeId)

  return NextResponse.json({
    success: true,
    tx_hash: txHash,
    block_number: Number(receipt.blockNumber),
    explorer_url: `https://explore.moderato.tempo.xyz/tx/${txHash}`,
    employee_id: employeeId,
    total_amount_usd: employee.salary_amount * 12,
    duration_days: 365,
  })
}
