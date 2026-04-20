'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useQuery } from '@tanstack/react-query'
import type { Database } from '@/lib/database.types'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

type Employee = Database['public']['Tables']['employees']['Row']

export function useEmployee() {
  const { authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<Employee | null>({
    queryKey: ['me-employee'],
    queryFn: async () => {
      try {
        return await fetchJson<Employee>('/api/me/employee')
      } catch {
        return null
      }
    },
    enabled: authenticated,
    staleTime: 60_000,
  })
}

export interface PaymentWithRun {
  id: string
  amount: number
  memo_bytes: string | null
  memo_decoded: unknown
  status: string
  tx_hash: string | null
  chain: 'tempo' | 'solana' | null
  solana_signature: string | null
  created_at: string
  payroll_run: {
    id: string
    finalized_at: string | null
    settlement_time_ms: number | null
    block_number: number | null
    chain: string | null
  } | null
}

export function useEmployeePayments(_employeeId: string | undefined, limit = 20) {
  const { authenticated } = usePrivy()
  const fetchJson = usePrivyAuthedJson()

  return useQuery<PaymentWithRun[]>({
    queryKey: ['me-payments', limit],
    queryFn: () => fetchJson<PaymentWithRun[]>(`/api/me/payments?limit=${limit}`),
    enabled: authenticated,
    staleTime: 30_000,
  })
}

export function useEmployerForEmployee(employerId: string | undefined) {
  return useQuery<{ company_name: string } | null>({
    queryKey: ['employer-name', employerId],
    queryFn: async () => {
      if (!employerId) return null
      const res = await fetch(`/api/employers/${employerId}/name`)
      if (!res.ok) return null
      return res.json() as Promise<{ company_name: string }>
    },
    enabled: Boolean(employerId),
    staleTime: 300_000,
  })
}

export interface EmployeeBalanceResponse {
  wallet_address: string | null
  available_raw: string
  available_usd: number
}

export function useEmployeeBalance(employeeId: string | undefined) {
  const fetchJson = usePrivyAuthedJson()

  return useQuery<EmployeeBalanceResponse>({
    queryKey: ['employee-balance', employeeId],
    queryFn: () => fetchJson(`/api/employees/${employeeId}/balance`),
    enabled: Boolean(employeeId),
    staleTime: 30_000,
  })
}

export interface EmployeeCardResponse {
  hasCard: boolean
  canIssue: boolean
  card: {
    id: string
    last4: string | null
    expiryMonth: number | null
    expiryYear: number | null
    status: string
  } | null
  transactions: Array<{
    id: string
    merchant: string
    category: string
    amount: number
    currency: string
    date: string
    status: 'completed' | 'pending' | 'declined'
  }>
  bankAccountConnected: boolean
  kycStatus: string
}

export function useEmployeeCard(employeeId: string | undefined) {
  const fetchJson = usePrivyAuthedJson()

  return useQuery<EmployeeCardResponse>({
    queryKey: ['employee-card', employeeId],
    queryFn: () => fetchJson(`/api/employees/${employeeId}/card`),
    enabled: Boolean(employeeId),
    staleTime: 30_000,
  })
}
