-- Remlo database schema
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/cqtgzprtzhykdumvigck/sql

-- EMPLOYERS
CREATE TABLE IF NOT EXISTS employers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id             TEXT NOT NULL,
  company_name              TEXT NOT NULL,
  company_size              TEXT,
  treasury_contract         TEXT,
  bridge_customer_id        TEXT,
  bridge_virtual_account_id TEXT,
  tip403_policy_id          BIGINT,
  subscription_tier         TEXT DEFAULT 'starter',
  mpp_agent_key_hash        TEXT,
  active                    BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id            UUID REFERENCES employers(id) ON DELETE CASCADE,
  user_id                TEXT,
  wallet_address         TEXT,
  email                  TEXT NOT NULL,
  first_name             TEXT,
  last_name              TEXT,
  job_title              TEXT,
  department             TEXT,
  country_code           CHAR(2),
  salary_amount          NUMERIC(18,6),
  salary_currency        TEXT DEFAULT 'USD',
  pay_frequency          TEXT DEFAULT 'monthly',
  employee_id_hash       TEXT,
  bridge_customer_id     TEXT,
  bridge_card_id         TEXT,
  bridge_bank_account_id TEXT,
  kyc_status             TEXT DEFAULT 'pending',
  kyc_verified_at        TIMESTAMPTZ,
  stream_contract        TEXT,
  active                 BOOLEAN DEFAULT true,
  invited_at             TIMESTAMPTZ,
  onboarded_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- PAYROLL RUNS
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id       UUID REFERENCES employers(id),
  status            TEXT DEFAULT 'draft',
  total_amount      NUMERIC(18,6),
  employee_count    INTEGER,
  fee_amount        NUMERIC(18,6) DEFAULT 0,
  token_address     TEXT DEFAULT '0x20c0000000000000000000000000000000000000',
  tx_hash           TEXT,
  mpp_receipt_hash  TEXT,
  block_number      BIGINT,
  finalized_at      TIMESTAMPTZ,
  settlement_time_ms INTEGER,
  created_by        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENT ITEMS
CREATE TABLE IF NOT EXISTS payment_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES payroll_runs(id),
  employee_id    UUID REFERENCES employees(id),
  amount         NUMERIC(18,6) NOT NULL,
  memo_bytes     BYTEA,
  memo_decoded   JSONB,
  status         TEXT DEFAULT 'pending',
  tx_hash        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- COMPLIANCE EVENTS
CREATE TABLE IF NOT EXISTS compliance_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id    UUID REFERENCES employers(id),
  employee_id    UUID REFERENCES employees(id),
  wallet_address TEXT,
  event_type     TEXT,
  result         TEXT,
  risk_score     INTEGER,
  description    TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- MPP SESSIONS
CREATE TABLE IF NOT EXISTS mpp_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id     UUID REFERENCES employers(id),
  agent_wallet    TEXT NOT NULL,
  channel_tx_hash TEXT,
  max_deposit     NUMERIC(18,6),
  total_spent     NUMERIC(18,6) DEFAULT 0,
  status          TEXT DEFAULT 'open',
  opened_at       TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  last_action     TEXT
);

-- ─── RLS POLICIES ────────────────────────────────────────────────────────────

ALTER TABLE employers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpp_sessions     ENABLE ROW LEVEL SECURITY;

-- employers: owner can read/update their own row
CREATE POLICY "employers_select" ON employers FOR SELECT USING (owner_user_id = auth.uid()::text);
CREATE POLICY "employers_update" ON employers FOR UPDATE USING (owner_user_id = auth.uid()::text);
CREATE POLICY "employers_insert" ON employers FOR INSERT WITH CHECK (true); -- service role only in practice

-- employees: employer owner access + employee self-access
CREATE POLICY "employees_employer_select" ON employees FOR SELECT
  USING (employer_id IN (SELECT id FROM employers WHERE owner_user_id = auth.uid()::text));
CREATE POLICY "employees_employer_update" ON employees FOR UPDATE
  USING (employer_id IN (SELECT id FROM employers WHERE owner_user_id = auth.uid()::text));
CREATE POLICY "employees_employer_delete" ON employees FOR DELETE
  USING (employer_id IN (SELECT id FROM employers WHERE owner_user_id = auth.uid()::text));
CREATE POLICY "employees_self_select" ON employees FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (true);

-- payroll_runs: employer owner only
CREATE POLICY "payroll_runs_select" ON payroll_runs FOR SELECT
  USING (employer_id IN (SELECT id FROM employers WHERE owner_user_id = auth.uid()::text));
CREATE POLICY "payroll_runs_insert" ON payroll_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "payroll_runs_update" ON payroll_runs FOR UPDATE
  USING (employer_id IN (SELECT id FROM employers WHERE owner_user_id = auth.uid()::text));

-- payment_items: employer sees all, employee sees own
CREATE POLICY "payment_items_employer_select" ON payment_items FOR SELECT
  USING (payroll_run_id IN (
    SELECT id FROM payroll_runs WHERE employer_id IN (
      SELECT id FROM employers WHERE owner_user_id = auth.uid()::text
    )
  ));
CREATE POLICY "payment_items_employee_select" ON payment_items FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()::text));
CREATE POLICY "payment_items_insert" ON payment_items FOR INSERT WITH CHECK (true);

-- compliance_events: employer read only, service role insert
CREATE POLICY "compliance_events_select" ON compliance_events FOR SELECT
  USING (employer_id IN (SELECT id FROM employers WHERE owner_user_id = auth.uid()::text));
CREATE POLICY "compliance_events_insert" ON compliance_events FOR INSERT WITH CHECK (true);

-- mpp_sessions: employer sees own, service role insert/update
CREATE POLICY "mpp_sessions_select" ON mpp_sessions FOR SELECT
  USING (employer_id IN (SELECT id FROM employers WHERE owner_user_id = auth.uid()::text));
CREATE POLICY "mpp_sessions_insert" ON mpp_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "mpp_sessions_update" ON mpp_sessions FOR UPDATE WITH CHECK (true);
