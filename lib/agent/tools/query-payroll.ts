import { createServerClient } from '@/lib/supabase-server'

export interface PayrollScheduleItem {
  employee_id: string
  email: string
  first_name: string | null
  last_name: string | null
  salary_amount: number
  salary_currency: string
  pay_frequency: string
  wallet_address: string | null
  solana_wallet_address: string | null
  preferred_chain: string
  kyc_status: string
  last_paid_at: string | null
}

export interface PayrollSchedule {
  employer_id: string
  due_employees: PayrollScheduleItem[]
  total_amount: number
  currency: string
}

export async function queryPayrollSchedule(employerId: string): Promise<PayrollSchedule> {
  const client = createServerClient()

  const { data: employees } = await client
    .from('employees')
    .select('*')
    .eq('employer_id', employerId)
    .eq('active', true)

  if (!employees?.length) {
    return { employer_id: employerId, due_employees: [], total_amount: 0, currency: 'USD' }
  }

  const employeeIds = employees.map((e) => e.id)
  const { data: recentPayments } = await client
    .from('payment_items')
    .select('employee_id, created_at')
    .in('employee_id', employeeIds)
    .order('created_at', { ascending: false })

  const lastPaidMap = new Map<string, string>()
  for (const p of recentPayments ?? []) {
    if (!lastPaidMap.has(p.employee_id)) {
      lastPaidMap.set(p.employee_id, p.created_at)
    }
  }

  const now = Date.now()
  const due: PayrollScheduleItem[] = []

  for (const emp of employees) {
    if (!emp.salary_amount) continue

    const lastPaid = lastPaidMap.get(emp.id)
    const msSincePaid = lastPaid ? now - new Date(lastPaid).getTime() : Infinity

    const thresholdMs = emp.pay_frequency === 'weekly'
      ? 6 * 24 * 60 * 60 * 1000
      : emp.pay_frequency === 'biweekly'
        ? 13 * 24 * 60 * 60 * 1000
        : 28 * 24 * 60 * 60 * 1000

    if (msSincePaid >= thresholdMs) {
      due.push({
        employee_id: emp.id,
        email: emp.email,
        first_name: emp.first_name,
        last_name: emp.last_name,
        salary_amount: emp.salary_amount,
        salary_currency: emp.salary_currency,
        pay_frequency: emp.pay_frequency,
        wallet_address: emp.wallet_address,
        solana_wallet_address: emp.solana_wallet_address,
        preferred_chain: emp.preferred_chain,
        kyc_status: emp.kyc_status,
        last_paid_at: lastPaid ?? null,
      })
    }
  }

  const total = due.reduce((sum, e) => sum + e.salary_amount, 0)

  return {
    employer_id: employerId,
    due_employees: due,
    total_amount: total,
    currency: 'USD',
  }
}
