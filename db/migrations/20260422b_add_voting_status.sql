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
