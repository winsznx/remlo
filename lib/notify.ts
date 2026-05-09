import { createNotification, type NotificationKind, type NotificationSeverity } from '@/lib/notifications'
import { sendEmail, sendEmailBatch, type EmailTemplate, type SendEmailBatchItem } from '@/lib/email/client'
import { getPreferences, getPreferencesForUsers, type NotificationPreferences } from '@/lib/queries/notification-preferences'

/**
 * lib/notify.ts — single fan-out helper for cross-channel notifications.
 *
 * Every existing emit site ad-hoc combines `createNotification` (employer
 * bell) + one or more `sendEmail` calls. That's fine when there's a single
 * channel, but as we add per-user preferences and an employer→employees
 * broadcast, we want one place that:
 *
 *   1. Writes the in-app row (if `inApp` is provided).
 *   2. Sends the email(s) (if `emails` is provided), respecting per-user
 *      preferences and the existing suppression list.
 *
 * Channels are independent. Failures in one don't block the other. Both
 * are best-effort — callers don't await for telemetry, this returns a
 * lightweight result for logging.
 */

export interface InAppPart {
  employerId: string
  kind: NotificationKind
  title: string
  body?: string
  severity?: NotificationSeverity
  link?: string
  metadata?: Record<string, unknown>
}

export interface EmailPart<K extends EmailTemplate = EmailTemplate> {
  to: string
  template: K
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
  idempotencyKey?: string
  /**
   * If provided and a preference row exists for this user, the dispatcher
   * checks the matching key. If the preference is `false`, the email is
   * skipped. Omit to send unconditionally (e.g. transactional security
   * mails the user can't opt out of).
   */
  preferenceCheck?: {
    userId: string
    key: keyof NotificationPreferences
  }
  /** Tag with the employer for analytics filtering. */
  employerId?: string
}

export interface NotifyInput {
  inApp?: InAppPart
  emails?: ReadonlyArray<EmailPart>
}

export interface NotifyResult {
  inAppCreated: boolean
  emailAttempted: number
  emailSent: number
  emailSkipped: number
  emailFailed: number
}

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const result: NotifyResult = {
    inAppCreated: false,
    emailAttempted: 0,
    emailSent: 0,
    emailSkipped: 0,
    emailFailed: 0,
  }

  // In-app notification (employer bell). Independent of email outcome.
  if (input.inApp) {
    try {
      await createNotification(input.inApp)
      result.inAppCreated = true
    } catch (err) {
      console.error('[notify] in-app create failed', {
        kind: input.inApp.kind,
        error: err instanceof Error ? err.message : err,
      })
    }
  }

  if (!input.emails || input.emails.length === 0) return result

  // Resolve preferences in one batch for any emails that asked for a check.
  const prefUserIds = Array.from(
    new Set(
      input.emails
        .map((e) => e.preferenceCheck?.userId)
        .filter((u): u is string => typeof u === 'string'),
    ),
  )
  const prefMap = await getPreferencesForUsers(prefUserIds)

  const cleared = input.emails.filter((email) => {
    if (!email.preferenceCheck) return true
    const prefs = prefMap.get(email.preferenceCheck.userId)
    if (!prefs) return true
    return prefs[email.preferenceCheck.key] !== false
  })
  const skippedByPrefs = input.emails.length - cleared.length
  result.emailSkipped += skippedByPrefs
  result.emailAttempted = input.emails.length

  if (cleared.length === 0) return result

  // Use sendEmail for a single mail (cheaper, returns a real id) and
  // sendEmailBatch for >1 (Resend batch endpoint, suppression-aware).
  if (cleared.length === 1) {
    const item = cleared[0]
    try {
      const r = await sendEmail({
        to: item.to,
        template: item.template,
        props: item.props,
        idempotencyKey: item.idempotencyKey,
        employerId: item.employerId,
      })
      if (r.ok) result.emailSent += 1
      else if (r.suppressed) result.emailSkipped += 1
      else result.emailFailed += 1
    } catch (err) {
      result.emailFailed += 1
      console.error('[notify] email send threw', {
        template: item.template,
        error: err instanceof Error ? err.message : err,
      })
    }
    return result
  }

  const batchItems: SendEmailBatchItem[] = cleared.map((e) => ({
    to: e.to,
    template: e.template,
    props: e.props,
    idempotencyKey: e.idempotencyKey,
    employerId: e.employerId,
  }))
  const r = await sendEmailBatch(batchItems)
  result.emailSent += r.sent
  result.emailSkipped += r.skipped
  result.emailFailed += r.failed
  return result
}

/**
 * Convenience: resolve a single user's preferences (cached behind the
 * query function — callers can await without worrying about the lookup
 * shape).
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  return getPreferences(userId)
}
