import { NextRequest, NextResponse } from 'next/server'
import { getPrivyClaims } from '@/lib/auth'
import {
  getPreferences,
  upsertPreferences,
  type NotificationPreferences,
} from '@/lib/queries/notification-preferences'

/**
 * GET /api/portal/preferences
 * Returns the authenticated user's notification preferences (defaults if no
 * row exists). Both employees and employers (in case they're also operating
 * as a recipient) hit the same endpoint — preferences are per-user, not
 * per-role.
 */
export async function GET(req: NextRequest) {
  const claims = await getPrivyClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prefs = await getPreferences(claims.sub)
  return NextResponse.json({ preferences: prefs })
}

const ALLOWED_KEYS: ReadonlyArray<keyof NotificationPreferences> = [
  'payrollEmail',
  'payrollInapp',
  'kycEmail',
  'cardActivityEmail',
  'weeklySummaryEmail',
  'employerMessageEmail',
  'announcementEmail',
]

/**
 * PATCH /api/portal/preferences
 * Body: partial NotificationPreferences (only the keys to change).
 * Unknown keys are dropped silently. Booleans only — anything else is rejected.
 */
export async function PATCH(req: NextRequest) {
  const claims = await getPrivyClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch: Partial<NotificationPreferences> = {}
  for (const key of ALLOWED_KEYS) {
    const value = body[key]
    if (typeof value === 'boolean') {
      patch[key] = value
    } else if (value !== undefined) {
      return NextResponse.json(
        { error: `${key} must be a boolean` },
        { status: 400 },
      )
    }
  }

  const updated = await upsertPreferences(claims.sub, patch)
  return NextResponse.json({ preferences: updated })
}

export const dynamic = 'force-dynamic'
