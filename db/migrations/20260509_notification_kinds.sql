-- Add agent_paused + agent_spike_detected to the notifications kind CHECK.
-- These two kinds are written by the security-hardening code (kill switch
-- and >10× median spike detector) but were never added to the constraint
-- when the TS NotificationKind union was extended. Without this migration
-- both inserts fail in prod with "violates check constraint" the first time
-- the safety paths fire.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
  'payroll_finalized',
  'payroll_failed',
  'escrow_settled',
  'escrow_refunded',
  'council_decision',
  'kyc_update',
  'reputation_write_failed',
  'agent_paused',
  'agent_spike_detected'
));
