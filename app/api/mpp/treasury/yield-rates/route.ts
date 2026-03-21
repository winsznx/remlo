import { mppx } from '@/lib/mpp'
import { yieldRouter } from '@/lib/contracts'

/**
 * GET /api/mpp/treasury/yield-rates
 * MPP-1 — $0.01 single charge
 * Returns current APY, yield sources, and allocation from YieldRouter contract.
 */
export const GET = mppx.charge({ amount: '0.01' })(async () => {
  const [apy, sources, allocation] = await Promise.all([
    yieldRouter.read.getCurrentAPY() as Promise<bigint>,
    yieldRouter.read.getYieldSources() as Promise<string[]>,
    yieldRouter.read.getAllocation() as Promise<bigint[]>,
  ])

  return Response.json({
    apy_bps: Number(apy),
    apy_percent: Number(apy) / 100,
    sources,
    allocation: allocation.map(Number),
    timestamp: Date.now(),
  })
})
