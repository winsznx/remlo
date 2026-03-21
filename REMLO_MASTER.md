# REMLO_MASTER.md
# The Single Source of Truth for Every Claude Code Agent Session

**Version**: 1.0 · March 2026 · Tempo × Stripe × MPP Ecosystem  
**Status**: Production — do not deviate from any instruction in this file  
**Product name**: Remlo (never PayStream, never PayStream Global — those are old names, purge them anywhere they appear)

---

## AGENT OPERATING INSTRUCTIONS

This document is the reconciled master for building Remlo. Three source documents fed into this file:

- **Doc A** — Remlo Architecture & Design Specification (arch spec)
- **Doc B** — Remlo Complete Build Guide for Tempo × Stripe (build guide)
- **Doc C** — Remlo × MPP: Complete Integration Blueprint (MPP blueprint)

**Document hierarchy when conflicts arise:**
- Doc C overrides Doc A and Doc B on anything inside `/api/mpp/*` routes and `lib/mpp.ts`
- Doc B overrides Doc A on contract ABIs, real chain addresses, Viem patterns, Foundry CLI, and Bridge API endpoint paths
- Doc A is the authority on everything else: routes, layouts, component names, DB schema, env vars, CSS tokens, build task order

**Before every task you begin:**
1. Re-read the specific section of this master that covers your current task
2. Re-read `AGENT_PROGRESS.md` — it tells you exactly what was completed and what is next
3. Verify TypeScript compiles clean before marking any task done
4. Write a 3-line summary to `AGENT_PROGRESS.md` after each completed task: task ID, files modified, next task

**Do NOT:**
- Use the word PayStream or PayStream Global anywhere in code, comments, copy, or filenames
- Use `localStorage` or `sessionStorage` anywhere — Zustand (in-memory) or Supabase (persistent) only
- Write class components — hooks only
- Inline ABI arrays in component or route files — all ABIs live in `/lib/abis/*.ts`
- Inline Supabase query logic in components — all queries live in `/lib/queries/*.ts`
- Write more than 200 lines in a single component file without extracting sub-components
- Expose `BRIDGE_API_KEY`, `SUPABASE_SERVICE_KEY`, or `CLAUDE_API_KEY` to any client component

**DO:**
- Use CSS variables (`var(--token-name)`) for all colors — never hardcode hex values in Tailwind classes
- Use `4px` base unit — all spacing must be multiples of 4
- Use Lucide React exclusively for icons
- Use IBM Plex Mono (`font-mono`) for all wallet addresses, tx hashes, contract addresses
- Use Framer Motion for all animations — max 350ms duration
- Use skeleton screens (never spinners) for all page-level loading states
- Use `sonner` for all toast notifications — bottom-right, 4s auto-dismiss

---

## SKILLS AVAILABLE TO THIS AGENT

When building any of the following, you **must** read the corresponding skill file before writing a single line of code:

| Situation | Skill file to read FIRST |
|-----------|--------------------------|
| Building any frontend component, page, or UI | `/mnt/skills/public/frontend-design/SKILL.md` |
| Creating any `.docx` file (payslip, report, export) | `/mnt/skills/public/docx/SKILL.md` |
| Creating any `.pdf` file (payslip PDF, audit export) | `/mnt/skills/public/pdf/SKILL.md` |
| Reading any uploaded file from user | `/mnt/skills/public/file-reading/SKILL.md` |
| Creating any `.pptx` file (pitch deck) | `/mnt/skills/public/pptx/SKILL.md` |
| Creating any `.xlsx` file (payroll export, CSV processing) | `/mnt/skills/public/xlsx/SKILL.md` |

The frontend-design skill in particular **must be read before every frontend task** — it contains the design patterns, component quality standards, and visual guidelines that make Remlo look like an institutional finance product rather than a generic AI-built app. Do not skip this. Remlo's entire pitch depends on it looking like Stripe's dashboard, not a hackathon demo.

---

## PART 1: RESOLVED CONFLICTS

These resolutions are final. Do not re-derive them.

### Conflict 1: `lib/mpp.ts` naming collision
- **Problem**: Doc A uses `lib/privy.ts` for Privy chain config. Doc C creates `lib/mpp.ts` for the mppx server instance. The names do not collide — they are different files — but an agent must know both exist simultaneously.
- **Resolution**:
  - `lib/privy.ts` → Privy SDK config, tempoChain definition, PrivyProvider setup
  - `lib/mpp.ts` → mppx single-charge server instance (`Mppx.create` with Tempo method)
  - `lib/mpp-multirail.ts` → mppx dual-rail server instance (Tempo + Stripe SPT methods combined)
  - These three files coexist. Never merge them.

### Conflict 2: Server framework
- **Problem**: Doc C shows some Hono patterns in certain code samples.
- **Resolution**: Remlo is entirely Next.js 15 App Router. All route handlers are `app/api/**/route.ts` files using Next.js Route Handlers. The Hono examples in Doc C are **reference patterns for understanding mppx syntax only** — do not create any Hono server. Every production route handler uses Next.js.

### Conflict 3: `/api/` namespace
- **Problem**: Doc A defines core API routes at `/api/employers`, `/api/employees`, `/api/payroll`, etc. Doc C adds a new `/api/mpp/*` namespace.
- **Resolution**: These do not conflict — they are parallel namespaces. The `/api/mpp/*` routes are additive. They sit alongside the existing routes and expose the same underlying business logic through the MPP payment gate. Core internal routes remain at their existing paths. MPP-public routes are at `/api/mpp/**`.

### Conflict 4: Contract client variable names
- **Problem**: Doc B names contract clients `payrollBatcher`, `treasury`, `employeeRegistry`, `streamVesting`, `yieldRouter`. Doc C uses the same names.
- **Resolution**: Names are identical — consistent across all documents. All contract clients are defined in `/lib/contracts.ts` and imported by name from there.

### Conflict 5: Build guide references to "PayStream"
- **Problem**: Doc B was written before the product was renamed. It contains references to "PayStream Global" and "PayStream" throughout.
- **Resolution**: Wherever Doc B says "PayStream" or "PayStream Global", read it as "Remlo". The code itself should only ever say "Remlo". Comments, strings, log messages, and UI copy all use "Remlo".

### Conflict 6: Payroll execution function name
- **Problem**: Doc A references `PayrollBatcher.executeBatchPayroll(recipients[], amounts[], memos[])`. Doc C references `PayrollBatcher.executeBatch()`.
- **Resolution**: The canonical function name from Doc B's Solidity code is `executeBatchPayroll`. Use this name everywhere — in contract code, in ABI definitions, and in all TypeScript call sites including MPP endpoints.

### Conflict 7: Pricing model
- **Problem**: Doc A (arch spec landing page) describes a SaaS subscription model ($0/mo, $199/mo, custom). Doc C describes pay-per-use MPP pricing ($0.01–$1.00 per action).
- **Resolution**: These are not in conflict — they are two separate access tiers. The landing page subscription pricing covers the **SaaS dashboard product** (employer UI, team management, automated scheduling). The MPP pricing covers the **API layer** (programmatic access by AI agents and third-party integrations). Both exist simultaneously. The landing page pricing section stays exactly as Doc A specifies. The MPP pricing is surfaced in a new "API Access" or "Developers" section on the dashboard.

---

## PART 2: CHAIN & CONTRACT CONSTANTS

These are the only authoritative values. Never invent addresses.

