import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCallerAdmin } from '@/lib/auth'

async function getOverview() {
  const supabase = createServerClient()
  const [
    employersResult,
    employeesResult,
    payrollResult,
    sessionsResult,
    blockedEventsResult,
    recentAlertsResult,
    recentSessionsResult,
    employersListResult,
  ] = await Promise.all([
    supabase.from('employers').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('payroll_runs').select('id', { count: 'exact', head: true }),
    supabase.from('mpp_sessions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('compliance_events').select('id', { count: 'exact', head: true }).eq('result', 'BLOCKED'),
    supabase.from('compliance_events').select('id, employer_id, employee_id, description, result, created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('mpp_sessions').select('id, employer_id, agent_wallet, total_spent, status, opened_at').order('opened_at', { ascending: false }).limit(8),
    supabase.from('employers').select('id, company_name'),
  ])

  const employers = employersListResult.data ?? []
  const employerNameMap = new Map(employers.map((employer) => [employer.id, employer.company_name]))

  const employeeIds = Array.from(new Set((recentAlertsResult.data ?? []).map((event) => event.employee_id).filter(Boolean))) as string[]
  const { data: employees } = employeeIds.length > 0
    ? await supabase.from('employees').select('id, email, first_name, last_name').in('id', employeeIds)
    : { data: [] }
  const employeeNameMap = new Map((employees ?? []).map((employee) => [
    employee.id,
    [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email,
  ]))

  return {
    metrics: {
      employers: employersResult.count ?? 0,
      employees: employeesResult.count ?? 0,
      payrollRuns: payrollResult.count ?? 0,
      activeSessions: sessionsResult.count ?? 0,
      blockedEvents: blockedEventsResult.count ?? 0,
    },
    recentAlerts: (recentAlertsResult.data ?? []).map((event) => ({
      id: event.id,
      companyName: event.employer_id ? employerNameMap.get(event.employer_id) ?? 'Unknown employer' : 'Unknown employer',
      employeeName: event.employee_id ? employeeNameMap.get(event.employee_id) ?? 'Unknown employee' : 'System',
      description: event.description ?? 'No description available',
      result: event.result ?? 'UNKNOWN',
      created_at: event.created_at,
    })),
    recentSessions: (recentSessionsResult.data ?? []).map((session) => ({
      id: session.id,
      companyName: session.employer_id ? employerNameMap.get(session.employer_id) ?? 'Unknown employer' : 'Unassigned session',
      agent_wallet: session.agent_wallet,
      total_spent: session.total_spent,
      status: session.status,
      opened_at: session.opened_at,
    })),
  }
}

async function getEmployers() {
  const supabase = createServerClient()
  const [{ data: employers }, { data: employees }, { data: payrollRuns }, { data: sessions }] = await Promise.all([
    supabase
      .from('employers')
      .select('id, company_name, owner_user_id, subscription_tier, bridge_customer_id, bridge_virtual_account_id, treasury_contract, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('employees')
      .select('id, employer_id, bridge_card_id, bridge_bank_account_id')
      .eq('active', true),
    supabase
      .from('payroll_runs')
      .select('employer_id, total_amount, created_at'),
    supabase
      .from('mpp_sessions')
      .select('employer_id, total_spent'),
  ])

  return {
    employers: (employers ?? []).map((employer) => {
      const team = (employees ?? []).filter((employee) => employee.employer_id === employer.id)
      const employerRuns = (payrollRuns ?? []).filter((run) => run.employer_id === employer.id)
      const employerSessions = (sessions ?? []).filter((session) => session.employer_id === employer.id)

      return {
        ...employer,
        teamCount: team.length,
        cardCount: team.filter((employee) => Boolean(employee.bridge_card_id)).length,
        bankLinkedCount: team.filter((employee) => Boolean(employee.bridge_bank_account_id)).length,
        payrollVolume: employerRuns.reduce((sum, run) => sum + (run.total_amount ?? 0), 0),
        latestPayrollAt: employerRuns[0]?.created_at ?? null,
        mppSpend: employerSessions.reduce((sum, session) => sum + Number(session.total_spent ?? 0), 0),
      }
    }),
  }
}

async function getCompliance() {
  const supabase = createServerClient()
  const [{ data: events }, { data: employers }, { data: employees }] = await Promise.all([
    supabase
      .from('compliance_events')
      .select('id, employer_id, employee_id, event_type, result, description, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('employers').select('id, company_name'),
    supabase.from('employees').select('id, email, first_name, last_name'),
  ])

  const employerNameMap = new Map((employers ?? []).map((employer) => [employer.id, employer.company_name]))
  const employeeNameMap = new Map((employees ?? []).map((employee) => [
    employee.id,
    [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email,
  ]))

  return {
    events: (events ?? []).map((event) => ({
      id: event.id,
      companyName: event.employer_id ? employerNameMap.get(event.employer_id) ?? 'Unknown employer' : 'Unknown employer',
      employeeName: event.employee_id ? employeeNameMap.get(event.employee_id) ?? 'Unknown employee' : 'System',
      event_type: event.event_type ?? 'event',
      result: event.result ?? 'UNKNOWN',
      description: event.description ?? 'No description available',
      created_at: event.created_at,
    })),
  }
}

async function getMonitoring() {
  const supabase = createServerClient()
  const [
    kycEvents,
    blockedEvents,
    pendingPayments,
    openSessions,
    sessions,
    payrollRuns,
    employers,
  ] = await Promise.all([
    supabase.from('compliance_events').select('id', { count: 'exact', head: true }).ilike('event_type', 'kyc_%'),
    supabase.from('compliance_events').select('id', { count: 'exact', head: true }).eq('result', 'BLOCKED'),
    supabase.from('payment_items').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('mpp_sessions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase
      .from('mpp_sessions')
      .select('id, employer_id, agent_wallet, total_spent, status, opened_at, last_action')
      .order('opened_at', { ascending: false })
      .limit(20),
    supabase
      .from('payroll_runs')
      .select('id, employer_id, status, total_amount, employee_count, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('employers').select('id, company_name'),
  ])

  const employerNameMap = new Map((employers.data ?? []).map((employer) => [employer.id, employer.company_name]))

  return {
    webhookSummary: {
      kycEvents: kycEvents.count ?? 0,
      blockedEvents: blockedEvents.count ?? 0,
      pendingPayments: pendingPayments.count ?? 0,
      openSessions: openSessions.count ?? 0,
    },
    sessions: (sessions.data ?? []).map((session) => ({
      id: session.id,
      companyName: session.employer_id ? employerNameMap.get(session.employer_id) ?? 'Unknown employer' : 'Unassigned session',
      agent_wallet: session.agent_wallet,
      total_spent: session.total_spent,
      status: session.status,
      opened_at: session.opened_at,
      last_action: session.last_action,
    })),
    payrollRuns: (payrollRuns.data ?? []).map((run) => ({
      id: run.id,
      companyName: employerNameMap.get(run.employer_id) ?? 'Unknown employer',
      status: run.status,
      total_amount: run.total_amount ?? 0,
      employee_count: run.employee_count ?? 0,
      created_at: run.created_at,
    })),
  }
}

export async function GET(req: NextRequest) {
  const admin = await getCallerAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = req.nextUrl.searchParams.get('scope')

  switch (scope) {
    case 'overview':
      return NextResponse.json(await getOverview())
    case 'employers':
      return NextResponse.json(await getEmployers())
    case 'compliance':
      return NextResponse.json(await getCompliance())
    case 'monitoring':
      return NextResponse.json(await getMonitoring())
    default:
      return NextResponse.json({ error: 'scope must be one of overview, employers, compliance, monitoring' }, { status: 400 })
  }
}

export const dynamic = 'force-dynamic'
