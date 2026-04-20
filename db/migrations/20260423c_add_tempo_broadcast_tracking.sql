-- 20260423c_add_tempo_broadcast_tracking.sql
-- Ship 7 Part 4 observability — track Privy+Tempo broadcast failures so the
-- dashboard can surface them and the operator can decide whether to flip the
-- USE_LEGACY_TEMPO_SIGNER env flag back on. Separate from reputation_writes.attempts/
-- last_error because those columns are also used by the Solana SAS path — we
-- want Tempo-specific counters without conflating the two chains.

ALTER TABLE reputation_writes
  ADD COLUMN IF NOT EXISTS tempo_broadcast_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_tempo_error TEXT,
  ADD COLUMN IF NOT EXISTS last_signer_path TEXT;

CREATE INDEX IF NOT EXISTS idx_reputation_writes_tempo_failures
  ON reputation_writes(chain, tempo_broadcast_failures)
  WHERE chain = 'tempo' AND tempo_broadcast_failures > 0;
