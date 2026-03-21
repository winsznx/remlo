'use client'

import { useQuery } from '@tanstack/react-query'

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

// ─── Fetchers ─────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// ─── Hooks ────────────────────────────────────────────────────────────────

export function useYield() {
  return useQuery<YieldData>({
    queryKey: ['yield'],
    queryFn: () => fetchJson('/api/yield'),
  })
}

export function useTransactions(params?: { page?: number; limit?: number; employeeId?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.employeeId) qs.set('employeeId', params.employeeId)

  return useQuery<{ items: Transaction[]; total: number; page: number }>({
    queryKey: ['transactions', params],
    queryFn: () => fetchJson(`/api/transactions?${qs.toString()}`),
  })
}

export function useTreasury(employerId: string | undefined) {
  return useQuery<TreasuryData>({
    queryKey: ['treasury', employerId],
    queryFn: () => fetchJson(`/api/employers/${employerId}/treasury`),
    enabled: Boolean(employerId),
  })
}

export function useTeam(employerId: string | undefined) {
  return useQuery({
    queryKey: ['team', employerId],
    queryFn: () => fetchJson<{ employees: unknown[] }>(`/api/employers/${employerId}/team`),
    enabled: Boolean(employerId),
  })
}

export function usePayrollRuns(employerId: string | undefined, page = 1, limit = 10) {
  return useQuery<{ runs: PayrollRun[]; total: number }>({
    queryKey: ['payroll-runs', employerId, page, limit],
    queryFn: () => fetchJson(`/api/employers/${employerId}/payroll/runs?page=${page}&limit=${limit}`),
    enabled: Boolean(employerId),
  })
}

export function useMppSessions(employerId: string | undefined) {
  return useQuery<{ sessions: MppSession[] }>({
    queryKey: ['mpp-sessions', employerId],
    queryFn: () => fetchJson(`/api/employers/${employerId}/mpp-sessions`),
    enabled: Boolean(employerId),
    refetchInterval: 10_000, // poll every 10s for active sessions
  })
}
