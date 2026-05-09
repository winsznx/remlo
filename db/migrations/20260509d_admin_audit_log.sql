-- Append-only audit trail for platform-admin mutations.
-- Every write through /api/admin/* records who did what, against which
-- resource, and the outcome. Deletes/drops are logged before the row goes
-- away so we keep the operator-side history even after the underlying object
-- is gone.
--
-- Designed to be append-only: there's no UPDATE policy, no rotation, and
-- (eventually) we'll lock it down further with a deny-DELETE RLS policy.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id text NOT NULL,
  action text NOT NULL,
  -- e.g. 'system_announcement:abc-123', 'email_suppression:foo@bar.com'.
  resource text,
  -- 'success' | 'forbidden' | 'error' — keeps space for failed-but-attempted operations
  result text NOT NULL CHECK (result IN ('success', 'forbidden', 'error')),
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON admin_audit_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_recent
  ON admin_audit_log (created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Reads via service role through /api/admin/audit (admin-only read endpoint
-- can be added later). No public policies.
