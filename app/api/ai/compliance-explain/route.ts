import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployer } from '@/lib/auth'
import { runClaudeJson } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const employer = await getCallerEmployer(req)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    eventType?: string
    result?: string
    description?: string
    metadata?: Record<string, unknown>
  }

  const fallbackSeverity = body.result === 'BLOCKED' ? 'high' : body.result === 'CLEAR' ? 'low' : 'medium'

  const result = await runClaudeJson<{
    explanation: string
    severity: 'low' | 'medium' | 'high'
    nextSteps: string[]
  }>({
    system: [
      'You explain Remlo compliance events to payroll operators in plain English.',
      'Return JSON only with keys explanation, severity, nextSteps.',
      'Do not use legal jargon unless necessary.',
      'Translate TIP-403 and KYC outcomes into concrete operational guidance.',
    ].join(' '),
    prompt: JSON.stringify({
      employerId: employer.id,
      eventType: body.eventType ?? null,
      result: body.result ?? null,
      description: body.description ?? null,
      metadata: body.metadata ?? null,
    }),
    fallback: () => ({
      explanation: body.description
        ? `Remlo recorded a ${body.eventType ?? 'compliance'} event with result ${body.result ?? 'unknown'}: ${body.description}`
        : `Remlo recorded a ${body.eventType ?? 'compliance'} event with result ${body.result ?? 'unknown'}.`,
      severity: fallbackSeverity,
      nextSteps: body.result === 'BLOCKED'
        ? ['Review the employee record.', 'Confirm KYC status and sanctions data before retrying payroll.']
        : ['No immediate action is required.', 'Keep the event in the audit trail for future review.'],
    }),
  })

  return NextResponse.json(result)
}
