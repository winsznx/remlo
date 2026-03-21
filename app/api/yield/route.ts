import { NextRequest, NextResponse } from 'next/server'
import { keccak256, toBytes } from 'viem'
import { getCallerEmployer } from '@/lib/auth'
import { yieldRouter } from '@/lib/contracts'

/**
 * GET /api/yield
 * Returns current APY, accrued yield, and yield config for the caller's employer.
 * Reads live data from YieldRouter contract.
 */
export async function GET(req: NextRequest) {
  const employer = await getCallerEmployer(req)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const employerIdHash = keccak256(toBytes(employer.id))

  const [apy, accrued, config] = await Promise.all([
    yieldRouter.read.getCurrentAPY() as Promise<bigint>,
    yieldRouter.read.getAccruedYield([employerIdHash]) as Promise<bigint>,
    yieldRouter.read.yieldConfig([employerIdHash]) as Promise<[number, number, string]>,
  ])

  const YIELD_MODEL_LABELS = ['employer_keeps', 'employee_bonus', 'split'] as const
  const [modelIndex, employeeSplitBps, strategy] = config

  return NextResponse.json({
    apy_bps: Number(apy),
    apy_percent: Number(apy) / 100,
    accrued_raw: accrued.toString(),
    accrued_usd: (Number(accrued) / 1e6).toFixed(6),
    yield_model: YIELD_MODEL_LABELS[modelIndex] ?? 'employer_keeps',
    employee_split_bps: employeeSplitBps,
    strategy_address: strategy,
  })
}
