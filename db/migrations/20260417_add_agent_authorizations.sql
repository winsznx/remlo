-- Employer agent authorizations: grant external agents permission to trigger
-- payments from an employer's treasury with per-transaction and per-day spend caps.
-- Gates POST /api/mpp/agent/pay.

CREATE TABLE IF NOT EXISTS employer_agent_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  agent_identifier TEXT NOT NULL,
  -- agent_identifier is either:
  --   - an Ethereum address (0x...) for agents identified by signing key
  --   - an AgentCard URI / https URL
  --   - a free-form opaque token
  per_tx_cap_usd NUMERIC(12,2) NOT NULL DEFAULT 100.00,
  per_day_cap_usd NUMERIC(12,2) NOT NULL DEFAULT 500.00,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (employer_id, agent_identifier)
);

CREATE INDEX IF NOT EXISTS idx_eaa_employer_active
  ON employer_agent_authorizations (employer_id, active);

-- Audit trail of calls made by authorized agents. Lets us enforce per-day caps
-- by summing today's usd_amount for a given authorization.
CREATE TABLE IF NOT EXISTS agent_pay_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authorization_id UUID NOT NULL REFERENCES employer_agent_authorizations(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  recipient_wallet TEXT NOT NULL,
  usd_amount NUMERIC(12,2) NOT NULL,
  tx_hash TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_pay_calls_auth_day
  ON agent_pay_calls (authorization_id, created_at DESC);
