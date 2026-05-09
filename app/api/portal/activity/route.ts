import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployee } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'

/**
 * GET /api/portal/activity
 *
 * Read-only activity feed for the authenticated employee. We don't have a
 * dedicated employee_notifications table — instead we derive a feed from the
 * tables that already record state changes affecting this employee:
 *
 *   - payment_items   → "Payment received / pending / failed"
 *   - compliance_events (KYC)         → "KYC approved / rejected"
 *   - system_announcements (active)   → operator banners (also shown above)
 *
 * Returns at most 50 items, sorted newest first. The client tracks
 * last-viewed locally; unread count is computed there.
 */
export const dynamic = 'force-dynamic'

type ActivityKind =
  | 'payment_received'
  | 'payment_pending'
  | 'payment_failed'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'announcement'
  | 'virtual_inflow'

type Severity = 'info' | 'success' | 'warning' | 'error'

interface ActivityItem {
  id: string
  kind: ActivityKind
  severity: Severity
  title: string
  body: string | null
  link: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
}

export async function GET(req: NextRequest) {
  const employee = await getCallerEmployee(req)
  if (!employee) {
    return NextResponse.json({ items: [], last_seen: null }, { status: 401 })
  }

  const supabase = createServerClient()

  const [payments, complianceEvents, virtualInflowsResp] = await Promise.all([
    supabase
      .from('payment_items')
      .select('id, amount, status, tx_hash, created_at, payroll_run_id')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('compliance_events')
      .select('id, event_type, result, description, metadata, created_at')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(20),
    // Virtual-address inflows credited to this employee's user-tag. Cast
    // because generated types haven't been regenerated for the new table.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase
      .from('virtual_address_inflows')
      .select('id, amount, decimals, symbol, tx_hash, sender_address, observed_at')
      .eq('employee_id', employee.id)
      .order('observed_at', { ascending: false })
      .limit(20),
  ])

  type VirtualInflow = {
    id: string
    amount: string
    decimals: number
    symbol: string | null
    tx_hash: string
    sender_address: string | null
    observed_at: string
  }
  const virtualInflows = (virtualInflowsResp?.data ?? []) as VirtualInflow[]

  const items: ActivityItem[] = []

  for (const payment of payments.data ?? []) {
    const amountStr = `$${Number(payment.amount).toFixed(2)}`
    if (payment.status === 'confirmed') {
      items.push({
        id: `payment:${payment.id}`,
        kind: 'payment_received',
        severity: 'success',
        title: `${amountStr} received`,
        body: payment.tx_hash ? `On-chain tx: ${payment.tx_hash.slice(0, 14)}…` : null,
        link: `/portal/payments?run=${encodeURIComponent(payment.payroll_run_id ?? '')}`,
        created_at: payment.created_at,
        metadata: {
          tx_hash: payment.tx_hash,
          explorer_url: payment.tx_hash ? `${TEMPO_EXPLORER_URL}/tx/${payment.tx_hash}` : null,
        },
      })
    } else if (payment.status === 'pending') {
      items.push({
        id: `payment:${payment.id}`,
        kind: 'payment_pending',
        severity: 'info',
        title: `${amountStr} pending`,
        body: 'Your payroll is broadcasting on-chain. Settles in seconds.',
        link: `/portal/payments?run=${encodeURIComponent(payment.payroll_run_id ?? '')}`,
        created_at: payment.created_at,
      })
    } else if (payment.status === 'failed') {
      items.push({
        id: `payment:${payment.id}`,
        kind: 'payment_failed',
        severity: 'error',
        title: `${amountStr} failed to settle`,
        body: 'Reach out to your employer if this persists.',
        link: `/portal/payments?run=${encodeURIComponent(payment.payroll_run_id ?? '')}`,
        created_at: payment.created_at,
      })
    }
  }

  // Virtual-address inflows: someone deposited into this employee's
  // employer-treasury-attributed deposit address. Body shows the amount
  // and the sender (truncated) so the employee can correlate inbound funds
  // with their own off-platform invoice / bonus / partner-payment flows.
  for (const inflow of virtualInflows) {
    const amountStr = (() => {
      try {
        const raw = BigInt(inflow.amount)
        const factor = 10n ** BigInt(Math.max(0, inflow.decimals))
        const whole = raw / factor
        const frac = raw % factor
        const fracStr = frac.toString().padStart(Math.max(0, inflow.decimals), '0').slice(0, 2)
        return `$${whole.toString()}.${fracStr || '00'}`
      } catch {
        return `${inflow.amount} ${inflow.symbol ?? ''}`.trim()
      }
    })()
    const senderShort = inflow.sender_address
      ? `${inflow.sender_address.slice(0, 8)}…${inflow.sender_address.slice(-6)}`
      : null
    items.push({
      id: `virtual_inflow:${inflow.id}`,
      kind: 'virtual_inflow',
      severity: 'success',
      title: `${amountStr} routed to your treasury`,
      body: senderShort
        ? `Inbound from ${senderShort} via your employer's deposit address.`
        : `Inbound deposit credited to your treasury via your employer's deposit address.`,
      link: '/portal',
      created_at: inflow.observed_at,
      metadata: {
        tx_hash: inflow.tx_hash,
        explorer_url: `${TEMPO_EXPLORER_URL}/tx/${inflow.tx_hash}`,
      },
    })
  }

  for (const event of complianceEvents.data ?? []) {
    const t = event.event_type ?? ''
    if (!t.startsWith('bridge_kyc_link') && !t.startsWith('bridge_customer')) continue
    if (event.result === 'CLEAR') {
      items.push({
        id: `kyc:${event.id}`,
        kind: 'kyc_approved',
        severity: 'success',
        title: 'Identity verified',
        body: 'You can now receive payroll.',
        link: '/portal',
        created_at: event.created_at,
      })
    } else if (event.result === 'BLOCKED') {
      items.push({
        id: `kyc:${event.id}`,
        kind: 'kyc_rejected',
        severity: 'error',
        title: 'Identity check needs another look',
        body: event.description ?? 'Retry from your portal home.',
        link: '/portal',
        created_at: event.created_at,
      })
    }
  }

  // Active announcements relevant to this employee. Audience filtering for
  // 'all' / 'employees', plus employer-scoped announcements that match
  // their own employer_id (from the new employer_announcements work).
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const annResp: any = await supabase
    .from('system_announcements')
    .select('*')
    .in('audience', ['all', 'employees'])
    .lte('published_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(20)
  const announcements: Array<{
    id: string
    title: string
    body: string
    severity: Severity
    link_url: string | null
    created_at: string
    employer_id: string | null
  }> = (annResp.data ?? []) as never

  for (const a of announcements) {
    if (a.employer_id && a.employer_id !== employee.employer_id) continue
    items.push({
      id: `announcement:${a.id}`,
      kind: 'announcement',
      severity: a.severity,
      title: a.title,
      body: a.body,
      link: a.link_url,
      created_at: a.created_at,
    })
  }

  items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  return NextResponse.json({ items: items.slice(0, 50) })
}
