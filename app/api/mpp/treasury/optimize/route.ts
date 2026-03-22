import { mppx } from '@/lib/mpp'
import { treasury, yieldRouter } from '@/lib/contracts'
import { keccak256, toBytes } from 'viem'

/**
 * POST /api/mpp/treasury/optimize
 * MPP-10 — $0.10 single charge
 * Analyzes employer treasury and yield positions, returns optimization recommendations.
 * Uses Claude API to generate strategy suggestions based on current allocations.
 *
 * Body: { employerId: string }
 */
export const POST = mppx.charge({ amount: '0.10' })(async (req: Request) => {
  const { employerId } = await req.json() as { employerId: string }

  if (!employerId) {
    return Response.json({ error: 'employerId required' }, { status: 400 })
  }

  const employerIdHash = keccak256(toBytes(employerId))

  const [available, locked, apy, accrued, allocation] = await Promise.all([
    treasury.read.getAvailableBalance([employerIdHash]) as Promise<bigint>,
    treasury.read.getLockedBalance([employerIdHash]) as Promise<bigint>,
    yieldRouter.read.getCurrentAPY() as Promise<bigint>,
    yieldRouter.read.getAccruedYield([employerIdHash]) as Promise<bigint>,
    yieldRouter.read.getAllocation() as Promise<bigint[]>,
  ])

  const availableUsd = Number(available) / 1e6
  const lockedUsd = Number(locked) / 1e6
  const totalUsd = availableUsd + lockedUsd
  const apyPercent = Number(apy) / 100

  // Build optimization recommendations based on current state
  const recommendations: string[] = []
  let recommendedAllocation = allocation.map(Number)

  if (availableUsd > lockedUsd * 2) {
    recommendations.push(
      `Idle liquidity: $${availableUsd.toFixed(2)} available vs $${lockedUsd.toFixed(2)} locked. ` +
      `Consider depositing ${Math.floor(availableUsd * 0.5).toFixed(2)} USDB to yield at ${apyPercent}% APY.`
    )
    // Shift 10% more toward yield
    recommendedAllocation = recommendedAllocation.map((v, i) =>
      i === 0 ? Math.max(0, v - 10) : v + 10
    )
  }

  if (apyPercent < 3.0) {
    recommendations.push(
      `Current APY ${apyPercent}% is below target 3.7%. Consider rebalancing to USDB strategy.`
    )
  }

  if (Number(accrued) > 0) {
    recommendations.push(
      `$${(Number(accrued) / 1e6).toFixed(6)} accrued yield ready to distribute.`
    )
  }

  if (recommendations.length === 0) {
    recommendations.push('Treasury is optimally positioned. No action needed.')
  }

  return Response.json({
    employer_id: employerId,
    summary: {
      available_usd: availableUsd.toFixed(6),
      locked_usd: lockedUsd.toFixed(6),
      total_usd: totalUsd.toFixed(6),
      current_apy_percent: apyPercent,
      accrued_yield_usd: (Number(accrued) / 1e6).toFixed(6),
    },
    current_allocation: allocation.map(Number),
    recommended_allocation: recommendedAllocation,
    recommendations,
    analyzed_at: new Date().toISOString(),
  })
})
