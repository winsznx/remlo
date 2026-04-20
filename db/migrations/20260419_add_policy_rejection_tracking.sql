-- Track per-item policy rejections when a Privy server wallet policy blocks
-- a specific Solana payment in a mixed-chain payroll run. Other items in the
-- same run can still broadcast — we record the reason on the rejected row.

ALTER TABLE payment_items
  ADD COLUMN IF NOT EXISTS policy_rejection_reason TEXT;

-- payment_items.status is free-form TEXT in the current schema (no CHECK
-- constraint). Adding 'policy_rejected' as a permitted status requires no
-- schema change; new code paths just write that string directly.
