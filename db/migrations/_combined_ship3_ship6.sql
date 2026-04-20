-- 20260421_add_reputation_writes.sql
-- Ship 3: queue table for async cross-chain reputation attestation writes.
--
-- Reputation writes are *always* deferred from the originating payment/escrow
-- transaction. A failed attestation must never roll back an already-settled
-- payment. This table is the queue + audit trail.
--
-- Lifecycle: pending -> written (success), or pending -> failed -> ... ->
-- giving_up after 5 attempts. The /api/cron/process-reputation-writes worker
-- drains pending + failed rows.
--
-- Public read on `status='written'` rows so external protocols can audit
-- reputation provenance against the on-chain attestation/feedback.

CREATE TABLE IF NOT EXISTS reputation_writes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain TEXT NOT NULL,
  subject_address TEXT NOT NULL,
  schema_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attestation_pda TEXT,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  written_at TIMESTAMPTZ,
  CONSTRAINT reputation_writes_chain_check CHECK (chain IN ('solana', 'tempo')),
  CONSTRAINT reputation_writes_status_check CHECK (status IN ('pending', 'written', 'failed', 'giving_up')),
  CONSTRAINT reputation_writes_source_check CHECK (source_type IN ('payment_item', 'escrow', 'agent_pay_call', 'employer'))
);

CREATE INDEX IF NOT EXISTS idx_reputation_writes_status ON reputation_writes(status) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_reputation_writes_subject ON reputation_writes(chain, subject_address);
CREATE INDEX IF NOT EXISTS idx_reputation_writes_source ON reputation_writes(source_type, source_id);

-- Touch updated_at on every UPDATE
CREATE OR REPLACE FUNCTION touch_reputation_writes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reputation_writes_touch_updated_at ON reputation_writes;
CREATE TRIGGER reputation_writes_touch_updated_at
  BEFORE UPDATE ON reputation_writes
  FOR EACH ROW EXECUTE FUNCTION touch_reputation_writes_updated_at();

ALTER TABLE reputation_writes ENABLE ROW LEVEL SECURITY;

CREATE POLICY reputation_writes_service_all ON reputation_writes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY reputation_writes_public_read ON reputation_writes
  FOR SELECT USING (status = 'written');
-- 20260422_add_validator_votes.sql
-- Ship 6: application-layer multi-validator consensus for escrow verdicts.
--
-- Design note — this is application-layer consensus, NOT on-chain voting.
-- N validators cast votes into Supabase; when the configured consensus rule
-- resolves (simple-majority / unanimous / weighted), lib/escrow.ts broadcasts
-- ONE on-chain post_verdict via the existing Privy Solana server wallet. The
-- Anchor program is unchanged from Ship 2.2 — still single-signer, still
-- atomic settlement.
--
-- Production path (post-hackathon): migrate to an on-chain voting program
-- (e.g. Squads-style multi-sig, or a custom Anchor program with per-
-- validator signatures). For now, the trust model is "Remlo collects votes,
-- then broadcasts the majority verdict" — acknowledged centralization that
-- the README/AGENT_PROGRESS Ship 6 entry disclose honestly.

CREATE TABLE IF NOT EXISTS validator_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrows(id) ON DELETE CASCADE,
  validator_id TEXT NOT NULL,
  validator_address TEXT NOT NULL,
  validator_type TEXT NOT NULL CHECK (
    validator_type IN ('llm_claude', 'llm_gpt4', 'human', 'oracle')
  ),
  verdict TEXT NOT NULL CHECK (verdict IN ('approved', 'rejected')),
  confidence NUMERIC(4, 3),
  reasoning TEXT,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (escrow_id, validator_id)
);

CREATE INDEX IF NOT EXISTS idx_validator_votes_escrow ON validator_votes(escrow_id);
CREATE INDEX IF NOT EXISTS idx_validator_votes_validator ON validator_votes(validator_id);

CREATE TABLE IF NOT EXISTS escrow_validator_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  validator_id TEXT NOT NULL,
  validator_address TEXT NOT NULL,
  validator_type TEXT NOT NULL CHECK (
    validator_type IN ('llm_claude', 'llm_gpt4', 'human', 'oracle')
  ),
  weight INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employer_id, validator_id)
);

CREATE INDEX IF NOT EXISTS idx_escrow_validator_configs_employer
  ON escrow_validator_configs(employer_id) WHERE active = true;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE validator_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY validator_votes_service_all ON validator_votes
  FOR ALL USING (auth.role() = 'service_role');

-- Employer can SELECT their own escrow's votes
CREATE POLICY validator_votes_employer_read ON validator_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM escrows e
      JOIN employers emp ON emp.id = e.employer_id
      WHERE e.id = validator_votes.escrow_id
        AND emp.owner_user_id = auth.uid()::text
    )
  );

ALTER TABLE escrow_validator_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY escrow_validator_configs_service_all ON escrow_validator_configs
  FOR ALL USING (auth.role() = 'service_role');

-- Employer can SELECT/INSERT/UPDATE their own validator configs
CREATE POLICY escrow_validator_configs_employer_read ON escrow_validator_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employers
      WHERE employers.id = escrow_validator_configs.employer_id
        AND employers.owner_user_id = auth.uid()::text
    )
  );

CREATE POLICY escrow_validator_configs_employer_write ON escrow_validator_configs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employers
      WHERE employers.id = escrow_validator_configs.employer_id
        AND employers.owner_user_id = auth.uid()::text
    )
  );

CREATE POLICY escrow_validator_configs_employer_update ON escrow_validator_configs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employers
      WHERE employers.id = escrow_validator_configs.employer_id
        AND employers.owner_user_id = auth.uid()::text
    )
  );
-- 20260422b_add_voting_status.sql
-- Ship 6: adds 'voting' to the escrow status enum so multi-validator escrows
-- can park in that state while waiting for additional votes (human, oracle).
--
-- Lifecycle now: posted -> delivered -> validating -> [voting] ->
-- settled | rejected_refunded | expired_refunded.
--
-- 'voting' is reached when the required-votes threshold has been set above 1
-- (multiple validators configured for the employer) and the consensus engine
-- hasn't resolved yet. Transitions OUT of 'voting' happen in
-- /api/escrows/[id]/vote after each new vote is counted.

ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_status_check;

ALTER TABLE escrows ADD CONSTRAINT escrows_status_check CHECK (
  status IN (
    'posted',
    'delivered',
    'validating',
    'voting',
    'settled',
    'rejected_refunded',
    'expired_refunded'
  )
);

-- Keep the expired-escrow cron index consistent with pre-settlement states.
DROP INDEX IF EXISTS idx_escrows_active_expires;
CREATE INDEX IF NOT EXISTS idx_escrows_active_expires
  ON escrows(expires_at)
  WHERE status IN ('posted', 'delivered', 'validating', 'voting');
