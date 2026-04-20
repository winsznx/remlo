-- 20260423_add_decision_type.sql
-- Ship 7 J3: specialist treasury council — reuse Ship 6's validator_votes
-- consensus primitive for a second decision class (high-value treasury actions).
--
-- The consensus engine in lib/validators/consensus.ts is pure; it doesn't care
-- whether the vote is about an escrow verdict or a treasury action. Adding a
-- `decision_type` discriminator on validator_votes + a parallel `source_id`
-- fanout (via treasury_decisions.id) lets us use one voting table for both.
--
-- Existing Ship 6 rows stay valid — the column defaults to 'escrow_verdict'.

-- ─── Extend validator_votes with decision_type ─────────────────────────────

ALTER TABLE validator_votes
  ADD COLUMN IF NOT EXISTS decision_type TEXT NOT NULL DEFAULT 'escrow_verdict';

-- Nullable source_id for treasury decisions — when decision_type = 'treasury_action',
-- escrow_id is set to a synthetic UUID for the decision row (via treasury_decisions.id
-- cast). We keep escrow_id NOT NULL to match Ship 6's schema, so treasury decisions
-- reuse the column as a generic "decision anchor" UUID. This avoids a schema rewrite
-- at pitch eve while keeping the foreign key on escrow_id for the common path.
--
-- Trade-off documented: treasury_decisions.id values inserted into validator_votes.escrow_id
-- will fail the FK unless we drop it. We drop the FK and leave escrow_id as a plain UUID
-- column — the `decision_type` + join-direction tells us which table to dereference to.

ALTER TABLE validator_votes
  DROP CONSTRAINT IF EXISTS validator_votes_escrow_id_fkey;

-- Re-declare the check constraint with both decision types allowed
ALTER TABLE validator_votes
  DROP CONSTRAINT IF EXISTS validator_votes_decision_type_check;
ALTER TABLE validator_votes
  ADD CONSTRAINT validator_votes_decision_type_check
  CHECK (decision_type IN ('escrow_verdict', 'treasury_action'));

CREATE INDEX IF NOT EXISTS idx_validator_votes_decision_type
  ON validator_votes(decision_type);

-- ─── treasury_decisions table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS treasury_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_council',
  council_verdict TEXT,
  council_confidence NUMERIC(4, 3),
  council_reasoning TEXT,
  execution_signature TEXT,
  execution_error TEXT,
  proposer_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  CONSTRAINT treasury_decisions_status_check
    CHECK (status IN (
      'pending_council',
      'council_approved',
      'council_rejected',
      'executed',
      'execution_failed',
      'cancelled'
    )),
  CONSTRAINT treasury_decisions_action_check
    CHECK (action_type IN (
      'yield_route_change',
      'allocation_rebalance',
      'large_payroll_approval'
    )),
  CONSTRAINT treasury_decisions_verdict_check
    CHECK (council_verdict IS NULL OR council_verdict IN ('approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_treasury_decisions_employer
  ON treasury_decisions(employer_id);
CREATE INDEX IF NOT EXISTS idx_treasury_decisions_status
  ON treasury_decisions(status);
CREATE INDEX IF NOT EXISTS idx_treasury_decisions_created_at
  ON treasury_decisions(created_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE treasury_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY treasury_decisions_service_all ON treasury_decisions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY treasury_decisions_employer_read ON treasury_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employers
      WHERE employers.id = treasury_decisions.employer_id
        AND employers.owner_user_id = auth.uid()::text
    )
  );

CREATE POLICY treasury_decisions_employer_insert ON treasury_decisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employers
      WHERE employers.id = treasury_decisions.employer_id
        AND employers.owner_user_id = auth.uid()::text
    )
  );

CREATE POLICY treasury_decisions_employer_update ON treasury_decisions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employers
      WHERE employers.id = treasury_decisions.employer_id
        AND employers.owner_user_id = auth.uid()::text
    )
  );

-- ─── Supporting columns for dispatchAction targets ─────────────────────────
-- yield_route_change flips this to an arbitrary route identifier (demo-only).
-- large_payroll_approval stamps council_approved_at on the payroll_run.
ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS yield_preference TEXT;
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS council_approved_at TIMESTAMPTZ;