```typescript
// All of these belong in lib/constants.ts — import from here, never hardcode elsewhere

export const TEMPO_CHAIN_ID = 42431
export const TEMPO_RPC_URL = 'https://rpc.moderato.tempo.xyz'
export const TEMPO_EXPLORER_URL = 'https://explore.tempo.xyz'
export const TEMPO_SPONSOR_URL = 'https://sponsor.moderato.tempo.xyz'

// TIP-20 stablecoins on Moderato testnet
export const PATHUSD_ADDRESS = '0x20c0000000000000000000000000000000000000'
export const ALPHAUSD_ADDRESS = '0x20c0000000000000000000000000000000000001'
export const BETAUSD_ADDRESS  = '0x20c0000000000000000000000000000000000002'

// Protocol precompiles
export const TIP403_REGISTRY   = '0x403c000000000000000000000000000000000000'
export const TIP20_FACTORY     = '0x20Fc000000000000000000000000000000000000'
export const ACCOUNT_KEYCHAIN  = '0xAAAAAAAA00000000000000000000000000000000'
export const NONCE_PRECOMPILE  = '0x4E4F4E4345000000000000000000000000000000'

// Deployed Remlo contracts — populated after T21 (Foundry deployment)
export const PAYROLL_TREASURY_ADDRESS  = process.env.NEXT_PUBLIC_PAYROLL_TREASURY  as `0x${string}`
export const PAYROLL_BATCHER_ADDRESS   = process.env.NEXT_PUBLIC_PAYROLL_BATCHER   as `0x${string}`
export const EMPLOYEE_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_EMPLOYEE_REGISTRY as `0x${string}`
// StreamVesting and YieldRouter addresses added post-T21
```

---

## PART 3: COMPLETE ENVIRONMENT VARIABLES

All variables in one place. Never add new env vars that are not in this list without updating this file.

```bash
# ─── PUBLIC (safe in client components) ────────────────────────────────────
NEXT_PUBLIC_TEMPO_RPC=https://rpc.moderato.tempo.xyz
NEXT_PUBLIC_TEMPO_CHAIN_ID=42431
NEXT_PUBLIC_PRIVY_APP_ID=                     # from dashboard.privy.io
NEXT_PUBLIC_SUPABASE_URL=                     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=                # Supabase anon key — safe to expose
NEXT_PUBLIC_PAYROLL_TREASURY=                 # deployed PayrollTreasury address
NEXT_PUBLIC_PAYROLL_BATCHER=                  # deployed PayrollBatcher address
NEXT_PUBLIC_EMPLOYEE_REGISTRY=                # deployed EmployeeRegistry address
NEXT_PUBLIC_STREAM_VESTING=                   # deployed StreamVesting address
NEXT_PUBLIC_YIELD_ROUTER=                     # deployed YieldRouter address
NEXT_PUBLIC_APP_URL=https://remlo.app         # used for MPP session callback URLs

# ─── SERVER ONLY (never expose to client) ──────────────────────────────────
SUPABASE_SERVICE_KEY=                         # Supabase service role key
BRIDGE_API_KEY=                               # Bridge API key (sk-live-... in production)
BRIDGE_WEBHOOK_SECRET=                        # Bridge RSA webhook verification key
REMLO_TREASURY_ADDRESS=                       # Remlo platform wallet that receives MPP fees
REMLO_AGENT_PRIVATE_KEY=                      # Private key for the demo AI treasury agent
RESEND_API_KEY=                               # Email sending (Resend)
CLAUDE_API_KEY=                               # Anthropic API key for AI features
STRIPE_SECRET_KEY=                            # Stripe secret key for MPP Stripe SPT method
MPP_SECRET_KEY=                               # Random 32-byte base64 key for mppx session signing
```

---

## PART 4: FILE STRUCTURE

Complete directory tree. Every file that needs to exist is listed here. Build in this exact structure.

