'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { RemloLogo } from '@/components/brand/RemloLogo'

const NAV_LINKS = [
  { href: '/portal', label: 'Home', exact: true },
  { href: '/portal/payments', label: 'Payments', exact: false },
  { href: '/portal/card', label: 'Card', exact: false },
  { href: '/portal/settings', label: 'Settings', exact: false },
]

interface EmployeeTopNavProps {
  title?: string
}

export function EmployeeTopNav({ title }: EmployeeTopNavProps) {
  const { user, logout } = usePrivy()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    router.push('/login')
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const userInitials = [user?.email?.address?.[0], user?.email?.address?.[1]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U'

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <header className="h-14 flex items-center px-4 bg-[var(--bg-surface)] border-b border-[var(--border-default)] shrink-0">
      {/* Logo */}
      <RemloLogo
        markClassName="h-6 w-6"
        labelClassName="text-[var(--text-primary)] text-sm"
      />

      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1 ml-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(link.href, link.exact)
                ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Page title — center (mobile only) */}
      {title && (
        <span className="md:hidden absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </span>
      )}

      {/* Right — user */}
      <div className="ml-auto relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)] text-xs font-bold hover:opacity-80 transition-opacity"
        >
          {userInitials}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg py-1 z-10">
            <div className="px-3 py-2 border-b border-[var(--border-default)]">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {user?.email?.address ?? 'Employee'}
              </p>
            </div>
            <button
              onClick={() => { void handleLogout() }}
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
    </header>
  )
}
