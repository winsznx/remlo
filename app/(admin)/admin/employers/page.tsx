'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useAdminScope, type AdminEmployersResponse } from '@/lib/hooks/useAdmin'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function AdminEmployersPage() {
  const { data, isLoading } = useAdminScope<AdminEmployersResponse>('employers')
  const [search, setSearch] = React.useState('')

  const filtered = React.useMemo(() => {
    const employers = data?.employers ?? []
    const query = search.trim().toLowerCase()
    if (!query) return employers
    return employers.filter((employer) => {
      return employer.company_name.toLowerCase().includes(query) || employer.owner_user_id.toLowerCase().includes(query)
    })
  }, [data?.employers, search])

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Employers"
        description="Search across active employer workspaces, subscription state, payroll volume, treasury linkage, and team size."
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search employer or owner user id…"
          className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-base)] text-left">
              {['Company', 'Tier', 'Team', 'Cards', 'Payroll Volume', 'MPP Spend', 'Funding'].map((label) => (
                <th key={label} className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {filtered.map((employer) => (
              <tr key={employer.id} className="hover:bg-[var(--bg-base)]">
                <td className="px-5 py-4">
                  <p className="font-medium text-[var(--text-primary)]">{employer.company_name}</p>
                  <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">{employer.owner_user_id}</p>
                </td>
                <td className="px-5 py-4 text-[var(--text-primary)]">{employer.subscription_tier}</td>
                <td className="px-5 py-4 text-[var(--text-primary)]">{employer.teamCount}</td>
                <td className="px-5 py-4 text-[var(--text-primary)]">{employer.cardCount}</td>
                <td className="px-5 py-4 font-mono text-[var(--text-primary)]">{formatCurrency(employer.payrollVolume)}</td>
                <td className="px-5 py-4 font-mono text-[var(--text-primary)]">{formatCurrency(employer.mppSpend)}</td>
                <td className="px-5 py-4 text-xs text-[var(--text-secondary)]">
                  {employer.bridge_customer_id ? 'Bridge linked' : 'Bridge pending'}
                  <br />
                  {employer.treasury_contract ? 'Treasury linked' : 'Treasury pending'}
                  <br />
                  {employer.employer_admin_wallet ? 'On-chain admin linked' : 'On-chain admin pending'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">No employers match this search.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