```
remlo/
├── REMLO_MASTER.md             ← this file — always in repo root
├── AGENT_PROGRESS.md           ← agent writes here after every task
├── .env.local                  ← all env vars from Part 3
├── package.json
├── tsconfig.json               ← strict mode
├── tailwind.config.ts
├── next.config.ts
│
├── app/
│   ├── globals.css             ← ALL CSS variables from Part 5 color tokens
│   ├── layout.tsx              ← PrivyProvider + ThemeProvider + Sonner toaster
│   │
│   ├── (public)/               ← marketing site — no auth required
│   │   ├── layout.tsx          ← PublicLayout: transparent nav + footer
│   │   ├── page.tsx            ← landing page (Sections 6.1–6.10 of arch spec)
│   │   ├── pricing/page.tsx
│   │   └── docs/page.tsx
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── invite/[token]/page.tsx
│   │   └── kyc/[token]/page.tsx
│   │
│   ├── (employer)/
│   │   ├── layout.tsx          ← EmployerLayout: sidebar + header
│   │   ├── dashboard/
│   │   │   ├── page.tsx        ← overview: treasury, last run, yield, team
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── team/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── add/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── payroll/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx      ← 4-step payroll wizard
│   │   │   │   └── [runId]/page.tsx
│   │   │   ├── treasury/
│   │   │   │   ├── page.tsx
│   │   │   │   └── deposit/page.tsx
│   │   │   ├── cards/page.tsx
│   │   │   ├── compliance/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── billing/page.tsx
│   │   │   └── api-access/page.tsx   ← NEW: MPP pricing, agent key management
│   │
│   ├── (employee)/
│   │   ├── layout.tsx          ← EmployeeLayout: top nav + bottom tabs
│   │   ├── portal/
│   │   │   ├── page.tsx
│   │   │   ├── payments/page.tsx
│   │   │   ├── card/
│   │   │   │   ├── page.tsx
│   │   │   │   └── activate/page.tsx
│   │   │   ├── wallet/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       └── offramp/page.tsx
│   │
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── admin/page.tsx
│   │   ├── admin/employers/page.tsx
│   │   ├── admin/compliance/page.tsx
│   │   └── admin/monitoring/page.tsx
│   │
│   └── api/
│       ├── employers/route.ts
│       ├── employers/[id]/team/route.ts
│       ├── employers/[id]/payroll/route.ts
│       ├── employers/[id]/treasury/route.ts
│       ├── employees/route.ts
│       ├── employees/[id]/kyc/route.ts
│       ├── employees/[id]/card/route.ts
│       ├── transactions/route.ts
│       ├── yield/route.ts
│       ├── webhooks/bridge/route.ts
│       ├── webhooks/tempo/route.ts
│       ├── ai/
│       │   ├── parse-csv/route.ts
│       │   ├── anomaly-detect/route.ts
│       │   └── compliance-explain/route.ts
│       ├── admin/route.ts
│       │
│       └── mpp/                          ← ALL MPP endpoints live here
│           ├── treasury/
│           │   ├── yield-rates/route.ts  ← MPP-1: $0.01 single charge
│           │   └── optimize/route.ts     ← MPP-10: $0.10 session charge
│           ├── payroll/
│           │   └── execute/route.ts      ← MPP-2: $1.00 single charge
│           ├── employee/
│           │   ├── advance/route.ts      ← MPP-3: $0.50 single charge
│           │   ├── [id]/history/route.ts ← MPP-8: $0.05 single charge
│           │   └── balance/stream/route.ts ← MPP-5: $0.001 SSE session
│           ├── compliance/
│           │   └── check/route.ts        ← MPP-4: $0.05 single charge
│           ├── payslips/
│           │   └── [runId]/[employeeId]/route.ts ← MPP-6: $0.02 single charge
│           ├── memo/
│           │   └── decode/route.ts       ← MPP-7: $0.01 single charge
│           ├── bridge/
│           │   └── offramp/route.ts      ← MPP-9: $0.25 single charge
│           ├── marketplace/
│           │   └── compliance-list/[employerId]/route.ts ← MPP-11: $0.50
│           └── agent/
│               └── session/treasury/route.ts ← MPP-12: $0.02 session charge
│
├── components/
│   ├── ui/                     ← shadcn primitives only
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── tabs.tsx
│   │   ├── select.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tooltip.tsx
│   │   ├── toast.tsx           ← sonner integration
│   │   ├── skeleton.tsx
│   │   ├── data-table.tsx      ← TanStack Table v8 wrapper
│   │   ├── progress.tsx
│   │   ├── avatar.tsx
│   │   └── separator.tsx
│   │
│   ├── layout/
│   │   ├── EmployerSidebar.tsx
│   │   ├── EmployerHeader.tsx
│   │   ├── EmployeeTopNav.tsx
│   │   ├── BottomTabNav.tsx
│   │   ├── PageContainer.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── EmptyState.tsx
│   │   └── ConfirmDialog.tsx
│   │
│   ├── payroll/
│   │   ├── PayrollRunCard.tsx
│   │   ├── PayrollBadge.tsx
│   │   ├── PayrollWizard.tsx
│   │   ├── PayrollStep1.tsx
│   │   ├── PayrollStep2.tsx
│   │   ├── PayrollStep3.tsx
│   │   ├── PayrollStep4.tsx
│   │   ├── BatchProgress.tsx
│   │   └── MemoDecoder.tsx
│   │
│   ├── treasury/
│   │   ├── TreasuryCard.tsx
│   │   ├── YieldCard.tsx
│   │   ├── DepositPanel.tsx
│   │   ├── TxHistoryTable.tsx
│   │   └── BalanceTicker.tsx
│   │
│   ├── employee/
│   │   ├── EmployeeTable.tsx
│   │   ├── EmployeeRow.tsx
│   │   ├── ComplianceBadge.tsx
│   │   ├── WalletStatus.tsx
│   │   ├── EmployeeOnboard.tsx
│   │   └── CSVUpload.tsx
│   │
│   ├── wallet/
│   │   ├── WalletConnect.tsx
│   │   ├── AddressDisplay.tsx
│   │   ├── TxStatus.tsx
│   │   ├── GasSponsored.tsx
│   │   └── ChainBadge.tsx
│   │
│   ├── card/
│   │   ├── VisaCardDisplay.tsx
│   │   ├── CardActivation.tsx
│   │   ├── CardTransactions.tsx
│   │   └── OffRampPanel.tsx
│   │
│   └── mpp/                    ← NEW: MPP-specific UI components
│       ├── MppSessionPanel.tsx  ← shows open session, balance, receipts
│       ├── MppReceiptBadge.tsx  ← small chip showing tx receipt per action
│       ├── AgentTerminal.tsx    ← live feed of MPP requests (demo split screen)
│       └── ApiAccessPanel.tsx   ← employer API key mgmt + pricing tiers
│
├── lib/
│   ├── constants.ts            ← all addresses and chain constants (Part 2)
│   ├── privy.ts                ← tempoChain definition + PrivyProvider config
│   ├── mpp.ts                  ← single-charge mppx server instance
│   ├── mpp-multirail.ts        ← dual-rail mppx (Tempo + Stripe SPT)
│   ├── contracts.ts            ← all viem contract instances
│   ├── supabase.ts             ← Supabase client (browser)
│   ├── supabase-server.ts      ← Supabase client (server/Edge, service key)
│   ├── bridge.ts               ← Bridge API client wrapper
│   ├── memo.ts                 ← ISO 20022 TIP-20 memo encode/decode
│   ├── abis/
│   │   ├── PayrollTreasury.ts
│   │   ├── PayrollBatcher.ts
│   │   ├── EmployeeRegistry.ts
│   │   ├── StreamVesting.ts
│   │   ├── YieldRouter.ts
│   │   └── TIP403Registry.ts
│   └── queries/
│       ├── employers.ts
│       ├── employees.ts
│       ├── payroll.ts
│       ├── compliance.ts
│       └── transactions.ts
│
├── contracts/                  ← Foundry project
│   ├── foundry.toml
│   ├── src/
│   │   ├── PayrollTreasury.sol
│   │   ├── PayrollBatcher.sol
│   │   ├── EmployeeRegistry.sol
│   │   ├── StreamVesting.sol
│   │   └── YieldRouter.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── test/
│
├── scripts/
│   └── demo-agent.ts           ← the autonomous AI treasury agent script
│
└── middleware.ts               ← auth guards + role-based routing
```

---

## PART 5: DESIGN SYSTEM TOKENS

These are the exact CSS variable definitions for `app/globals.css`. This is the only place colors are defined. Do not deviate.

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-base: #FFFFFF;
  --bg-surface: #F8FAFC;
  --bg-subtle: #F1F5F9;
  --bg-overlay: #FFFFFF;
  --border-default: #E2E8F0;
  --border-strong: #CBD5E1;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --accent: #059669;
  --accent-subtle: #D1FAE5;
  --accent-foreground: #FFFFFF;
  --status-success: #059669;
  --status-pending: #D97706;
  --status-error: #DC2626;
  --status-neutral: #64748B;
  --mono: #1D4ED8;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
}

.dark {
  --bg-base: #0A0F1E;
  --bg-surface: #0F172A;
  --bg-subtle: #1E293B;
  --bg-overlay: #1A2744;
  --border-default: #1E293B;
  --border-strong: #334155;
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --accent: #34D399;
  --accent-subtle: #064E3B;
  --accent-foreground: #0A0F1E;
  --status-success: #34D399;
  --status-pending: #FBBF24;
  --status-error: #F87171;
  --status-neutral: #94A3B8;
  --mono: #60A5FA;
}
```

**Dark mode**: Default on initial visit. Store in `localStorage` key `remlo-theme`. Apply via `dark` class on `<html>`. Landing page is always dark. Dashboard respects user preference.

**Typography**:
- Display font: Geist (via `@vercel/font/geist` or `next/font/google`)
- Mono font: IBM Plex Mono — used exclusively for wallet addresses, tx hashes, contract addresses, any on-chain identifier
- All monetary amounts use `number-xl` or `number-lg` style: Geist, 700 weight, monospace numbers

---

## PART 6: DATABASE SCHEMA (Authoritative)

The Supabase schema. Run this SQL exactly. Do not add columns without updating this master.

```sql
-- EMPLOYERS
CREATE TABLE employers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id             TEXT NOT NULL,             -- Privy user ID
  company_name              TEXT NOT NULL,
  company_size              TEXT,                      -- 1-10, 11-50, 51-200, 200+
  treasury_contract         TEXT,                      -- PayrollTreasury address
  bridge_customer_id        TEXT,                      -- Bridge KYB ID
  bridge_virtual_account_id TEXT,
  tip403_policy_id          BIGINT,
  subscription_tier         TEXT DEFAULT 'starter',    -- starter|growth|enterprise
  mpp_agent_key_hash        TEXT,                      -- SHA-256 of issued MPP agent key
  active                    BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- EMPLOYEES
