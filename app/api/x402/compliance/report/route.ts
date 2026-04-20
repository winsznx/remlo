// TODO: gate with x402 Solana USDC payment ($0.05) once x402 HTTP adapter is ready

import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployer } from '@/lib/auth'
import { generateComplianceReport } from '@/lib/agent/tools/compliance-report'

/**
 * GET /api/x402/compliance/report?employer_id=...
 * Generates a compliance report for the employer.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const employer = await getCallerEmployer(req)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const employerId = req.nextUrl.searchParams.get('employer_id') ?? employer.id

  if (employerId !== employer.id) {
    return NextResponse.json({ error: 'Employer ID mismatch' }, { status: 403 })
  }

  const report = await generateComplianceReport(employerId)

  return NextResponse.json(report)
}
