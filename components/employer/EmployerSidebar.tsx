'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RemloLogo } from '@/components/brand/RemloLogo'
import { LayoutDashboard, Users, Banknote, Wallet, ShieldCheck, Terminal, ChevronLeft, ChevronRight, X, CreditCard, Settings } from 'lucide-react'

interface NavItem {
  href: string
  activeMatch?: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    activeMatch: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: '/dashboard/team',
    activeMatch: '/dashboard/team',
    label: 'Employees',
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: '/dashboard/payroll/new',
    activeMatch: '/dashboard/payroll',
    label: 'Payroll',
    icon: <Banknote className="w-5 h-5" />,
  },
  {
    href: '/dashboard/treasury',
    activeMatch: '/dashboard/treasury',
    label: 'Payments',
    icon: <Wallet className="w-5 h-5" />,
  },
  {
    href: '/dashboard/compliance',
    activeMatch: '/dashboard/compliance',
    label: 'Compliance',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    href: '/dashboard/cards',
    activeMatch: '/dashboard/cards',
    label: 'Cards',
    icon: <CreditCard className="w-5 h-5" />,
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  {
    href: '/dashboard/api-access',
    activeMatch: '/dashboard/api-access',
    label: 'API & Demo',
    icon: <Terminal className="w-5 h-5" />,
  },
  {
    href: '/dashboard/settings',
    activeMatch: '/dashboard/settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
  },
]

interface EmployerSidebarProps {
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function EmployerSidebar({ collapsed, onCollapsedChange, mobileOpen, onMobileClose }: EmployerSidebarProps) {
  const pathname = usePathname()

  function isActive(item: NavItem) {
    const match = item.activeMatch || item.href
    if (match === '/dashboard' || match === '/employee') {
      return pathname === match
    }
    return pathname === match || pathname.startsWith(match + '/')
  }

  const renderNavLink = (item: NavItem, isMobilePanel: boolean) => {
    const active = isActive(item)
    const showLabel = !collapsed || isMobilePanel
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onMobileClose}
        title={!showLabel ? item.label : undefined}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
          ${active
            ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
          }
          ${!showLabel ? 'justify-center' : ''}
        `}
      >
        <span className="shrink-0">{item.icon}</span>
        {showLabel && <span className="truncate">{item.label}</span>}
      </Link>
    )
  }

  const renderSidebarContent = (isMobilePanel: boolean) => (
    <div className="flex flex-col h-full">
      {/* Logo + collapse button */}
      <div
        className={`flex items-center h-16 border-b border-[var(--border-default)] shrink-0 justify-between ${
          !collapsed || isMobilePanel ? 'px-4' : 'px-2.5'
        }`}
      >
        <RemloLogo
          showWordmark={!collapsed || isMobilePanel}
          markClassName="h-7 w-7"
          labelClassName="text-[var(--text-primary)] text-sm tracking-tight"
        />
        {isMobilePanel ? (
          <button
            onClick={onMobileClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map(item => renderNavLink(item, isMobilePanel))}
      </nav>

      {/* Bottom nav */}
      <div className="p-3 border-t border-[var(--border-default)] space-y-0.5">
        {BOTTOM_ITEMS.map(item => renderNavLink(item, isMobilePanel))}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar — desktop (always visible, collapsible at xl) */}
      <aside
        className={`
          hidden md:flex flex-col shrink-0
          bg-[var(--bg-surface)] border-r border-[var(--border-default)]
          transition-[width] duration-200 ease-in-out overflow-hidden
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Sidebar — mobile (slide-in drawer) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-60 flex flex-col md:hidden
          bg-[var(--bg-surface)] border-r border-[var(--border-default)]
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {renderSidebarContent(true)}
      </aside>
    </>
  )
}