CREATE TABLE employees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id         UUID REFERENCES employers(id) ON DELETE CASCADE,
  user_id             TEXT,                            -- Privy user ID (after invite)
  wallet_address      TEXT,
  email               TEXT NOT NULL,
  first_name          TEXT,
  last_name           TEXT,
  job_title           TEXT,
  department          TEXT,
  country_code        CHAR(2),
  salary_amount       NUMERIC(18,6),
  salary_currency     TEXT DEFAULT 'USD',
  pay_frequency       TEXT DEFAULT 'monthly',          -- monthly|biweekly|weekly|stream
  employee_id_hash    TEXT,                            -- SHA-256 of employee record
  bridge_customer_id  TEXT,
  bridge_card_id      TEXT,
  bridge_bank_account_id TEXT,
  kyc_status          TEXT DEFAULT 'pending',          -- pending|approved|rejected|expired
  kyc_verified_at     TIMESTAMPTZ,
  stream_contract     TEXT,                            -- StreamVesting address if streaming
  active              BOOLEAN DEFAULT true,
  invited_at          TIMESTAMPTZ,
  onboarded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- PAYROLL RUNS
CREATE TABLE payroll_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id         UUID REFERENCES employers(id),
  status              TEXT DEFAULT 'draft',            -- draft|pending|processing|completed|failed
  total_amount        NUMERIC(18,6),
  employee_count      INTEGER,
  fee_amount          NUMERIC(18,6) DEFAULT 0,
  token_address       TEXT DEFAULT '0x20c0000000000000000000000000000000000000',
  tx_hash             TEXT,
  mpp_receipt_hash    TEXT,                            -- MPP Payment-Receipt for agent-triggered runs
  block_number        BIGINT,
  finalized_at        TIMESTAMPTZ,
  settlement_time_ms  INTEGER,
  created_by          TEXT,                            -- Privy user ID or 'agent' for MPP-triggered
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENT ITEMS
CREATE TABLE payment_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id  UUID REFERENCES payroll_runs(id),
  employee_id     UUID REFERENCES employees(id),
  amount          NUMERIC(18,6) NOT NULL,
  memo_bytes      BYTEA,                               -- 32-byte TIP-20 memo
  memo_decoded    JSONB,                               -- parsed ISO 20022 fields
  status          TEXT DEFAULT 'pending',              -- pending|confirmed|failed
  tx_hash         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- COMPLIANCE EVENTS
CREATE TABLE compliance_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id   UUID REFERENCES employers(id),
  employee_id   UUID REFERENCES employees(id),
  wallet_address TEXT,                                 -- for MPP-triggered checks
  event_type    TEXT,                                  -- kyc_approved|kyc_rejected|policy_blocked|manual_flag|mpp_check
  result        TEXT,                                  -- CLEAR|BLOCKED (for MPP checks)
  risk_score    INTEGER,
  description   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- MPP SESSIONS (NEW — tracks open payment channels from agents)
CREATE TABLE mpp_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id     UUID REFERENCES employers(id),
  agent_wallet    TEXT NOT NULL,                       -- the agent's Tempo wallet
  channel_tx_hash TEXT,                                -- on-chain channel open tx
  max_deposit     NUMERIC(18,6),
  total_spent     NUMERIC(18,6) DEFAULT 0,
  status          TEXT DEFAULT 'open',                 -- open|closed|expired
  opened_at       TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  last_action     TEXT
);
```

**RLS Policies (apply in order):**
- `employers`: `owner_user_id = auth.uid()` for SELECT/UPDATE. Service role only for INSERT.
- `employees`: employer owners SELECT/UPDATE/DELETE employees WHERE `employer_id` matches. Employees SELECT their own row.
- `payroll_runs`: employer owners SELECT/INSERT/UPDATE. No employee access.
- `payment_items`: employer owners SELECT all. Employees SELECT WHERE `employee_id` matches their own.
- `compliance_events`: employer owners SELECT only. No employee access. Service role INSERT.
- `mpp_sessions`: employer owners SELECT their own sessions. Service role INSERT/UPDATE.

---

## PART 7: SMART CONTRACTS (Authoritative)

Five contracts. Deploy with Foundry (`foundryup -n tempo`). The Solidity below is the canonical source — do not modify function signatures or the ABIs will drift.

### Foundry setup
```bash
foundryup -n tempo
forge init -n tempo remlo-contracts && cd remlo-contracts
# Local devnet:
anvil --tempo --hardfork t1
# Fork testnet:
anvil --tempo --fork-url https://rpc.moderato.tempo.xyz
# Fund test address:
cast rpc tempo_fundAddress 0xYOUR_ADDRESS --rpc-url https://rpc.moderato.tempo.xyz
# Deploy:
export VERIFIER_URL=https://contracts.tempo.xyz
forge create src/PayrollTreasury.sol:PayrollTreasury \
  --rpc-url $TEMPO_RPC_URL --interactive --broadcast --verify
```

### PayrollTreasury.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ITIP20} from "tempo-std/interfaces/ITIP20.sol";

contract PayrollTreasury {
    struct EmployerAccount {
        uint256 balance;
        uint256 gasBudget;
        uint64 policyId;
        address admin;
        bool active;
    }
    mapping(bytes32 => EmployerAccount) public employers;
    ITIP20 public immutable payToken;

    function deposit(uint256 amount, bytes32 memo) external {
        payToken.transferFromWithMemo(msg.sender, address(this), amount, memo);
        employers[keccak256(abi.encodePacked(msg.sender))].balance += amount;
    }
    function fundGasBudget(uint256 amount) external {
        payToken.transferFrom(msg.sender, address(this), amount);
        employers[keccak256(abi.encodePacked(msg.sender))].gasBudget += amount;
    }
    function getAvailableBalance(bytes32 employerId) external view returns (uint256) {
        return employers[employerId].balance;
    }
    function getLockedBalance(bytes32 employerId) external view returns (uint256) {
        // Returns amount locked in pending payroll runs
        return employers[employerId].lockedBalance;
    }
}
```

### PayrollBatcher.sol
```solidity
contract PayrollBatcher {
    function executeBatchPayroll(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata memos
    ) external onlyAuthorizedAgent {
        require(recipients.length == amounts.length && amounts.length == memos.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            payToken.transferWithMemo(recipients[i], amounts[i], memos[i]);
        }
        emit PayrollBatchExecuted(msg.sender, recipients.length, block.timestamp);
    }
}
```

### EmployeeRegistry.sol
```solidity
contract EmployeeRegistry {
    struct Employee {
        address wallet;
        bytes32 employerId;
        uint64 policyId;
        bytes32 employeeIdHash;
        bool active;
    }
    mapping(address => Employee) public employees;
    address public tip403Registry = 0x403c000000000000000000000000000000000000;

    function registerEmployee(address wallet, bytes32 employerId, bytes32 employeeIdHash)
        external onlyEmployerAdmin(employerId) {
        (bool authorized) = ITIP403(tip403Registry).isAuthorized(
            employers[employerId].policyId, wallet
        );
        require(authorized, "wallet fails compliance check");
        employees[wallet] = Employee(wallet, employerId, employers[employerId].policyId, employeeIdHash, true);
    }
    function getWallet(bytes32 employeeId) external view returns (address) {
        // Returns wallet address for given employee ID hash
    }
    function getEmployeeCount(bytes32 employerId) external view returns (uint256) {}
}
```

