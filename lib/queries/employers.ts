import { createServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'

export type Employer = Database['public']['Tables']['employers']['Row']

export async function getEmployerById(id: string): Promise<Employer | null> {
  const client = createServerClient()
  const { data } = await client
    .from('employers')
    .select('*')
    .eq('id', id)
    .eq('active', true)
    .single()
  return data ?? null
}

export async function getEmployerByUserId(userId: string): Promise<Employer | null> {
  const client = createServerClient()
  const { data } = await client
    .from('employers')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('active', true)
    .single()
  return data ?? null
}
