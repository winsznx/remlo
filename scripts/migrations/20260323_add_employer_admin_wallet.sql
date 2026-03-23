-- Adds the canonical employer admin wallet used to derive on-chain treasury keys.
-- Existing employer rows should be backfilled with the actual Privy or connected
-- Tempo wallet that deposits into PayrollTreasury.

ALTER TABLE employers
ADD COLUMN IF NOT EXISTS employer_admin_wallet TEXT;

COMMENT ON COLUMN employers.employer_admin_wallet IS
  'Canonical employer admin wallet address used to derive keccak256(abi.encodePacked(employerAdminAddress)) for PayrollTreasury, YieldRouter, and EmployeeRegistry reads.';

-- Example backfill:
-- UPDATE employers
-- SET employer_admin_wallet = '0xYourEmployerWallet'
-- WHERE id = '00000000-0000-0000-0000-000000000000';