### StreamVesting.sol
```solidity
contract StreamVesting {
    struct VestingStream {
        address employer; address employee;
        uint256 totalAmount; uint256 released;
        uint64 startTime; uint64 endTime; uint64 cliffEnd;
        bytes32 payrollMemo;
    }
    mapping(uint256 => VestingStream) public streams;

    function release(uint256 streamId) external {
        VestingStream storage s = streams[streamId];
        require(block.timestamp >= s.cliffEnd, "cliff not reached");
        uint256 vested = (s.totalAmount * (block.timestamp - s.startTime)) / (s.endTime - s.startTime);
        uint256 releasable = vested - s.released;
        s.released += releasable;
        payToken.transferWithMemo(s.employee, releasable, s.payrollMemo);
    }
    function getAccruedBalance(address employee) external view returns (uint256) {}
    function claimAccrued(address employee) external returns (bytes32 txHash) {}
}
```

### YieldRouter.sol
```solidity
contract YieldRouter {
    enum YieldModel { EMPLOYER_KEEPS, EMPLOYEE_BONUS, SPLIT }
    struct YieldConfig {
        YieldModel model;
        uint16 employeeSplitBps;
        address yieldStrategy;
    }
    mapping(bytes32 => YieldConfig) public yieldConfig;

    function depositToYield(bytes32 employerId, uint256 amount) external {}
    function distributeYield(bytes32 employerId) external {}
    function getCurrentAPY() external view returns (uint256) {}
    function getYieldSources() external view returns (address[] memory) {}
    function getAllocation() external view returns (uint256[] memory) {}
    function rebalance(bytes32 employerId, uint256[] calldata targetAllocation) external {}
}
```

### ISO 20022 Memo Encoding (32 bytes)
```
Bytes 0–3:   Message type      "paic" = 0x70616963 (pain.001)
Bytes 4–11:  Employer ID       8 bytes
Bytes 12–19: Employee ID       8 bytes
Bytes 20–23: Pay period        YYYYMMDD packed (e.g. 0x07F60301 = 2026-03-01)
Bytes 24–27: Cost center       4 bytes
Bytes 28–31: Record hash       truncated SHA-256 of full payroll record
```
Encode/decode logic lives in `lib/memo.ts`. All payment history views use `MemoDecoder` component.

---

## PART 8: MPP LAYER (Authoritative)

### Core setup files

**`lib/mpp.ts`** — single-charge server instance
```typescript
import { Mppx, tempo } from 'mppx/nextjs'

export const mppx = Mppx.create({
  methods: [tempo({
    currency: '0x20c0000000000000000000000000000000000000', // pathUSD
    recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
  })],
})
```

**`lib/mpp-multirail.ts`** — dual-rail (Tempo + Stripe SPT)
```typescript
import crypto from 'crypto'
import { Mppx, tempo, stripe } from 'mppx/server'

export const mppxMultiRail = Mppx.create({
  methods: [
    tempo({
      currency: '0x20c0000000000000000000000000000000000000',
      recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
    }),
    stripe.charge({
      networkId: 'internal',
      paymentMethodTypes: ['card', 'link'],
      secretKey: process.env.STRIPE_SECRET_KEY!,
    }),
  ],
  secretKey: process.env.MPP_SECRET_KEY!,
})
```

Use `mppx` (single-rail) for all 12 MPP endpoints by default.  
Use `mppxMultiRail` only on endpoints explicitly listed in Phase 6 (T-MPP-7 onwards) where Stripe fallback is added.

### The 12 MPP endpoints — pricing and pattern reference

| # | Route | Method | Charge | Type | Payer | Contract/Data |
|---|-------|--------|--------|------|-------|----------------|
| 1 | `/api/mpp/treasury/yield-rates` | GET | $0.01 | single | AI agent | YieldRouter: `getYieldSources`, `getCurrentAPY` |
| 2 | `/api/mpp/payroll/execute` | POST | $1.00 | single | AI agent | PayrollBatcher: `executeBatchPayroll` + Supabase |
| 3 | `/api/mpp/employee/advance` | POST | $0.50 | single | Employee | StreamVesting: `claimAccrued` |
| 4 | `/api/mpp/compliance/check` | POST | $0.05 | single | Employer/auditor | TIP-403 Registry + compliance_events |
| 5 | `/api/mpp/employee/balance/stream` | GET | $0.001/tick | SSE session | Employee/agent | StreamVesting: `getAccruedBalance` |
| 6 | `/api/mpp/payslips/[runId]/[employeeId]` | GET | $0.02 | single | Employee/employer | payment_items + payroll_runs |
| 7 | `/api/mpp/memo/decode` | POST | $0.01 | single | Auditor/employer | On-chain TIP-20 memo data via Viem |
| 8 | `/api/mpp/employee/[id]/history` | GET | $0.05 | single | Employee/agent | payment_items + payroll_runs |
| 9 | `/api/mpp/bridge/offramp` | POST | $0.25 | single | Employee | Bridge API transfer endpoint |
| 10 | `/api/mpp/treasury/optimize` | POST | $0.10 | session | Employer agent | YieldRouter + PayrollTreasury |
| 11 | `/api/mpp/marketplace/compliance-list/[employerId]` | GET | $0.50 | single | Employer | compliance_events table |
| 12 | `/api/mpp/agent/session/treasury` | POST | $0.02 | session | AI agent | All contracts: balance, yield, rebalance, headcount |

**Session mechanic summary**: Sessions lock PathUSD on-chain once, then use off-chain signed vouchers for all subsequent actions. Vouchers are cumulative and CPU-verified (no blockchain calls). The server emits `payment-need-voucher` SSE events when the channel balance depletes. The client auto-signs new vouchers. `session.close()` returns unspent funds. Use sessions for endpoints 5, 10, and 12 only.

### Demo agent script (`scripts/demo-agent.ts`)
The autonomous AI treasury agent. Runs this workflow:
1. Open MPP session with `maxDeposit: '5.00'`
2. Query yield rates (MPP-1, $0.01)
3. Query treasury balance via agent session (MPP-12, $0.02)
4. Run compliance check on 5 employees (MPP-4, $0.05 × 5 = $0.25)
5. Execute payroll batch (MPP-2, $1.00)
6. Initiate streaming salary SSE (MPP-5, session)
7. Close session — total spent ≈ $1.33, unspent returned

This script is the 60-second demo. It runs against production endpoints on Tempo Moderato testnet.

---

## PART 9: BRIDGE API (Authoritative)

All Bridge calls go through Next.js API routes. Never call Bridge from client components.

**Base URL**: `https://api.bridge.xyz/v0/` (production) / `https://api.sandbox.bridge.xyz/v0/` (sandbox)  
**Auth**: `Api-Key: ${process.env.BRIDGE_API_KEY}` header  
**Rate limit**: 2,000 requests / 5 minutes  
**Idempotency**: Add `Idempotency-Key` header on all POST requests

```typescript
// lib/bridge.ts — all Bridge calls go through this client
const BRIDGE_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api.bridge.xyz/v0'
  : 'https://api.sandbox.bridge.xyz/v0'

async function bridgeRequest(path: string, options?: RequestInit) {
  const res = await fetch(`${BRIDGE_BASE}${path}`, {
    ...options,
    headers: {
      'Api-Key': process.env.BRIDGE_API_KEY!,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`Bridge API ${res.status}: ${await res.text()}`)
  return res.json()
}
```

**Core endpoints used by Remlo:**

