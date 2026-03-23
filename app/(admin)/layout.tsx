'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Building2, ChevronRight, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { RemloLogo } from '@/components/brand/RemloLogo'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/employers', label: 'Employers', icon: Building2 },
  { href: '/admin/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/admin/monitoring', label: 'Monitoring', icon: Activity },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = usePrivy()

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-surface)] lg:flex lg:flex-col">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <RemloLogo markClassName="h-7 w-7" labelClassName="text-[var(--text-primary)] text-sm" />
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Admin console</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-[var(--border-default)] p-4">
          <p className="text-xs text-[var(--text-muted)]">{user?.email?.address ?? 'Platform admin'}</p>
          <button
            onClick={() => void logout()}
            className="mt-3 text-sm text-[var(--status-error)] transition-colors hover:opacity-80"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-4 lg:px-6">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>Admin</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-[var(--text-primary)]">
              {NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? 'Overview'}
            </span>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
