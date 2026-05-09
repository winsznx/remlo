import { NextRequest, NextResponse } from 'next/server'
import { getCallerAdmin } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { inspectRequest, recordAdminAction } from '@/lib/admin-audit'

/**
 * GET /api/admin/waitlist
 *
 * Roll-up stats + a daily growth series for the launch waitlist. One
 * round-trip pulls every row (waitlist volume is small — emails, not
 * events — so paging isn't worth it yet).
 *
 * Returns:
 *   - totals: total / confirmed / unconfirmed / unsubscribed
 *   - bySource: count per `source` value (so we can attribute landing vs
 *     /waitlist vs whatever new entry points get added later)
 *   - daily: array of { date, signups, confirmations } for the last 60
 *     days, ready to plot
 *   - recent: last 25 signups for an at-a-glance feed
 */
export const dynamic = 'force-dynamic'

interface WaitlistRow {
  email: string
  source: string
  confirmed_at: string | null
  unsubscribed_at: string | null
  created_at: string
}

interface DailyBucket {
  date: string
  signups: number
  confirmations: number
}

export async function GET(req: NextRequest) {
  const admin = await getCallerAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reqInspect = inspectRequest(req)
  await recordAdminAction({
    actorUserId: admin.sub,
    action: 'waitlist.view',
    resource: 'waitlist_subscribers',
    result: 'success',
    ipAddress: reqInspect.ipAddress,
    userAgent: reqInspect.userAgent,
  })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('waitlist_subscribers')
    .select('email, source, confirmed_at, unsubscribed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as WaitlistRow[]

  const total = rows.length
  const confirmed = rows.filter((r) => r.confirmed_at && !r.unsubscribed_at).length
  const unconfirmed = rows.filter((r) => !r.confirmed_at && !r.unsubscribed_at).length
  const unsubscribed = rows.filter((r) => r.unsubscribed_at).length

  // Source attribution. Defaults to 'unknown' for rows that came in before
  // we instrumented the source field.
  const bySource: Record<string, { total: number; confirmed: number }> = {}
  for (const r of rows) {
    const key = r.source ?? 'unknown'
    if (!bySource[key]) bySource[key] = { total: 0, confirmed: 0 }
    bySource[key].total++
    if (r.confirmed_at && !r.unsubscribed_at) bySource[key].confirmed++
  }

  // Daily growth — 60-day window, even if there are zero rows on a day we
  // emit a 0 so the chart line stays continuous.
  const days = 60
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const dailyMap = new Map<string, DailyBucket>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dailyMap.set(key, { date: key, signups: 0, confirmations: 0 })
  }
  for (const r of rows) {
    const signupKey = r.created_at.slice(0, 10)
    const bucket = dailyMap.get(signupKey)
    if (bucket) bucket.signups++
    if (r.confirmed_at) {
      const confirmKey = r.confirmed_at.slice(0, 10)
      const cBucket = dailyMap.get(confirmKey)
      if (cBucket) cBucket.confirmations++
    }
  }
  const daily = Array.from(dailyMap.values())

  // Cumulative confirmed (running total) — separate series for the area
  // chart so the operator can see the curve, not just per-day spikes.
  let runningConfirmed = 0
  const cumulative = daily.map((d) => {
    runningConfirmed += d.confirmations
    return { date: d.date, total: runningConfirmed }
  })

  const recent = rows.slice(0, 25).map((r) => ({
    email: r.email,
    source: r.source,
    confirmed_at: r.confirmed_at,
    unsubscribed_at: r.unsubscribed_at,
    created_at: r.created_at,
  }))

  // Conversion rate among signups that have had a chance to confirm
  // (we exclude rows < 24h old since they may still confirm). 0 for empty
  // case to avoid NaN in the UI.
  const cutoff = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const matureRows = rows.filter((r) => r.created_at <= cutoff)
  const matureConfirmed = matureRows.filter((r) => r.confirmed_at && !r.unsubscribed_at).length
  const confirmRate = matureRows.length > 0 ? matureConfirmed / matureRows.length : 0

  return NextResponse.json({
    totals: { total, confirmed, unconfirmed, unsubscribed, confirmRate },
    bySource,
    daily,
    cumulative,
    recent,
    generatedAt: new Date().toISOString(),
  })
}