| Operation | Endpoint | Called from |
|-----------|----------|-------------|
| Employer KYB | `POST /v0/customers` (type: business) | `api/employers` route |
| Employee KYC link | `POST /v0/kyc_links` | `api/employees/[id]/kyc` |
| Virtual account (deposit) | `POST /v0/customers/{id}/virtual_accounts` | `api/employers/[id]/treasury` |
| Visa card issuance | `POST /v0/customers/{id}/card_accounts` | `api/employees/[id]/card` |
| Off-ramp transfer | `POST /v0/transfers` (bridge_wallet → ach/sepa/spei/pix) | `api/mpp/bridge/offramp` (MPP-9) |
| Webhook registration | `POST /v0/webhooks` | Setup script |

**USDB yield**: ~3.7% APY from US Treasuries via BlackRock money market funds. Conversions USDB ↔ USDC are free. Use USDB for employer treasury deposits to maximize yield capture.

**Card coverage**: Argentina, Colombia, Ecuador, Mexico, Peru, Chile (expanding to EU, Africa, Asia). Employees in these regions get Visa Prepaid Debit cards; others get direct bank off-ramp only.

---

## PART 10: PRIVY WALLET LAYER

```typescript
// lib/privy.ts — single source of truth for chain + wallet config

export const tempoChain = {
  id: 42431,
  name: 'Tempo Moderato',
  network: 'tempo-moderato',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
  blockExplorers: { default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' } },
}

// PrivyProvider config — add to app/layout.tsx
export const privyConfig = {
  defaultChain: tempoChain,
  supportedChains: [tempoChain],
  loginMethods: ['email', 'sms', 'passkey'] as const,
  appearance: { theme: 'dark' as const, accentColor: '#059669' },
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
    requireUserPasswordOnCreate: false,
  },
}
```

**Gasless transactions**: Use Tempo's public sponsor at `https://sponsor.moderato.tempo.xyz` for testnet. Employer pre-deposits gas budget into PayrollTreasury for production fee sponsorship. TempoTransaction Type `0x76` with `feePayer` field set to employer sponsorship wallet. Employees pay zero gas for any action.

**TempoTransaction call batching**: Use `type: 'tempo'` in Viem `sendTransaction` with `calls: [...]` field to batch `approve + executeBatchPayroll` atomically in one transaction.

---

## PART 11: AI FEATURES

All AI calls go through Next.js API routes using the Anthropic Claude API. Never call the Claude API from client components.

| Feature | Priority | Route | System prompt focus |
|---------|----------|-------|---------------------|
| Smart CSV import | P0 | `api/ai/parse-csv` | Maps messy CSV headers to employee schema fields |
| Payment memo parser | P0 | Built into `lib/memo.ts` | Client-side — no Claude needed, pure bit manipulation |
| Payroll anomaly detection | P1 | `api/ai/anomaly-detect` | Flags >2× previous amount, new employee first payment, blocked wallet |
| Compliance explanation | P1 | `api/ai/compliance-explain` | Explains TIP-403 block reason in plain English |
| Treasury optimization | P2 | `api/mpp/treasury/optimize` (MPP-10) | Yield strategy recommendations — also MPP-gated |

```typescript
// Standard Claude API call pattern for all AI routes
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.CLAUDE_API_KEY!,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: '<specific system prompt for each feature>',
    messages: [{ role: 'user', content: '<feature-specific payload>' }],
  }),
})
```

---

## PART 12: AUTH MIDDLEWARE

```typescript
// middleware.ts
// Role detection: Supabase auth session + employer/employee table lookup
// Redirect rules:
//   Unauthenticated           → /login (except public routes)
//   role: employer_admin      → /dashboard
//   role: employer_operator   → /dashboard
//   role: employee            → /portal
//   role: platform_admin      → /admin
//   Authenticated hitting /   → redirect to role-appropriate home
```

---

## PART 13: COMPLETE TASK LIST WITH DEPENDENCIES

56 tasks total (48 original + 8 MPP). Build in exact order. Do not skip. [BLOCKER] tasks must complete before any dependent task starts.

### PHASE 0: Foundation (T01–T05)

| Task | Description | Files | Depends |
|------|-------------|-------|---------|
| **T01** [BLOCKER] | Next.js 15 project. TypeScript strict. Tailwind 3.4+. App Router. | `/package.json`, `/tsconfig.json`, `/tailwind.config.ts` | — |
| **T02** [BLOCKER] | CSS variables from Part 5. Geist + IBM Plex Mono via `next/font`. Dark mode class toggle. `remlo-theme` localStorage key. **READ `/mnt/skills/public/frontend-design/SKILL.md` FIRST.** | `/app/globals.css`, `/app/layout.tsx` | T01 |
| **T03** [BLOCKER] | `npx shadcn@latest init`. Add all components listed in Part 4 `/components/ui/`. Apply Remlo tokens to each. | `/components/ui/*` | T02 |
| **T04** [BLOCKER] | Supabase project. Run SQL schema from Part 6. Apply RLS from Part 6. Create `lib/supabase.ts` (client) + `lib/supabase-server.ts` (server). | `/lib/supabase.ts`, `/lib/supabase-server.ts` | T01 |
| **T05** [BLOCKER] | Install `@privy-io/react-auth`. Create `lib/privy.ts` (Part 10). Add PrivyProvider to `app/layout.tsx`. | `/lib/privy.ts`, `/app/layout.tsx` | T01 |

### PHASE 1: Auth Layer (T06–T09)

| Task | Description | Files | Depends |
|------|-------------|-------|---------|
| T06 | `middleware.ts` role-based routing guards (Part 12). | `/middleware.ts` | T04, T05 |
| T07 | Login page `/login`. Privy email/SMS/passkey. Split layout: brand left, form right. OTP flow. **READ frontend-design skill.** | `/app/(auth)/login/page.tsx` | T05, T06 |
| T08 | Invite acceptance `/invite/[token]`. Verify token in Supabase, redirect to Privy auth, create wallet, update employee.wallet_address. | `/app/(auth)/invite/[token]/page.tsx` | T07 |
| T09 | Employer registration wizard `/register`. Company name, size, email. Create employer record. Redirect to `/dashboard`. | `/app/(auth)/register/page.tsx` | T07 |

### PHASE 2: Layout Shells (T10–T13)

| Task | Description | Files | Depends |
|------|-------------|-------|---------|
| T10 | EmployerLayout. EmployerSidebar (240px, collapses to 64px icon-only at <1280px, hidden at <768px with hamburger). EmployerHeader (breadcrumb + search + notifications + user menu). **READ frontend-design skill.** | `/app/(employer)/layout.tsx`, `/components/layout/EmployerSidebar.tsx`, `/components/layout/EmployerHeader.tsx` | T03, T06 |
| T11 | EmployeeLayout. EmployeeTopNav + BottomTabNav (mobile, 4 tabs). Max-640px content. | `/app/(employee)/layout.tsx`, `/components/layout/EmployeeTopNav.tsx`, `/components/layout/BottomTabNav.tsx` | T03, T06 |
| T12 | EmptyState, PageContainer, SectionHeader, ConfirmDialog layout components. | `/components/layout/*.tsx` | T03 |
| T13 | `loading.tsx` (skeleton screens) + `error.tsx` (error boundary + retry) for all major routes. | `/app/(employer)/dashboard/loading.tsx`, equivalents for employee | T10, T11 |

### PHASE 3: Domain Components (T14–T20)

