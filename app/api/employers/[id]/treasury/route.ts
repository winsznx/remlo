import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { treasury } from '@/lib/contracts'
import { getEmployerOnchainIdentity, getEmployerOnchainIdentityError } from '@/lib/employer-onchain'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/employers/[id]/treasury
 * Returns on-chain treasury balance breakdown for the employer.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params

  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const onchainIdentity = getEmployerOnchainIdentity(employer)
  if (!onchainIdentity) {
    return NextResponse.json(getEmployerOnchainIdentityError(employer), { status: 409 })
  }

  const [available, locked] = await Promise.all([
    treasury.read.getAvailableBalance([onchainIdentity.employerAccountId]) as Promise<bigint>,
    treasury.read.getLockedBalance([onchainIdentity.employerAccountId]) as Promise<bigint>,
  ])

  const availableUsd = Number(available) / 1e6
  const lockedUsd = Number(locked) / 1e6

  return NextResponse.json({
    available_usd: availableUsd,
    locked_usd: lockedUsd,
    total_usd: availableUsd + lockedUsd,
    available_raw: available.toString(),
    locked_raw: locked.toString(),
    employer_admin_wallet: onchainIdentity.adminWallet,
    employer_account_id: onchainIdentity.employerAccountId,
  })
}
