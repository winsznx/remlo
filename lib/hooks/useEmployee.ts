'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

type Employee = Database['public']['Tables']['employees']['Row']
type PaymentItem = Database['public']['Tables']['payment_items']['Row']

export function useEmployee() {
  const { user, authenticated } = usePrivy()

  return useQuery<Employee | null>({
    queryKey: ['employee', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .single()
      return data ?? null
    },
    enabled: authenticated && Boolean(user?.id),
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
  created_at: string
  payroll_run: {
    id: string
    finalized_at: string | null
    settlement_time_ms: number | null
    block_number: number | null
  } | null
}

export function useEmployeePayments(employeeId: string | undefined, limit = 20) {
  return useQuery<PaymentWithRun[]>({
    queryKey: ['employee-payments', employeeId, limit],
    queryFn: async () => {
      if (!employeeId) return []
      const { data, error } = await supabase
        .from('payment_items')
        .select(`
          id, amount, memo_bytes, memo_decoded, status, tx_hash, created_at,
          payroll_run:payroll_runs(id, finalized_at, settlement_time_ms, block_number)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as PaymentWithRun[]
    },
    enabled: Boolean(employeeId),
    staleTime: 30_000,
  })
}

export function useEmployerForEmployee(employerId: string | undefined) {
  return useQuery<{ company_name: string } | null>({
    queryKey: ['employer-name', employerId],
    queryFn: async () => {
      if (!employerId) return null
      const { data } = await supabase
        .from('employers')
        .select('company_name')
        .eq('id', employerId)
        .single()
      return data ?? null
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