| Task | Description | Key components | Depends |
|------|-------------|----------------|---------|
| T14 | Wallet/blockchain display components. AddressDisplay (IBM Plex Mono, truncated `0x1234...5678`, copy + explorer). TxStatus (animated "Confirming..." → "Confirmed in 0.4s"). GasSponsored chip. ChainBadge. | `/components/wallet/*.tsx` | T05 |
| T15 | Status components. ComplianceBadge (green/amber/red + tooltip). WalletStatus. PayrollBadge. | `/components/employee/ComplianceBadge.tsx` etc. | T03 |
| T16 | DataTable with TanStack Table v8. Sort, filter, column visibility, pagination, row select. | `/components/ui/DataTable.tsx` | T03 |
| T17 | EmployeeTable with all columns: avatar+name, country flag, job title, salary, wallet status, compliance, last paid, actions. Row click → `/dashboard/team/[id]`. | `/components/employee/EmployeeTable.tsx` | T16 |
| T18 | TreasuryCard (animated number counter, available vs locked). YieldCard (APY badge, earned, model selector). DepositPanel (bank account + routing number, copy buttons). BalanceTicker (per-second ticking counter). **READ frontend-design skill.** | `/components/treasury/*.tsx` | T03 |
| T19 | VisaCardDisplay (stylized card, last 4 digits, status). CardTransactions (table, merchant + category icon). OffRampPanel (sheet: amount input, bank account, Bridge transfer). | `/components/card/*.tsx` | T03 |
| T20 | MemoDecoder: `lib/memo.ts` ISO 20022 decode logic (32-byte field parsing per Part 7 schema). MemoDecoder component. | `/lib/memo.ts`, `/components/payroll/MemoDecoder.tsx` | T01 |

### PHASE 4: Backend API Routes (T21–T26)

| Task | Description | Files | Depends |
|------|-------------|-------|---------|
| **T21** [BLOCKER] | Deploy all 5 contracts to Tempo Moderato testnet with Foundry. Use contract code from Part 7. Output: 5 addresses. Update `.env.local` and `lib/constants.ts`. Record addresses in `AGENT_PROGRESS.md`. | `contracts/*`, `lib/constants.ts`, `.env.local` | T01 |
| T22 | `lib/contracts.ts` — all 5 viem contract instances using addresses from `lib/constants.ts` and ABIs from `lib/abis/*.ts`. | `/lib/contracts.ts`, `/lib/abis/*.ts` | T21 |
| T23 | `/api/employers` POST: create employer, save to Supabase. `/api/employers/[id]/team` GET/POST. | `app/api/employers/**` | T04, T22 |
| T24 | `/api/employees` POST: create employee record, trigger Bridge KYC link, send invite email via Resend. `/api/employees/[id]/kyc` POST. | `app/api/employees/**` | T23 |
| **T24.5** [BLOCKER] | Install `mppx`. Create `lib/mpp.ts` and `lib/mpp-multirail.ts` from Part 8. Run `npx mppx account create` and fund test wallet. Verify 402 challenge/response works with a test endpoint. | `/lib/mpp.ts`, `/lib/mpp-multirail.ts` | T01 |
| **T25** [BLOCKER] | `/api/employers/[id]/payroll` POST: validates treasury balance >= total, validates all employee wallets pass TIP-403, builds and returns unsigned `executeBatchPayroll` calldata. | `app/api/employers/[id]/payroll/route.ts` | T22, T23 |
| T26 | `/api/webhooks/bridge` POST: verify Bridge RSA signature, handle transfer/kyc/card events, update Supabase. `/api/webhooks/tempo` POST: handle block confirmation events. | `app/api/webhooks/**` | T04 |
| T27 | `/api/transactions` GET: query payment_items with decoded memos, paginated. `/api/yield` GET: yield earned from YieldRouter contract. | `app/api/transactions/route.ts`, `app/api/yield/route.ts` | T04, T22 |

### PHASE 5: MPP Endpoints (T-MPP-1 to T-MPP-8)

All MPP endpoint code is defined in Part 8. Build in this exact order.

| Task | Route | Charge | Pattern | Depends |
|------|-------|--------|---------|---------|
| **T-MPP-1** | `GET /api/mpp/treasury/yield-rates` | $0.01 | `mppx.charge({ amount: '0.01' })` wrapping YieldRouter reads | T24.5, T22 |
| **T-MPP-2** | `POST /api/mpp/compliance/check` | $0.05 | `mppx.charge({ amount: '0.05' })` wrapping TIP-403 + compliance_events insert | T24.5, T22 |
| **T-MPP-3** | `POST /api/mpp/payroll/execute` | $1.00 | `mppx.charge({ amount: '1.00' })` wrapping PayrollBatcher.executeBatchPayroll | T24.5, T25 |
| **T-MPP-4** | `POST /api/mpp/employee/advance` | $0.50 | `mppx.charge({ amount: '0.50' })` wrapping StreamVesting.claimAccrued | T24.5, T22 |
| **T-MPP-5** | `GET /api/mpp/employee/balance/stream` | $0.001/tick SSE | Manual mode mppx — SSE stream + session voucher pattern (Part 8) | T24.5, T22 |
| **T-MPP-6** | `POST /api/mpp/agent/session/treasury` | $0.02 session | Session-based multi-action handler: balance/yield/rebalance/headcount switch | T24.5, T22 |
| **T-MPP-7** | Remaining 6 endpoints (payslip, memo decode, history, offramp, optimize, marketplace) | per Part 8 table | Add Stripe SPT fallback via `mppxMultiRail` on payroll execute + offramp | T-MPP-1 through T-MPP-6 |
| **T-MPP-8** | `scripts/demo-agent.ts` — the autonomous AI treasury agent script (full workflow from Part 8 demo section). Record expected terminal output. | `/scripts/demo-agent.ts` | T-MPP-1 through T-MPP-7 |

### PHASE 6: Employer Dashboard Pages (T28–T35)

| Task | Route | Notes | Depends |
|------|-------|-------|---------|
| T28 | `/dashboard` | Overview: 4 metric cards + recent runs + compliance donut + treasury chart. Use Recharts BarChart. Wire to real contract data. **READ frontend-design skill.** | T10, T18 |
| T29 | `/dashboard/team` | EmployeeTable, CSV upload modal with column mapper + validation. | T17 |
| T30 | `/dashboard/team/[id]` | 3-tab layout: Overview / Payment History / Compliance. | T29 |
| T31 | `/dashboard/payroll/new` | 4-step PayrollWizard. Steps 1-3 pure UI. Step 4 executes TempoTransaction Type 0x76 with call batching via Privy. BatchProgress component. Confetti on success. | T25 |
| T32 | `/dashboard/treasury` | TreasuryCard + YieldCard + DepositPanel (Bridge virtual account). Wire DepositPanel to `/api/employers/[id]/treasury`. | T18, T23 |
| T33 | `/dashboard/compliance` | Summary cards + TIP-403 policy panel + compliance table + audit log. | T26 |
| T34 | `/dashboard/api-access` | NEW: MPP pricing display, agent key management, session history from mpp_sessions table, live feed of recent MPP receipts. | T-MPP-1 |
| T35 | Wire all dashboard pages to real API data. Replace all mock data. | All dashboard pages | T23–T27 |

### PHASE 7: Employee Portal (T36–T41)

