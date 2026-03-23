import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCallerEmployer } from '@/lib/auth'
import { runClaudeJson } from '@/lib/ai'

interface Anomaly {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  employeeId?: string
  employeeName?: string
}

export async function POST(req: NextRequest) {
  const employer = await getCallerEmployer(req)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    payrollRunId?: string
  }

  const supabase = createServerClient()
  const [{ data: payrollRuns }, { data: payments }, { data: employees }] = await Promise.all([
    supabase
      .from('payroll_runs')
      .select('id, employer_id')
      .eq('employer_id', employer.id),
    supabase
      .from('payment_items')
      .select('id, payroll_run_id, employee_id, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(250),
    supabase
      .from('employees')
      .select('id, email, first_name, last_name, kyc_status')
      .eq('employer_id', employer.id)
      .eq('active', true),
  ])

  const allowedRunIds = new Set((payrollRuns ?? []).map((run) => run.id))
  const scopedPayments = (payments ?? []).filter((payment) => {
    if (!allowedRunIds.has(payment.payroll_run_id)) return false
    if (body.payrollRunId && payment.payroll_run_id !== body.payrollRunId) return false
    return true
  })

  const employeeMap = new Map((employees ?? []).map((employee) => [
    employee.id,
    {
      ...employee,
      name: [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email,
    },
  ]))

  const byEmployee = new Map<string, typeof scopedPayments>()
  for (const payment of scopedPayments) {
    const history = byEmployee.get(payment.employee_id) ?? []
    history.push(payment)
    byEmployee.set(payment.employee_id, history)
  }

  const fallbackAnomalies: Anomaly[] = []

  for (const [employeeId, history] of byEmployee.entries()) {
    const [latest, previous] = history
    const employee = employeeMap.get(employeeId)
    if (!employee || !latest) continue

    if (history.length === 1) {
      fallbackAnomalies.push({
        type: 'first_payment',
        severity: 'medium',
        description: `${employee.name} has their first recorded payroll payment in the current sample.`,
        employeeId,
        employeeName: employee.name,
      })
    }

    if (previous && latest.amount > previous.amount * 2) {
      fallbackAnomalies.push({
        type: 'amount_spike',
        severity: 'high',
        description: `${employee.name} increased from ${previous.amount.toFixed(2)} to ${latest.amount.toFixed(2)}.`,
        employeeId,
        employeeName: employee.name,
      })
    }

    if (latest.status !== 'confirmed' || employee.kyc_status !== 'approved') {
      fallbackAnomalies.push({
        type: 'compliance_or_status',
        severity: latest.status === 'failed' || employee.kyc_status === 'rejected' ? 'high' : 'medium',
        description: `${employee.name} has payment status ${latest.status} with KYC state ${employee.kyc_status}.`,
        employeeId,
        employeeName: employee.name,
      })
    }
  }

  const result = await runClaudeJson<{ anomalies: Anomaly[]; summary: string }>({
    system: [
      'You analyze Remlo payroll data for operator-facing anomalies.',
      'Return JSON only with keys anomalies and summary.',
      'Flag first payments, >2x jumps, non-confirmed statuses, and any employee whose KYC is not approved.',
      'Keep descriptions specific and concise.',
    ].join(' '),
    prompt: JSON.stringify({
      employerId: employer.id,
      payrollRunId: body.payrollRunId ?? null,
      employees: Array.from(employeeMap.values()),
      payments: scopedPayments,
      fallbackAnomalies,
    }),
    fallback: () => ({
      anomalies: fallbackAnomalies,
      summary: fallbackAnomalies.length > 0
        ? `${fallbackAnomalies.length} anomaly signals were detected in the sampled payroll data.`
        : 'No anomaly signals were detected in the sampled payroll data.',
    }),
  })

  return NextResponse.json(result)
}
