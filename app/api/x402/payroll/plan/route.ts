// TODO: gate with x402 Solana USDC payment ($0.10) once x402 HTTP adapter is ready

import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployer } from '@/lib/auth'
import { runPayrollAgent } from '@/lib/agent/payroll-agent'

/**
 * POST /api/x402/payroll/plan
 * Runs the AI payroll agent to generate an execution plan with reasoning.
 * Body: { employer_id: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const employer = await getCallerEmployer(req)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { employer_id?: string }
  const employerId = body.employer_id ?? employer.id

  if (employerId !== employer.id) {
    return NextResponse.json({ error: 'Employer ID mismatch' }, { status: 403 })
  }

  const result = await runPayrollAgent(employerId)

  return NextResponse.json({
    decision_id: result.decision_id,
    plan: result.plan,
    reasoning: result.reasoning,
    confidence: result.confidence,
  })
}
