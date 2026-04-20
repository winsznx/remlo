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
