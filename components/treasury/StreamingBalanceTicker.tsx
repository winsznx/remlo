'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface StreamingBalanceTickerProps {
  employeeId: string
  className?: string
}

/**
 * Real-time balance ticker backed by the MPP SSE endpoint
 * /api/mpp/employee/balance/stream. Falls back to $0.00 on error.
 * Only renders for employees with pay_frequency = 'stream'.
 */
export function StreamingBalanceTicker({ employeeId, className }: StreamingBalanceTickerProps) {
  const [balance, setBalance] = React.useState<number | null>(null)
  const [connected, setConnected] = React.useState(false)

  React.useEffect(() => {
    if (!employeeId) return

    let es: EventSource | null = null

    try {
      es = new EventSource(`/api/mpp/employee/balance/stream?employeeId=${encodeURIComponent(employeeId)}`)

      es.addEventListener('open', () => setConnected(true))

      es.addEventListener('message', (e: MessageEvent<string>) => {
        try {
          const data = JSON.parse(e.data) as { balanceUsd?: string; accrued_usd?: string }
          if (typeof data.balanceUsd === 'string') {
            setBalance(parseFloat(data.balanceUsd))
          } else if (typeof data.accrued_usd === 'string') {
            setBalance(parseFloat(data.accrued_usd))
          }
        } catch {
          // ignore malformed events
        }
      })

      es.addEventListener('error', () => {
        setConnected(false)
        es?.close()
      })
    } catch {
      // EventSource not supported or connection failed
    }

    return () => {
      es?.close()
    }
  }, [employeeId])

  const formatted =
    balance !== null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        }).format(balance)
      : '$0.0000'

  return (
    <span className={cn('font-mono tabular-nums', className)}>
      <span className={connected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>
        {formatted}
      </span>
      {connected && (
        <span className="inline-flex items-center ml-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
        </span>
      )}
    </span>
  )
}
