import { mppx } from '@/lib/mpp'
import { treasury, yieldRouter, employeeRegistry, getServerWalletClient } from '@/lib/contracts'
import { keccak256, toBytes } from 'viem'

const DEPLOYER_KEY = process.env.REMLO_AGENT_PRIVATE_KEY as `0x${string}`

type Action = 'balance' | 'yield' | 'rebalance' | 'headcount'

/**
 * POST /api/mpp/agent/session/treasury
 * MPP-12 — $0.02 session charge
 * AI agent treasury management endpoint.
 * Handles 4 actions: balance, yield, rebalance, headcount.
 *
 * Body: { action: Action, employerId: string, allocation?: number[], params?: { targetAllocation?: number[] } }
 */
export const POST = mppx.session({ amount: '0.02', unitType: 'session' })(async (req: Request) => {
  const body = await req.json() as {
    action: Action
    employerId: string
    allocation?: number[]
    params?: {
      targetAllocation?: number[]
    }
  }

  const { action, employerId } = body
  const allocation = body.allocation ?? body.params?.targetAllocation

  if (!action || !employerId) {
    return Response.json({ error: 'action and employerId required' }, { status: 400 })
  }

  const employerIdHash = keccak256(toBytes(employerId))
  const timestamp = Date.now()

  switch (action) {
    case 'balance': {
      const [available, locked] = await Promise.all([
        treasury.read.getAvailableBalance([employerIdHash]) as Promise<bigint>,
        treasury.read.getLockedBalance([employerIdHash]) as Promise<bigint>,
      ])
      return Response.json({
        action,
        result: {
          employerId,
          availableRaw: available.toString(),
          availableUsd: (Number(available) / 1e6).toFixed(6),
          lockedRaw: locked.toString(),
          lockedUsd: (Number(locked) / 1e6).toFixed(6),
          totalUsd: ((Number(available) + Number(locked)) / 1e6).toFixed(6),
        },
        timestamp,
      })
    }

    case 'yield': {
      const apy = await yieldRouter.read.getCurrentAPY() as bigint
      const accrued = await yieldRouter.read.getAccruedYield([employerIdHash]) as bigint
      return Response.json({
        action,
        result: {
          employerId,
          apyBps: Number(apy),
          apyPercent: Number(apy) / 100,
          accruedRaw: accrued.toString(),
          accruedUsd: (Number(accrued) / 1e6).toFixed(6),
        },
        timestamp,
      })
    }

    case 'rebalance': {
      if (!allocation || !Array.isArray(allocation)) {
        return Response.json({ error: 'allocation[] required for rebalance' }, { status: 400 })
      }
      const walletClient = getServerWalletClient(DEPLOYER_KEY)
      const txHash = await walletClient.writeContract({
        address: yieldRouter.address,
        abi: yieldRouter.abi,
        functionName: 'rebalance',
        args: [employerIdHash, allocation.map(BigInt)],
      })
      return Response.json({
        action,
        result: {
          employerId,
          txHash,
          targetAllocation: allocation,
        },
        timestamp,
      })
    }

    case 'headcount': {
      const count = await employeeRegistry.read.getEmployeeCount([employerIdHash]) as bigint
      return Response.json({
        action,
        result: {
          employerId,
          headcount: Number(count),
        },
        timestamp,
      })
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
})
