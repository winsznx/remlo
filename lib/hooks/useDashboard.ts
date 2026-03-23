'use client'

import { useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'
import type { Employee } from '@/lib/queries/employees'
import type { Database } from '@/lib/database.types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TreasuryData {
  available_usd: number
  locked_usd: number
  total_usd: number
}

export interface YieldData {
  apy_bps: number
  apy_percent: number
  accrued_usd: string
  yield_model: 'employer_keeps' | 'employee_bonus' | 'split'
  employee_split_bps: number
}

export interface PayrollRun {
  id: string
  status: 'draft' | 'pending' | 'processing' | 'completed' | 'failed'
  total_amount: number
  employee_count: number
  tx_hash: string | null
  finalized_at: string | null
  created_at: string
}

export interface Transaction {
  id: string
  type: string
  description: string
  amount: number
  tx_hash: string | null
  created_at: string
  status: 'confirmed' | 'pending' | 'failed'
}

export interface ComplianceEvent {
  id: string
  employee_id: string | null
  wallet_address: string | null
  event_type: string | null
  result: string | null
  risk_score: number | null
  description: string | null
  created_at: string
}

export interface MppSession {
  id: string
  agent_wallet: string
  max_deposit: number
  total_spent: number
  status: 'open' | 'closed' | 'expired'
  opened_at: string
  last_action: string | null
}

export interface EmployerPaymentItem {
  id: string
  amount: number
  memo_bytes: string | null
  memo_decoded: unknown
  status: string
  tx_hash: string | null
  created_at: string
  payroll_run: {
    id: string
    finalized_at: string | null
    settlement_time_ms: number | null
    block_number: number | null
  } | null
}

export interface EmployerTeamDetailResponse {
  employee: Database['public']['Tables']['employees']['Row']
  payments: EmployerPaymentItem[]
  complianceEvents: Database['public']['Tables']['compliance_events']['Row'][]
}

export interface EmployerComplianceSummary {
  verified: number
  pending: number
  actionRequired: number
  total: number
}

export interface EmployerComplianceEmployee {
  id: string
  name: string
  email: string
  kyc_status: string
  tip403: 'authorized' | 'blocked' | 'pending'
  lastChecked: string | null
  wallet_address: string | null
  country_code: string | null
  bridge_card_id: string | null
  bridge_bank_account_id: string | null
}

export interface EmployerComplianceAuditEntry {
  id: string
  employee_name: string
  event_type: string
  result: string
  description: string
  created_at: string
  metadata: unknown
}

export interface EmployerComplianceResponse {
  summary: EmployerComplianceSummary
  policy: {
    policyId: number | null
    type: string
    address: string
    authorizedCount: number
    description: string
  }
  employees: EmployerComplianceEmployee[]
  auditLog: EmployerComplianceAuditEntry[]
}

export interface MppReceiptItem {
  id: string
  amount: string
  route: string
  receiptHash?: string
  createdAt: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────

export function useYield() {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<YieldData>({
    queryKey: ['yield'],
    queryFn: () => fetchJson('/api/yield'),
    enabled: ready && authenticated,
  })
}

export function useTransactions(params?: { page?: number; limit?: number; employeeId?: string }) {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.employeeId) qs.set('employeeId', params.employeeId)

  return useQuery<{ items: Transaction[]; total: number; page: number }>({
    queryKey: ['transactions', params],
    queryFn: () => fetchJson(`/api/transactions?${qs.toString()}`),
    enabled: ready && authenticated,
  })
}

export function useTreasury(employerId: string | undefined) {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<TreasuryData>({
    queryKey: ['treasury', employerId],
    queryFn: () => fetchJson(`/api/employers/${employerId}/treasury`),
    enabled: ready && authenticated && Boolean(employerId),
  })
}

export function useTeam(employerId: string | undefined) {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<{ employees: Employee[] }>({
    queryKey: ['team', employerId],
    queryFn: () => fetchJson(`/api/employers/${employerId}/team`),
    enabled: ready && authenticated && Boolean(employerId),
  })
}

export function usePayrollRuns(employerId: string | undefined, page = 1, limit = 10) {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<{ runs: PayrollRun[]; total: number }>({
    queryKey: ['payroll-runs', employerId, page, limit],
    queryFn: () => fetchJson(`/api/employers/${employerId}/payroll/runs?page=${page}&limit=${limit}`),
    enabled: ready && authenticated && Boolean(employerId),
  })
}

export function useMppSessions(employerId: string | undefined) {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<{ sessions: MppSession[] }>({
    queryKey: ['mpp-sessions', employerId],
    queryFn: () => fetchJson(`/api/employers/${employerId}/mpp-sessions`),
    enabled: ready && authenticated && Boolean(employerId),
    refetchInterval: 10_000, // poll every 10s for active sessions
  })
}

export function useEmployerTeamDetail(employerId: string | undefined, employeeId: string | undefined) {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<EmployerTeamDetailResponse>({
    queryKey: ['team-detail', employerId, employeeId],
    queryFn: () => fetchJson(`/api/employers/${employerId}/team/${employeeId}`),
    enabled: ready && authenticated && Boolean(employerId) && Boolean(employeeId),
  })
}

export function useEmployerCompliance(employerId: string | undefined) {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<EmployerComplianceResponse>({
    queryKey: ['employer-compliance', employerId],
    queryFn: () => fetchJson(`/api/employers/${employerId}/compliance`),
    enabled: ready && authenticated && Boolean(employerId),
  })
}

export function useMppReceipts(employerId: string | undefined) {
  const { ready, authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<{ receipts: MppReceiptItem[] }>({
    queryKey: ['mpp-receipts', employerId],
    queryFn: () => fetchJson(`/api/employers/${employerId}/mpp-receipts`),
    enabled: ready && authenticated && Boolean(employerId),
    refetchInterval: 10_000,
  })
}
