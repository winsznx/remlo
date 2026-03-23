import { mppx } from '@/lib/mpp'
import { treasury, yieldRouter } from '@/lib/contracts'
import { getEmployerById } from '@/lib/queries/employers'
import { getEmployerOnchainIdentity, getEmployerOnchainIdentityError } from '@/lib/employer-onchain'

/**
 * POST /api/mpp/treasury/optimize
 * MPP-10 — $0.10 session charge
 * Analyzes employer treasury and yield positions, returns optimization recommendations.
 * Accepts an optional natural-language question and returns a richer optimization summary.
 *
 * Body: { employerId: string, question?: string }
 */
export const POST = mppx.session({ amount: '0.10', unitType: 'session' })(async (req: Request) => {
  const { employerId, question } = await req.json() as { employerId: string; question?: string }

  if (!employerId) {
    return Response.json({ error: 'employerId required' }, { status: 400 })
  }

  const employer = await getEmployerById(employerId)
  if (!employer) {
    return Response.json({ error: 'Employer not found' }, { status: 404 })
  }

  const onchainIdentity = getEmployerOnchainIdentity(employer)
  if (!onchainIdentity) {
    return Response.json(getEmployerOnchainIdentityError(employer), { status: 409 })
  }

  const [available, locked, apy, accrued, allocation] = await Promise.all([
    treasury.read.getAvailableBalance([onchainIdentity.employerAccountId]) as Promise<bigint>,
    treasury.read.getLockedBalance([onchainIdentity.employerAccountId]) as Promise<bigint>,
    yieldRouter.read.getCurrentAPY() as Promise<bigint>,
    yieldRouter.read.getAccruedYield([onchainIdentity.employerAccountId]) as Promise<bigint>,
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

  const suggestion = question
    ? `Question received: "${question}". Based on the current treasury posture, ${recommendations[0].charAt(0).toLowerCase()}${recommendations[0].slice(1)}`
    : recommendations[0]

  const projectedAnnualYieldUsd = ((availableUsd * apyPercent) / 100).toFixed(2)

  return Response.json({
    employerId,
    employerAdminWallet: onchainIdentity.adminWallet,
    employerAccountId: onchainIdentity.employerAccountId,
    question: question ?? null,
    summary: {
      available_usd: availableUsd.toFixed(6),
      locked_usd: lockedUsd.toFixed(6),
      total_usd: totalUsd.toFixed(6),
      current_apy_percent: apyPercent,
      accrued_yield_usd: (Number(accrued) / 1e6).toFixed(6),
    },
    suggestion,
    recommendations: recommendations.map((text, index) => ({
      id: `rec-${index + 1}`,
      text,
      impact: index === 0 ? 'high' : 'medium',
    })),
    current_allocation: allocation.map(Number),
    recommended_allocation: recommendedAllocation,
    projected_annual_yield_usd: projectedAnnualYieldUsd,
    analyzedAt: new Date().toISOString(),
  })
})
