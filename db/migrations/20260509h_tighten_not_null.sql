-- 20260509h_tighten_not_null.sql
--
-- Tightens NOT NULL constraints on columns that are logically required but
-- were created without the constraint. Discovered when we regenerated
-- Supabase types after the 20260509a–g migrations: the regen exposed
-- ~90 nullable-where-it-shouldn't-be columns that the prior `(supabase as any)`
-- casts were hiding.
--
-- Strategy:
--   1. Backfill any existing nulls with sane defaults FIRST (so SET NOT NULL
--      doesn't fail on existing rows).
--   2. ALTER COLUMN ... SET NOT NULL second.
--   3. Optionally SET DEFAULT so future inserts that omit the column still
--      succeed (where DEFAULT is the right behavior).
--
-- Wrapped in a single transaction — if any step fails the whole migration
-- rolls back and you can fix the offending row.
--
-- We deliberately leave nullable:
--   - employees.wallet_address  (null until employee accepts invite + Privy provisions wallet)
--   - employees.kyc_status      (null until KYC flow starts)
--   - employees.bridge_*        (null until Bridge KYC completes)
--   - employees.first_name/last_name/etc. (PII fields filled progressively)
--   - any *_signature, *_tx_hash (null until on-chain action confirms)
--
-- Tighten only what's TRUE-NOT-NULL: timestamps, FKs, status enums, counters.

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- employers
-- ───────────────────────────────────────────────────────────────────────────
UPDATE employers SET created_at = now() WHERE created_at IS NULL;
UPDATE employers SET updated_at = now() WHERE updated_at IS NULL;
UPDATE employers SET active = true WHERE active IS NULL;

ALTER TABLE employers
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN active     SET NOT NULL,
  ALTER COLUMN active     SET DEFAULT true;

-- ───────────────────────────────────────────────────────────────────────────
-- employees
-- ───────────────────────────────────────────────────────────────────────────
UPDATE employees SET created_at = now() WHERE created_at IS NULL;
UPDATE employees SET updated_at = now() WHERE updated_at IS NULL;
UPDATE employees SET active     = true  WHERE active     IS NULL;

-- employer_id: every employee MUST belong to an employer. If any are
-- orphaned, leave them — the SET NOT NULL below will refuse to apply and
-- the operator can investigate.
ALTER TABLE employees
  ALTER COLUMN created_at  SET NOT NULL,
  ALTER COLUMN created_at  SET DEFAULT now(),
  ALTER COLUMN updated_at  SET NOT NULL,
  ALTER COLUMN updated_at  SET DEFAULT now(),
  ALTER COLUMN active      SET NOT NULL,
  ALTER COLUMN active      SET DEFAULT true,
  ALTER COLUMN employer_id SET NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- payroll_runs
-- ───────────────────────────────────────────────────────────────────────────
UPDATE payroll_runs SET created_at     = now()       WHERE created_at     IS NULL;
UPDATE payroll_runs SET status         = 'unknown'   WHERE status         IS NULL;
UPDATE payroll_runs SET chain          = 'tempo'     WHERE chain          IS NULL;
UPDATE payroll_runs SET employee_count = 0           WHERE employee_count IS NULL;
UPDATE payroll_runs SET total_amount   = 0           WHERE total_amount   IS NULL;
UPDATE payroll_runs SET fee_amount     = 0           WHERE fee_amount     IS NULL;

ALTER TABLE payroll_runs
  ALTER COLUMN created_at     SET NOT NULL,
  ALTER COLUMN created_at     SET DEFAULT now(),
  ALTER COLUMN status         SET NOT NULL,
  ALTER COLUMN chain          SET NOT NULL,
  ALTER COLUMN chain          SET DEFAULT 'tempo',
  ALTER COLUMN employer_id    SET NOT NULL,
  ALTER COLUMN employee_count SET NOT NULL,
  ALTER COLUMN employee_count SET DEFAULT 0,
  ALTER COLUMN total_amount   SET NOT NULL,
  ALTER COLUMN total_amount   SET DEFAULT 0,
  ALTER COLUMN fee_amount     SET NOT NULL,
  ALTER COLUMN fee_amount     SET DEFAULT 0;

-- ───────────────────────────────────────────────────────────────────────────
-- payment_items
-- ───────────────────────────────────────────────────────────────────────────
UPDATE payment_items SET created_at = now()     WHERE created_at IS NULL;
UPDATE payment_items SET status     = 'pending' WHERE status     IS NULL;
UPDATE payment_items SET chain      = 'tempo'   WHERE chain      IS NULL;

ALTER TABLE payment_items
  ALTER COLUMN created_at      SET NOT NULL,
  ALTER COLUMN created_at      SET DEFAULT now(),
  ALTER COLUMN status          SET NOT NULL,
  ALTER COLUMN status          SET DEFAULT 'pending',
  ALTER COLUMN chain           SET NOT NULL,
  ALTER COLUMN chain           SET DEFAULT 'tempo',
  ALTER COLUMN employee_id     SET NOT NULL,
  ALTER COLUMN payroll_run_id  SET NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- compliance_events
-- ───────────────────────────────────────────────────────────────────────────
UPDATE compliance_events SET created_at = now() WHERE created_at IS NULL;

ALTER TABLE compliance_events
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

-- event_type, result, employee_id all legitimately nullable depending on
-- the event source (some are employer-scoped, some have no result yet).
-- Don't tighten those.

COMMIT;
