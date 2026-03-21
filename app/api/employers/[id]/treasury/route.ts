import { NextRequest, NextResponse } from 'next/server'
import { keccak256, toBytes } from 'viem'
import { getAuthorizedEmployer } from '@/lib/auth'
import { treasury } from '@/lib/contracts'

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

  const employerIdHash = keccak256(toBytes(employerId))

  const [available, locked] = await Promise.all([
    treasury.read.getAvailableBalance([employerIdHash]) as Promise<bigint>,
    treasury.read.getLockedBalance([employerIdHash]) as Promise<bigint>,
  ])

  const availableUsd = Number(available) / 1e6
  const lockedUsd = Number(locked) / 1e6

  return NextResponse.json({
    available_usd: availableUsd,
    locked_usd: lockedUsd,
    total_usd: availableUsd + lockedUsd,
    available_raw: available.toString(),
    locked_raw: locked.toString(),
  })
}
