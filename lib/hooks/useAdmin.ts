'use client'

import { useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

export interface AdminOverviewResponse {
  metrics: {
    employers: number
    employees: number
    payrollRuns: number
    activeSessions: number
    blockedEvents: number
  }
  recentAlerts: Array<{
    id: string
    companyName: string
    employeeName: string
    description: string
    result: string
    created_at: string
  }>
  recentSessions: Array<{
    id: string
    agent_wallet: string
    total_spent: number
    status: string
    opened_at: string
    companyName: string
  }>
}

export interface AdminEmployersResponse {
  employers: Array<{
    id: string
    company_name: string
    owner_user_id: string
    employer_admin_wallet: string | null
    subscription_tier: string
    bridge_customer_id: string | null
    bridge_virtual_account_id: string | null
    treasury_contract: string | null
    teamCount: number
    cardCount: number
    bankLinkedCount: number
    payrollVolume: number
    latestPayrollAt: string | null
    mppSpend: number
    created_at: string
  }>
}

export interface AdminComplianceResponse {
  events: Array<{
    id: string
    companyName: string
    employeeName: string
    event_type: string
    result: string
    description: string
    created_at: string
  }>
}

export interface AdminMonitoringResponse {
  webhookSummary: {
    kycEvents: number
    blockedEvents: number
    pendingPayments: number
    openSessions: number
  }
  sessions: Array<{
    id: string
    companyName: string
    agent_wallet: string
    total_spent: number
    status: string
    opened_at: string
    last_action: string | null
  }>
  payrollRuns: Array<{
    id: string
    companyName: string
    status: string
    total_amount: number
    employee_count: number
    created_at: string
  }>
}

export function useAdminScope<T>(scope: 'overview' | 'employers' | 'compliance' | 'monitoring') {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<T>({
    queryKey: ['admin', scope],
    queryFn: () => fetchJson(`/api/admin?scope=${scope}`),
    enabled: ready && authenticated,
    refetchInterval: scope === 'monitoring' ? 15_000 : false,
    retry: false,
  })
}
