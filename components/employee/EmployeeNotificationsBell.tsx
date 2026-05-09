'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { usePrivyAuthedJson } from '@/lib/hooks/usePrivyAuthedFetch'

interface ActivityItem {
  id: string
  created_at: string
}

const LAST_SEEN_KEY = 'remlo-employee-activity-last-seen'

/**
 * EmployeeNotificationsBell — header bell for the employee portal.
 *
 * There's no employee_notifications table; the unread count is derived from
 * /api/portal/activity (which itself derives from payments + KYC events +
 * announcements). The "last seen" timestamp lives in localStorage — clicking
 * the bell links to /portal/activity which updates it on render.
 *
 * This means unread state is per-device, not synced across devices. That's
 * an intentional simplification for v1; it matches the way most users
 * check on a single phone or laptop.
 */
export function EmployeeNotificationsBell() {
  const fetchJson = usePrivyAuthedJson()
  const [lastSeen, setLastSeen] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLastSeen(window.localStorage.getItem(LAST_SEEN_KEY))
    function onStorage(e: StorageEvent) {
      if (e.key === LAST_SEEN_KEY) setLastSeen(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const query = useQuery<{ items: ActivityItem[] }>({
    queryKey: ['portal-activity-unread'],
    queryFn: () => fetchJson('/api/portal/activity'),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  })

  const unreadCount = React.useMemo(() => {
    const items = query.data?.items ?? []
    if (items.length === 0) return 0
    if (!lastSeen) return Math.min(items.length, 99)
    const lastSeenMs = new Date(lastSeen).getTime()
    if (!Number.isFinite(lastSeenMs)) return Math.min(items.length, 99)
    return items.filter((item) => new Date(item.created_at).getTime() > lastSeenMs).length
  }, [query.data, lastSeen])

  return (
    <Link
      href="/portal/activity"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
      aria-label="Activity"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 min-w-[8px] h-2 rounded-full bg-[var(--status-error)]" />
      )}
    </Link>
  )
}
