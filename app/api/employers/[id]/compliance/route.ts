import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployer } from '@/lib/auth'
import { TIP403_REGISTRY } from '@/lib/constants'

type RouteContext = { params: Promise<{ id: string }> }

type ComplianceResult = 'authorized' | 'blocked' | 'pending'

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)

  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const [{ data: employees, error: employeesError }, { data: events, error: eventsError }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, email, first_name, last_name, wallet_address, kyc_status, kyc_verified_at, bridge_card_id, bridge_bank_account_id, country_code')
      .eq('employer_id', employerId)
      .eq('active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('compliance_events')
      .select('*')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (employeesError) {
    return NextResponse.json({ error: employeesError.message }, { status: 500 })
  }

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 })
  }

  const employeeList = employees ?? []
  const eventList = events ?? []

  const latestMppCheckByEmployee = new Map<string, typeof eventList[number]>()
  for (const event of eventList) {
    if (event.event_type !== 'mpp_check' || !event.employee_id) continue
    if (!latestMppCheckByEmployee.has(event.employee_id)) {
      latestMppCheckByEmployee.set(event.employee_id, event)
    }
  }

  const employeesWithCompliance = employeeList.map((employee) => {
    const latestMpp = latestMppCheckByEmployee.get(employee.id)
    const tip403: ComplianceResult =
      latestMpp?.result === 'BLOCKED'
        ? 'blocked'
        : latestMpp?.result === 'CLEAR'
          ? 'authorized'
          : 'pending'

    return {
      id: employee.id,
      name: [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email,
      email: employee.email,
      kyc_status: employee.kyc_status,
      tip403,
      lastChecked: latestMpp?.created_at ?? employee.kyc_verified_at ?? null,
      wallet_address: employee.wallet_address,
      country_code: employee.country_code,
      bridge_card_id: employee.bridge_card_id,
      bridge_bank_account_id: employee.bridge_bank_account_id,
    }
  })

  const verified = employeesWithCompliance.filter((employee) => employee.kyc_status === 'approved').length
  const pending = employeesWithCompliance.filter((employee) => employee.kyc_status === 'pending').length
  const actionRequired = employeesWithCompliance.filter((employee) => {
    return employee.kyc_status === 'rejected' || employee.kyc_status === 'expired' || employee.tip403 === 'blocked'
  }).length

  const employeeNames = new Map(employeeList.map((employee) => [
    employee.id,
    [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email,
  ]))

  const auditLog = eventList.map((event) => ({
    id: event.id,
    employee_name: event.employee_id ? (employeeNames.get(event.employee_id) ?? 'Unknown employee') : 'System',
    event_type: event.event_type ?? 'event',
    result: event.result ?? 'UNKNOWN',
    description: event.description ?? 'No description available',
    created_at: event.created_at,
    metadata: event.metadata,
  }))

  const authorizedCount = employeesWithCompliance.filter((employee) => employee.tip403 === 'authorized').length

  return NextResponse.json({
    summary: {
      verified,
      pending,
      actionRequired,
      total: employeesWithCompliance.length,
    },
    policy: {
      policyId: employer.tip403_policy_id,
      type: employer.tip403_policy_id ? 'BLACKLIST' : 'UNCONFIGURED',
      address: TIP403_REGISTRY,
      authorizedCount,
      description: employer.tip403_policy_id
        ? 'TIP-403 policy checks are enforced before payroll execution and on paid compliance reads.'
        : 'No employer TIP-403 policy is configured yet. Wallet authorization checks will remain unavailable until a policy is attached.',
    },
    employees: employeesWithCompliance,
    auditLog,
  })
}

export const dynamic = 'force-dynamic'
