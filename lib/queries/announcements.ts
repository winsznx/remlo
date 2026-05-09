import { createServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'

export type Announcement = Database['public']['Tables']['system_announcements']['Row']
export type AnnouncementAudience = Announcement['audience']
export type AnnouncementSeverity = Announcement['severity']

export interface CreateAnnouncementInput {
  title: string
  body: string
  link_url?: string | null
  link_label?: string | null
  severity?: AnnouncementSeverity
  audience?: AnnouncementAudience
  published_at?: string | null
  expires_at?: string | null
  created_by: string
  /**
   * When set, the announcement is scoped to a single employer's employees
   * (banner only shows for employees of that employer). The DB CHECK
   * enforces audience='employees' whenever this is non-null.
   */
  employer_id?: string | null
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<Announcement | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('system_announcements')
    .insert({
      title: input.title,
      body: input.body,
      link_url: input.link_url ?? null,
      link_label: input.link_label ?? null,
      severity: input.severity ?? 'info',
      audience: input.audience ?? 'all',
      published_at: input.published_at ?? new Date().toISOString(),
      expires_at: input.expires_at ?? null,
      created_by: input.created_by,
      ...(input.employer_id ? { employer_id: input.employer_id } : {}),
    })
    .select('*')
    .single()
  if (error) {
    console.error('[announcements] insert failed', error.message)
    return null
  }
  return data
}

export interface UpdateAnnouncementInput {
  id: string
  title?: string
  body?: string
  link_url?: string | null
  link_label?: string | null
  severity?: AnnouncementSeverity
  audience?: AnnouncementAudience
  published_at?: string | null
  expires_at?: string | null
}

export async function updateAnnouncement(
  input: UpdateAnnouncementInput,
): Promise<Announcement | null> {
  const supabase = createServerClient()
  const { id, ...patch } = input
  const { data, error } = await supabase
    .from('system_announcements')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) {
    console.error('[announcements] update failed', error.message)
    return null
  }
  return data ?? null
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const supabase = createServerClient()
  const { error } = await supabase.from('system_announcements').delete().eq('id', id)
  if (error) {
    console.error('[announcements] delete failed', error.message)
    return false
  }
  return true
}

export async function listAllAnnouncements(): Promise<Announcement[]> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('system_announcements')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

/**
 * Resolve the active announcements for a user, accounting for:
 *   - audience match against the user's role
 *   - published_at <= now
 *   - expires_at IS NULL OR expires_at > now
 *   - the user has not dismissed it
 *   - employer_id matches their own employer (or is NULL for platform-wide)
 *
 * Returns at most 5 active items, ordered by severity (errors first) then
 * recency. We cap at 5 to keep the dashboard banner from becoming a tower.
 *
 * @param employerScope For employee callers, the employer they belong to —
 *   used to filter employer-scoped announcements. For employer/admin callers
 *   pass null (employer-scoped rows aren't visible to those roles).
 */
export async function listActiveAnnouncementsForUser(
  userId: string,
  role: 'employer' | 'employee' | 'platform_admin',
  employerScope: string | null = null,
): Promise<Announcement[]> {
  const supabase = createServerClient()
  const audienceWhitelist: AnnouncementAudience[] =
    role === 'employer'
      ? ['all', 'employers']
      : role === 'employee'
        ? ['all', 'employees']
        : ['all', 'admins']
  const now = new Date().toISOString()

  const { data: announcements } = await supabase
    .from('system_announcements')
    .select('*')
    .in('audience', audienceWhitelist)
    .lte('published_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(40)

  if (!announcements || announcements.length === 0) return []

  // Filter employer-scoped rows: only employees of the same employer see them.
  // Employer-role and admin-role callers never see employer-scoped rows.
  const filteredByScope = announcements.filter((a) => {
    const scope = a.employer_id
    if (!scope) return true
    if (role !== 'employee') return false
    return employerScope !== null && scope === employerScope
  })
  if (filteredByScope.length === 0) return []

  const { data: dismissals } = await supabase
    .from('system_announcement_dismissals')
    .select('announcement_id')
    .eq('user_id', userId)
    .in(
      'announcement_id',
      filteredByScope.map((a) => a.id),
    )
  const dismissedSet = new Set((dismissals ?? []).map((d) => d.announcement_id))

  const visible = filteredByScope.filter((a) => !dismissedSet.has(a.id))
  // Severity-first ordering with `error` highest, then warning/success/info,
  // tiebreak by recency. Banner shows at most 5 to avoid tower-of-banners UX.
  const severityRank: Record<AnnouncementSeverity, number> = {
    error: 0,
    warning: 1,
    success: 2,
    info: 3,
  }
  visible.sort((a, b) => {
    const sev = severityRank[a.severity] - severityRank[b.severity]
    if (sev !== 0) return sev
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  return visible.slice(0, 5)
}

export async function dismissAnnouncementForUser(
  announcementId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('system_announcement_dismissals')
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: 'announcement_id,user_id' },
    )
  if (error) {
    console.error('[announcements] dismiss failed', error.message)
    return false
  }
  return true
}
