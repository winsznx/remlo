-- Ship 2.2 — Escrow off-chain metadata.
-- The remlo_escrow Anchor program (Solana devnet, program ID
-- 2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA) stores the canonical state:
--   requester, worker, validator_authority, amount, hashes, status, verdict, confidence.
-- This table stores the off-chain content (rubric prompt text, deliverable URI,
-- validator reasoning, Claude model name) keyed by the on-chain PDA. Hash
-- equivalence is the bridge — rubric_hash here must equal the on-chain rubric_hash.

CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,

  -- Off-chain identifiers (agent identities from agent_authorizations)
  requester_agent_identifier TEXT NOT NULL,
  worker_agent_identifier TEXT NOT NULL,

  -- On-chain identifiers
  requester_pubkey TEXT NOT NULL,
  worker_wallet_address TEXT NOT NULL,
  nonce BIGINT NOT NULL,
  escrow_pda TEXT NOT NULL,

  -- Economics
  amount_base_units BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  chain TEXT NOT NULL DEFAULT 'solana',

  -- Off-chain content (hashes are also stored on-chain)
  rubric_prompt TEXT NOT NULL,
  rubric_hash TEXT NOT NULL,
  deliverable_uri TEXT,
  deliverable_hash TEXT,
  deliverable_submitted_at TIMESTAMPTZ,

  -- Validator state
  validator_verdict TEXT,
  validator_confidence SMALLINT,
  validator_reasoning TEXT,
  validator_model TEXT,
  validator_decided_at TIMESTAMPTZ,

  -- Transaction signature trail (all Solana devnet)
  initialize_signature TEXT,
  deliverable_signature TEXT,
  verdict_signature TEXT,
  settlement_signature TEXT,
  refund_signature TEXT,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'posted',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT escrows_status_check CHECK (
    status IN ('posted', 'delivered', 'validating', 'settled', 'rejected_refunded', 'expired_refunded')
  ),
  CONSTRAINT escrows_verdict_check CHECK (
    validator_verdict IS NULL OR validator_verdict IN ('approved', 'rejected')
  ),
  CONSTRAINT escrows_nonce_per_requester UNIQUE (requester_pubkey, nonce)
);

CREATE INDEX IF NOT EXISTS idx_escrows_employer ON escrows(employer_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);
CREATE INDEX IF NOT EXISTS idx_escrows_expires ON escrows(expires_at)
  WHERE status IN ('posted', 'delivered', 'validating');
CREATE INDEX IF NOT EXISTS idx_escrows_worker_wallet ON escrows(worker_wallet_address);
CREATE INDEX IF NOT EXISTS idx_escrows_pda ON escrows(escrow_pda);

-- RLS — mirrors the agent_authorizations pattern so employers see only their own escrows
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;

CREATE POLICY escrows_employer_select ON escrows
  FOR SELECT USING (employer_id IN (
    SELECT id FROM employers WHERE owner_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY escrows_employer_insert ON escrows
  FOR INSERT WITH CHECK (employer_id IN (
    SELECT id FROM employers WHERE owner_user_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY escrows_service_all ON escrows
  FOR ALL USING (auth.role() = 'service_role');
