import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedEmployee } from '@/lib/auth'
import { pathUsdToken } from '@/lib/contracts'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employeeId } = await ctx.params
  const employee = await getAuthorizedEmployee(req, employeeId)

  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!employee.wallet_address) {
    return NextResponse.json({
      wallet_address: null,
      available_raw: '0',
      available_usd: 0,
    })
  }

  const balance = await pathUsdToken.read.balanceOf([employee.wallet_address as `0x${string}`]) as bigint

  return NextResponse.json({
    wallet_address: employee.wallet_address,
    available_raw: balance.toString(),
    available_usd: Number(balance) / 1e6,
  })
}
