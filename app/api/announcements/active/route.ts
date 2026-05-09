import { NextRequest, NextResponse } from 'next/server'
import { getPrivyClaims } from '@/lib/auth'
import { isPlatformAdminUserId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { listActiveAnnouncementsForUser } from '@/lib/queries/announcements'

/**
 * GET /api/announcements/active
 *
 * Returns up to 5 currently-visible (published, not expired, not dismissed)
 * announcements for the authenticated user, scoped by their role. Used by
 * the dashboard SystemAnnouncementBanner.
 *
 * Why we resolve the role inline instead of taking it as a query param:
 * the client mustn't be able to pick its own audience and read employer-
 * targeted messages while logged in as an employee. The role is whatever
 * we observe in our own database, period.
 */
export async function GET(req: NextRequest) {
  const claims = await getPrivyClaims(req)
  if (!claims) return NextResponse.json({ items: [] })

  const resolved = await resolveRole(claims.sub)
  if (!resolved) return NextResponse.json({ items: [] })

  const items = await listActiveAnnouncementsForUser(
    claims.sub,
    resolved.role,
    resolved.employerId,
  )
  return NextResponse.json({ items })
}

interface ResolvedRole {
  role: 'employer' | 'employee' | 'platform_admin'
  employerId: string | null
}

async function resolveRole(userId: string): Promise<ResolvedRole | null> {
  if (isPlatformAdminUserId(userId)) {
    return { role: 'platform_admin', employerId: null }
  }
  const supabase = createServerClient()
  const [{ data: employer }, { data: employee }] = await Promise.all([
    supabase
      .from('employers')
      .select('id')
      .eq('owner_user_id', userId)
      .eq('active', true)
      .maybeSingle(),
    supabase
      .from('employees')
      .select('id, employer_id')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle(),
  ])
  if (employer) return { role: 'employer', employerId: null }
  if (employee) return { role: 'employee', employerId: employee.employer_id }
  return null
}
