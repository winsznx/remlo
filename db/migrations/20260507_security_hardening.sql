-- 20260507_security_hardening.sql
-- Tier 1 security hardening for the agent payment surface.
--
-- Adds four new columns to employer_agent_authorizations to support:
--   1. Velocity limits (calls/min) on top of existing per-tx + per-day caps.
--   2. Optional recipient allowlists pinned by the employer.
--   3. Emergency pause (one-click revoke) without losing the row.
--   4. Anomaly response: when a payment is >10× the agent's rolling median,
--      the system halves per_tx_cap_usd until the employer ack's. The original
--      cap is preserved in `per_tx_cap_original_usd` so we can restore it.
--
-- All fields are nullable / safe-default so the migration is non-breaking
-- against existing rows. New auths created via the dashboard get sensible
-- defaults (5/min velocity, no recipient allowlist, not paused).

ALTER TABLE public.employer_agent_authorizations
  ADD COLUMN IF NOT EXISTS velocity_per_minute     INTEGER     NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS allowed_recipients      TEXT[],
  ADD COLUMN IF NOT EXISTS paused_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_reason            TEXT,
  ADD COLUMN IF NOT EXISTS per_tx_cap_original_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS cap_halved_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cap_halved_reason       TEXT;

-- Index on paused_at for fast filtering in the agent_pay handler hot path.
CREATE INDEX IF NOT EXISTS employer_agent_authorizations_paused_idx
  ON public.employer_agent_authorizations (employer_id)
  WHERE paused_at IS NOT NULL;

-- Index on agent_pay_calls (employer + auth + created_at) for velocity +
-- anomaly queries. Existing tables already have an authorization_id index;
-- this composite makes the rolling-window queries cheap.
CREATE INDEX IF NOT EXISTS agent_pay_calls_velocity_idx
  ON public.agent_pay_calls (authorization_id, created_at DESC);

-- Comment the columns for future maintainers.
COMMENT ON COLUMN public.employer_agent_authorizations.velocity_per_minute
  IS 'Max agent_pay calls per 60-second rolling window. Tier 1 security gate 5.';
COMMENT ON COLUMN public.employer_agent_authorizations.allowed_recipients
  IS 'If set, agent_pay rejects targets not in this list. Optional whitelist.';
COMMENT ON COLUMN public.employer_agent_authorizations.paused_at
  IS 'Timestamp of emergency pause. agent_pay returns 403 until cleared.';
COMMENT ON COLUMN public.employer_agent_authorizations.per_tx_cap_original_usd
  IS 'Original per_tx_cap_usd before anomaly-driven halving. Restore target.';
COMMENT ON COLUMN public.employer_agent_authorizations.cap_halved_at
  IS 'Timestamp the system auto-halved per_tx_cap_usd in response to a >10x spike.';