| Task | Route | Notes | Depends |
|------|-------|-------|---------|
| T36 | `/portal` | Balance card + last payment + quick actions. BalanceTicker if streaming enabled. | T11, T27 |
| T37 | `/portal/payments` | Card list per payment (not table). Expandable detail with TxStatus, decoded memo, payslip PDF download. | T27 |
| T38 | `/portal/card` | VisaCardDisplay + CardTransactions + OffRampPanel. "Transfer to Bank" triggers MPP-9. | T19 |
| T39 | `/portal/settings` | 4 sections: Profile / Bank Account / Notifications / Security. Bridge bank account connection. | T11 |
| T40 | Wire employee portal to real Supabase + Bridge data. | All portal pages | T36–T39 |
| T41 | BalanceTicker real-time streaming component (StreamVesting SSE) if streaming salary enabled. | `/components/treasury/BalanceTicker.tsx` | T36 |

### PHASE 8: MPP UI Components (T-MPP-UI-1 to T-MPP-UI-3)

| Task | Component | Notes | Depends |
|------|-----------|-------|---------|
| T-MPP-UI-1 | `MppSessionPanel.tsx` + `MppReceiptBadge.tsx` | Session open state, balance remaining, per-action receipt chips. Shown in `/dashboard/api-access`. | T-MPP-1 |
| T-MPP-UI-2 | `AgentTerminal.tsx` | Split-screen demo terminal. Left: scrolling MPP request/receipt log. Right: dashboard state updating. WebSocket or polling from `/api/mpp-events`. Essential for demo. **READ frontend-design skill.** | T-MPP-8 |
| T-MPP-UI-3 | `ApiAccessPanel.tsx` | Employer-facing: pricing table (reads/operations/premium tiers), "Generate Agent Key", session history. | T34 |

### PHASE 9: Landing Page (T42–T45)

**READ `/mnt/skills/public/frontend-design/SKILL.md` before any task in this phase.**

| Task | Section | Notes | Depends |
|------|---------|-------|---------|
| T42 | PublicLayout + Navbar | Transparent-to-solid on scroll. Logo + nav links + CTAs. Mobile hamburger full-screen menu. | T02 |
| T43 | Hero + Problem + Solution (Sections 6.2–6.4) | Animated mesh gradient background (emerald + indigo). Framer Motion staggered reveal. Hero stat counter animation (1200ms). | T42 |
| T44 | How It Works + Comparison Table + Testimonials + Pricing + FAQ (Sections 6.5–6.9) + Footer (6.10) | Full comparison table with Remlo accent column. Pricing shows 3 tiers from arch spec. | T42 |
| T45 | Animation pass. Scroll-triggered reveals. Number counters. Hero visual. Mesh gradient. All Framer Motion variants. | Landing page animations | T43, T44 |

### PHASE 10: Polish + Demo Prep (T46–T48)

| Task | Description | Priority |
|------|-------------|----------|
| T46 | End-to-end test: register employer → add employee via CSV → deposit treasury via Bridge sandbox → run payroll → employee views decoded memo → run demo agent script end-to-end. | CRITICAL |
| T47 | Mobile responsive pass at 375px, 768px, 1280px. Fix all overflow/layout issues. Bottom tab nav on mobile employee portal. | HIGH |
| T48 | Dark mode audit: verify all components render correctly in dark mode. Check every color token. Lighthouse score > 90. React.lazy heavy components. | HIGH |

---

## PART 14: DEMO SCRIPT (60 seconds)

This is the exact sequence for the hackathon demo. Memorize it. Rehearse it 5 times.

**Opening line**: "The average CFO paid $47 to wire a salary to a contractor in the Philippines last week. It took 4 days. We just paid 47 contractors in 0.4 seconds for $0.47 total. An AI agent did it. Let me show you."

**[0–10s]** Open `AgentTerminal` split screen. Agent opens MPP session with `maxDeposit: '5.00'` — dashboard shows "Session Opened" event + channel deposit tx on Tempo Explorer.

**[10–20s]** Agent queries yield rates via MPP-1 ($0.01). Dashboard shows 3.6% APY. Agent queries treasury balance via MPP-12 — $47,250 available, $12,750 locked.

**[20–35s]** Agent runs TIP-403 compliance check on 5 employees via MPP-4 ($0.25 total). All clear. Agent triggers payroll execution via MPP-2 ($1.00). Dashboard shows 5 employees paid in 0.41 seconds via PayrollBatcher. MPP receipt hash appears next to tx hash.

**[35–50s]** StreamVesting kicks in. BalanceTicker shows employee's balance incrementing every second. $0.0031 per tick. The number visibly moves. "That employee is earning right now."

**[50–60s]** Agent closes session. Dashboard: $1.33 charged across 12 MPP actions. $3.67 unspent returned. Total on-chain txs: 3 (session open, payroll batch, session close). Everything else: off-chain vouchers.

**Closing line**: "An AI agent managed an entire payroll cycle — compliance screening, yield optimization, batch execution, real-time salary streaming — paying for every action via HTTP 402. No API keys. No subscriptions. No invoices. Just machines paying machines to move real money to real people."

---

## PART 15: WHAT JUDGES CARE ABOUT

These are the Tempo hackathon judging criteria mapped to Remlo's specific differentiators:

| Criterion | Remlo's answer |
|-----------|---------------|
| **Innovation** | First enterprise B2B product on MPP. AI agents paying to run payroll. None of Tempo's 15 suggested ideas touch this. |
| **Design & Implementation** | Stripe dashboard aesthetic. Institutional finance feel. Chain abstraction — employee never touches crypto. Privy embedded wallets. Gasless UX. |
| **Presentation** | The 60-second demo in Part 14. Split screen. Live numbers moving. Specific dollar amounts. A story any CFO understands. |
| **Future Potential** | $222B cross-border payments market. 1 in 4 companies already paying in crypto. GENIUS Act tailwind. Yield on idle treasury turns Remlo into a financial product. |
| **Tempo-native** | Uses TIP-20 memo fields, TIP-403 policy registry, TempoTransaction fee sponsorship + call batching, Payment Lanes, 2D nonces, Simplex BFT finality. Every Tempo primitive is used. |
| **MPP** | 12 MPP endpoints. Three pricing tiers. Sessions. SSE streaming. Dual-rail Stripe fallback. Autonomous agent lifecycle. |

---

## PART 16: COMMON MISTAKES — DO NOT MAKE THESE

1. **Using PayStream anywhere** — the product is Remlo. Search and destroy any occurrence.
2. **Skipping the frontend-design skill** — Remlo must look like Stripe Dashboard, not a hackathon demo. The skill is mandatory.
3. **Inlining ABIs** — all ABIs in `lib/abis/*.ts`. Import from there.
4. **Inlining Supabase queries** — all queries in `lib/queries/*.ts`. Import from there.
5. **Calling Bridge API from client components** — server API routes only.
6. **Using hardcoded hex colors** — CSS variables only via `var(--token-name)`.
7. **Showing wallet addresses to non-crypto users by default** — advanced mode toggle (Part 7 of arch spec §9.5). Default OFF.
8. **Using Ethereum terminology in UI copy** — "pay" not "transfer", "account" not "wallet", "confirmed" not "mined", "speed" not "gas price".
9. **Building MPP endpoints before T24.5 is done** — T24.5 must verify the basic 402 challenge/response works before any MPP endpoint is written.
10. **Building Hono routes** — everything is Next.js App Router. Hono patterns in Doc C are reference syntax only.

---

*REMLO_MASTER.md — single source of truth for all Claude Code sessions. Version 1.0, March 2026.*
*Whenever you see any contradiction between this file and the three source documents, this file wins.*
