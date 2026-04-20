-- 20260423b_add_expiry_tracking.sql
-- Ship 7 J4: track requested vs applied escrow expiry when reputation-tiering
-- shortens the waiting period for known workers.
--
-- The Anchor program's enforced range doesn't change; we just persist what we
-- computed so the UI + audit trail can explain any deviation from requested.

ALTER TABLE escrows
  ADD COLUMN IF NOT EXISTS requested_expiry_hours INTEGER,
  ADD COLUMN IF NOT EXISTS applied_expiry_hours INTEGER,
  ADD COLUMN IF NOT EXISTS worker_reputation_tier TEXT,
  ADD COLUMN IF NOT EXISTS worker_attestation_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_escrows_worker_reputation_tier
  ON escrows(worker_reputation_tier)
  WHERE worker_reputation_tier IS NOT NULL;
