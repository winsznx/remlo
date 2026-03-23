'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'

function getPageTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/dashboard/team') return 'Team'
  if (pathname === '/dashboard/team/add') return 'Add Employee'
  if (pathname.startsWith('/dashboard/team/')) return 'Employee Details'
  if (pathname === '/dashboard/payroll') return 'Payroll'
  if (pathname === '/dashboard/payroll/new') return 'New Payroll'
  if (pathname.startsWith('/dashboard/payroll/')) return 'Payroll Run'
  if (pathname.startsWith('/dashboard/treasury')) return 'Treasury'
  if (pathname.startsWith('/dashboard/cards')) return 'Cards'
  if (pathname.startsWith('/dashboard/compliance')) return 'Compliance'
  if (pathname === '/dashboard/api-access') return 'API Access'
  if (pathname === '/dashboard/settings') return 'Settings'
  if (pathname === '/dashboard/settings/billing') return 'Billing'

  return pathname.split('/').filter(Boolean).pop() ?? 'Dashboard'
}

interface EmployerHeaderProps {
  onMobileMenuOpen: () => void
}

export function EmployerHeader({ onMobileMenuOpen }: EmployerHeaderProps) {
  const pathname = usePathname()
  const { user, logout } = usePrivy()
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const pageTitle = getPageTitle(pathname)
  const userInitials = [user?.email?.address?.[0], user?.email?.address?.[1]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U'

  // Close menu on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  return (
    <header className="h-16 flex items-center gap-4 px-4 lg:px-6 bg-[var(--bg-surface)] border-b border-[var(--border-default)] shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
        aria-label="Open menu"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[var(--text-muted)] text-sm hidden sm:block">Remlo</span>
        <span className="text-[var(--text-muted)] text-sm hidden sm:block">/</span>
        <span className="text-[var(--text-primary)] text-sm font-semibold truncate">{pageTitle}</span>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <div className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] min-w-[200px]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[var(--text-muted)] shrink-0">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search…"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none min-w-0"
          />
          <kbd className="hidden xl:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[var(--border-default)] text-[var(--text-muted)] text-[10px] font-mono">
            <span>⌘K</span>
          </kbd>
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--status-error)]" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)] text-xs font-bold">
              {userInitials}
            </div>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[var(--text-muted)]">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg py-1 z-10">
              <div className="px-3 py-2 border-b border-[var(--border-default)]">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {user?.email?.address ?? 'Employer'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Employer account</p>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); void logout() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--status-error)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
