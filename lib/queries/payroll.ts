import { createServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'

export type PayrollRun = Database['public']['Tables']['payroll_runs']['Row']
export type PaymentItem = Database['public']['Tables']['payment_items']['Row']

export async function getPayrollRunById(runId: string): Promise<PayrollRun | null> {
  const client = createServerClient()
  const { data } = await client
    .from('payroll_runs')
    .select('*')
    .eq('id', runId)
    .single()
  return data ?? null
}

export async function getPaymentItemsByRunId(runId: string): Promise<PaymentItem[]> {
  const client = createServerClient()
  const { data } = await client
    .from('payment_items')
    .select('*')
    .eq('payroll_run_id', runId)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getPayslip(
  runId: string,
  employeeId: string
): Promise<{ run: PayrollRun; item: PaymentItem } | null> {
  const client = createServerClient()
  const [runResult, itemResult] = await Promise.all([
    client.from('payroll_runs').select('*').eq('id', runId).single(),
    client
      .from('payment_items')
      .select('*')
      .eq('payroll_run_id', runId)
      .eq('employee_id', employeeId)
      .single(),
  ])
  if (!runResult.data || !itemResult.data) return null
  return { run: runResult.data, item: itemResult.data }
}

export async function getPaymentItemsByEmployeeId(
  employeeId: string,
  limit = 50
): Promise<PaymentItem[]> {
  const client = createServerClient()
  const { data } = await client
    .from('payment_items')
    .select('*, payroll_runs!inner(id, finalized_at, block_number, employer_id)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as PaymentItem[]
}
