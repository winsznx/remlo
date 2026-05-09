-- TIP-1022 virtual address support — per-employer master registration.
--
-- Each employer that opts into per-employee deposit addresses gets one
-- masterId registered on the Tempo Address Registry (precompile
-- 0xFDC0...). The masterId is 4 bytes (8 hex chars). The chain stores the
-- mapping `masterId → masterAddress`; we cache it here so we can derive
-- per-employee virtual addresses without a chain read.
--
-- Per-employee userTags are NOT stored — they're deterministic
-- (`keccak256(employerId, employeeId)[:6]`). We derive on demand.
--
-- Deposit events fire as `Transfer(sender → virtual)` followed by
-- `Transfer(virtual → master)`. We index incoming transfers by listening
-- for the second leg and decoding the userTag from the first leg's `to`.
-- The `virtual_address_inflows` table is a write-through cache populated
-- by the indexer (or by an on-demand RPC scan). It's not the source of
-- truth — the chain is — but it makes the activity feed cheap to render.

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS virtual_master_id text,
  ADD COLUMN IF NOT EXISTS virtual_master_address text,
  ADD COLUMN IF NOT EXISTS virtual_master_salt text,
  ADD COLUMN IF NOT EXISTS virtual_master_tx_hash text,
  ADD COLUMN IF NOT EXISTS virtual_master_registered_at timestamptz;

-- masterId is exactly 4 bytes -> 0x + 8 hex chars (10 chars total)
ALTER TABLE employers DROP CONSTRAINT IF EXISTS employers_virtual_master_id_format;
ALTER TABLE employers ADD CONSTRAINT employers_virtual_master_id_format
  CHECK (virtual_master_id IS NULL OR virtual_master_id ~ '^0x[0-9a-fA-F]{8}$');

CREATE INDEX IF NOT EXISTS idx_employers_virtual_master_id
  ON employers (virtual_master_id)
  WHERE virtual_master_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS virtual_address_inflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  -- The employee the userTag decoded to. NULL when the inflow's userTag
  -- doesn't map to any current employee (older employee, manual deposit).
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  user_tag text NOT NULL,
  token_address text NOT NULL,
  amount text NOT NULL,            -- raw uint256 string
  decimals integer NOT NULL,
  symbol text,
  tx_hash text NOT NULL,
  block_number bigint,
  log_index integer,
  -- The address that originated the deposit (the `from` of the outer Transfer).
  sender_address text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_tag ~ '^0x[0-9a-fA-F]{12}$'),
  -- One row per (txHash, logIndex) — guards against duplicate ingestion.
  UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_virtual_inflows_employer_recent
  ON virtual_address_inflows (employer_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_virtual_inflows_employee
  ON virtual_address_inflows (employee_id, observed_at DESC)
  WHERE employee_id IS NOT NULL;

ALTER TABLE virtual_address_inflows ENABLE ROW LEVEL SECURITY;
-- Reads via service role through the activity feed and admin endpoints.
