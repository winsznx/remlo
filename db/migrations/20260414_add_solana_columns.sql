-- Solana support columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS solana_wallet_address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS preferred_chain TEXT DEFAULT 'tempo';

ALTER TABLE employers ADD COLUMN IF NOT EXISTS solana_treasury_address TEXT;
ALTER TABLE employers ADD COLUMN IF NOT EXISTS solana_enabled BOOLEAN DEFAULT false;

ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS chain TEXT DEFAULT 'tempo';
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS solana_signatures TEXT[];

ALTER TABLE payment_items ADD COLUMN IF NOT EXISTS chain TEXT DEFAULT 'tempo';
ALTER TABLE payment_items ADD COLUMN IF NOT EXISTS solana_signature TEXT;

-- Agent decisions audit trail
CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES employers(id),
  payroll_run_id UUID REFERENCES payroll_runs(id),
  decision_type TEXT NOT NULL,
  inputs JSONB NOT NULL,
  reasoning TEXT NOT NULL,
  decision JSONB NOT NULL,
  confidence NUMERIC(3,2),
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
