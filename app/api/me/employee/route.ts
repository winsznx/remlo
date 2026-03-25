import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployee } from '@/lib/auth'

/** GET /api/me/employee — return the authenticated user's employee record. */
export async function GET(req: NextRequest) {
  const employee = await getCallerEmployee(req)
  if (!employee) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(employee)
}
