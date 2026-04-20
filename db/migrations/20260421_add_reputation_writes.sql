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
