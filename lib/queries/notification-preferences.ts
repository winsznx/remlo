import { createServerClient } from '@/lib/supabase-server'

export interface NotificationPreferences {
  payrollEmail: boolean
  payrollInapp: boolean
  kycEmail: boolean
  cardActivityEmail: boolean
  weeklySummaryEmail: boolean
  employerMessageEmail: boolean
  announcementEmail: boolean
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  payrollEmail: true,
  payrollInapp: true,
  kycEmail: true,
  cardActivityEmail: true,
  weeklySummaryEmail: false,
  employerMessageEmail: true,
  announcementEmail: false,
}

interface PreferencesRow {
  user_id: string
  payroll_email: boolean
  payroll_inapp: boolean
  kyc_email: boolean
  card_activity_email: boolean
  weekly_summary_email: boolean
  employer_message_email: boolean
  announcement_email: boolean
}

function rowToPrefs(row: PreferencesRow): NotificationPreferences {
  return {
    payrollEmail: row.payroll_email,
    payrollInapp: row.payroll_inapp,
    kycEmail: row.kyc_email,
    cardActivityEmail: row.card_activity_email,
    weeklySummaryEmail: row.weekly_summary_email,
    employerMessageEmail: row.employer_message_email,
    announcementEmail: row.announcement_email,
  }
}

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return DEFAULT_PREFERENCES
  return rowToPrefs(data as PreferencesRow)
}

/**
 * Look up preferences for many users at once. Missing rows fall back to
 * defaults so callers never see undefined for an unknown user.
 */
export async function getPreferencesForUsers(
  userIds: ReadonlyArray<string>,
): Promise<Map<string, NotificationPreferences>> {
  const map = new Map<string, NotificationPreferences>()
  if (userIds.length === 0) return map

  const supabase = createServerClient()
  const { data } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .in('user_id', [...userIds])

  for (const userId of userIds) {
    map.set(userId, DEFAULT_PREFERENCES)
  }
  for (const row of (data ?? []) as PreferencesRow[]) {
    map.set(row.user_id, rowToPrefs(row))
  }
  return map
}

export async function upsertPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const supabase = createServerClient()
  const current = await getPreferences(userId)
  const merged: NotificationPreferences = { ...current, ...patch }
  const row: PreferencesRow = {
    user_id: userId,
    payroll_email: merged.payrollEmail,
    payroll_inapp: merged.payrollInapp,
    kyc_email: merged.kycEmail,
    card_activity_email: merged.cardActivityEmail,
    weekly_summary_email: merged.weeklySummaryEmail,
    employer_message_email: merged.employerMessageEmail,
    announcement_email: merged.announcementEmail,
  }
  await supabase
    .from('user_notification_preferences')
    .upsert(row, { onConflict: 'user_id' })
  return merged
}
