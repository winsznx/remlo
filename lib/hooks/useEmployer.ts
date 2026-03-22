'use client'

import * as React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Employer = Database['public']['Tables']['employers']['Row']

export function useEmployer() {
  const { user, authenticated } = usePrivy()

  return useQuery<Employer | null>({
    queryKey: ['employer', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await supabase
        .from('employers')
        .select('*')
        .eq('owner_user_id', user.id)
        .eq('active', true)
        .maybeSingle()
      return data ?? null
    },
    enabled: authenticated && Boolean(user?.id),
    staleTime: 60_000,
  })
}

// Realtime subscription for payroll_runs changes
export function usePayrollRunsRealtime(employerId: string | undefined, onUpdate: () => void) {
  React.useEffect(() => {
    if (!employerId) return

    const channel = supabase
      .channel(`payroll_runs:${employerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payroll_runs',
          filter: `employer_id=eq.${employerId}`,
        },
        () => onUpdate(),
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [employerId, onUpdate])
}

// Realtime subscription for payment_items changes within an employer's runs
export function usePaymentItemsRealtime(employerId: string | undefined, onUpdate: () => void) {
  React.useEffect(() => {
    if (!employerId) return

    const channel = supabase
      .channel(`payment_items:${employerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_items',
        },
        () => onUpdate(),
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [employerId, onUpdate])
}
