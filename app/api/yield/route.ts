import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployer } from '@/lib/auth'
import { yieldRouter } from '@/lib/contracts'
import { getEmployerOnchainIdentity, getEmployerOnchainIdentityError } from '@/lib/employer-onchain'

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

  const onchainIdentity = getEmployerOnchainIdentity(employer)
  if (!onchainIdentity) {
    return NextResponse.json(getEmployerOnchainIdentityError(employer), { status: 409 })
  }

  const [apy, accrued, config] = await Promise.all([
    yieldRouter.read.getCurrentAPY() as Promise<bigint>,
    yieldRouter.read.getAccruedYield([onchainIdentity.employerAccountId]) as Promise<bigint>,
    yieldRouter.read.yieldConfig([onchainIdentity.employerAccountId]) as Promise<[number, number, string]>,
  ])

  const YIELD_MODEL_LABELS = ['employer_keeps', 'employee_bonus', 'split'] as const
  const [modelIndex, employeeSplitBps, strategy] = config

  return NextResponse.json({
    apy_bps: Number(apy),
    apy_percent: Number(apy) / 100,
    accrued_raw: accrued.toString(),
    accrued_usd: (Number(accrued) / 1e6).toFixed(6),
    employer_admin_wallet: onchainIdentity.adminWallet,
    employer_account_id: onchainIdentity.employerAccountId,
    yield_model: YIELD_MODEL_LABELS[modelIndex] ?? 'employer_keeps',
    employee_split_bps: employeeSplitBps,
    strategy_address: strategy,
  })
}
