-- Employer-scoped announcements: a way for an employer to message all of
-- their employees (banner + optional email) without going through Remlo's
-- platform-wide system_announcements channel.
--
-- Why extend system_announcements instead of a new table:
--   - The data shape is identical: title/body/severity/published_at/expires_at,
--     plus a per-user dismissal record.
--   - The read path (`listActiveAnnouncementsForUser`) already does audience
--     filtering; we just add an employer_id scope on top.
--   - One banner component handles all sources.
--
-- Semantics:
--   - employer_id IS NULL  → platform-wide (admin-authored), filtered by audience.
--   - employer_id IS NOT NULL → audience MUST be 'employees', and the row is
--     visible only to employees of that specific employer. Employers do not
--     get a "send to my team via banner" UX in this iteration; the composer
--     hard-codes audience='employees'.
--
-- The check constraint enforces the (employer_id NOT NULL → audience='employees')
-- invariant so we can't accidentally write a row visible to other employers'
-- staff or to admins.

ALTER TABLE system_announcements
  ADD COLUMN IF NOT EXISTS employer_id uuid REFERENCES employers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_system_announcements_employer
  ON system_announcements (employer_id, published_at DESC NULLS LAST)
  WHERE employer_id IS NOT NULL;

-- (employer_id IS NULL) OR (audience = 'employees')
ALTER TABLE system_announcements DROP CONSTRAINT IF EXISTS system_announcements_employer_audience_check;
ALTER TABLE system_announcements ADD CONSTRAINT system_announcements_employer_audience_check
  CHECK (employer_id IS NULL OR audience = 'employees');
