import { mppx } from '@/lib/mpp'
import { streamVesting, getServerWalletClient } from '@/lib/contracts'

const DEPLOYER_KEY = process.env.REMLO_AGENT_PRIVATE_KEY as `0x${string}`

/**
 * POST /api/mpp/employee/advance
 * MPP-3 — $0.50 single charge
 * Claims all accrued vesting for an employee via StreamVesting.claimAccrued.
 *
 * Body: { employeeAddress: string }
 */
export const POST = mppx.charge({ amount: '0.50' })(async (req: Request) => {
  const { employeeAddress } = await req.json() as { employeeAddress: string }

  if (!employeeAddress || !employeeAddress.startsWith('0x')) {
    return Response.json({ error: 'Invalid employeeAddress' }, { status: 400 })
  }

  const walletClient = getServerWalletClient(DEPLOYER_KEY)
  const txHash = await walletClient.writeContract({
    address: streamVesting.address,
    abi: streamVesting.abi,
    functionName: 'claimAccrued',
    args: [employeeAddress as `0x${string}`],
  })

  return Response.json({
    success: true,
    employee_address: employeeAddress,
    tx_hash: txHash,
    claimed_at: new Date().toISOString(),
  })
})
