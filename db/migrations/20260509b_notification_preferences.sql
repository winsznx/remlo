-- Per-user notification preferences.
-- Today's settings page writes to localStorage which gates nothing on the
-- backend. This table is the real backing store: the email dispatcher
-- consults it before fanning out, and the settings page reads/writes via a
-- small REST surface.
--
-- Keyed on user_id (text) because both employers and employees have a
-- single Privy user identity. We don't split by role — a user might wear
-- both hats (e.g. operator running their own employer) and a single
-- preferences row keeps that simple.
--
-- Defaults intentionally permissive: opt-out, not opt-in. Mailings the
-- user explicitly subscribed to (waitlist, security) bypass these toggles.

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id text PRIMARY KEY,
  payroll_email boolean NOT NULL DEFAULT true,
  payroll_inapp boolean NOT NULL DEFAULT true,
  kyc_email boolean NOT NULL DEFAULT true,
  card_activity_email boolean NOT NULL DEFAULT true,
  weekly_summary_email boolean NOT NULL DEFAULT false,
  employer_message_email boolean NOT NULL DEFAULT true,
  announcement_email boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION user_notification_preferences_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_notification_preferences_touch_updated_at ON user_notification_preferences;
CREATE TRIGGER user_notification_preferences_touch_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION user_notification_preferences_touch_updated_at();

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
-- Reads/writes via service role only; the API enforces user_id == caller.
