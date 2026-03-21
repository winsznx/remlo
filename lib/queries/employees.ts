import { createServerClient } from '@/lib/supabase-server'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type Employee = Database['public']['Tables']['employees']['Row']

/**
 * Look up an employee by their invite token.
 * The invite token is a signed representation of the employee ID.
 * For Phase 1, the token IS the employee UUID (T24 will add proper signing).
 */
export async function getEmployeeByInviteToken(token: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', token)
    .single()

  if (error || !data) return null
  return data
}

/** Claim an employee record: attach Privy user_id and wallet_address */
export async function claimEmployeeRecord(
  employeeId: string,
  userId: string,
  walletAddress: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('employees')
    .update({
      user_id: userId,
      wallet_address: walletAddress,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', employeeId)

  return { error: error?.message ?? null }
}

/** Server-side: get all employees for an employer */
export async function getEmployeesByEmployerId(employerId: string): Promise<Employee[]> {
  const client = createServerClient()
  const { data, error } = await client
    .from('employees')
    .select('*')
    .eq('employer_id', employerId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data
}
