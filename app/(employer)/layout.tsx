'use client'

import * as React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useQueryClient } from '@tanstack/react-query'
import { EmployerSidebar } from '@/components/employer/EmployerSidebar'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { useEmployer } from '@/lib/hooks/useEmployer'
import { getPrimaryPrivyEthereumWallet } from '@/lib/privy-wallet'

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  const { user, authenticated, getAccessToken } = usePrivy()
  const queryClient = useQueryClient()
  const { data: employer } = useEmployer()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const syncAttemptRef = React.useRef<string | null>(null)

  // Auto-collapse at <1280px on mount
  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1279px)')
    setCollapsed(mql.matches)
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  React.useEffect(() => {
    const employerAdminWallet = getPrimaryPrivyEthereumWallet(user)

    if (!authenticated || !employer?.id || !employer?.company_name || !employerAdminWallet) {
      return
    }

    if (employer.employer_admin_wallet?.toLowerCase() === employerAdminWallet.toLowerCase()) {
      return
    }

    const syncKey = `${employer.id}:${employerAdminWallet}`
    if (syncAttemptRef.current === syncKey) {
      return
    }
    syncAttemptRef.current = syncKey

    let cancelled = false

    void (async () => {
      const token = await getAccessToken()
      if (!token || cancelled) return

      const response = await fetch('/api/employers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: employer.company_name,
          companySize: employer.company_size ?? undefined,
          employerAdminWallet,
        }),
      })

      if (!response.ok || cancelled) return

      await queryClient.invalidateQueries({ queryKey: ['employer', user?.id] })
    })()

    return () => {
      cancelled = true
    }
  }, [
    authenticated,
    employer?.company_name,
    employer?.company_size,
    employer?.employer_admin_wallet,
    employer?.id,
    getAccessToken,
    queryClient,
    user?.id,
    user?.linkedAccounts,
    user?.wallet,
  ])

  return (
    <div className="flex h-screen bg-[var(--bg-base)] overflow-hidden">
      <EmployerSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <EmployerHeader onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
