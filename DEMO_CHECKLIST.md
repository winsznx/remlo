# Remlo — 60-Second Demo Checklist

> **Setup**: `pnpm dev` running on `http://localhost:3000`. Open in Chrome. Use a second terminal for the agent script.

---

## Pre-Demo (30s before)

- [ ] `pnpm dev` running, no console errors
- [ ] Chrome open at `http://localhost:3000` — landing page visible (dark, animated mesh gradient)
- [ ] Terminal ready: `npx ts-node scripts/demo-agent.ts`
- [ ] Second browser tab open at `http://localhost:3000/dashboard/demo`

---

## Demo Flow

### 1. Landing Page — `http://localhost:3000`
**Expected state:**
- Dark background (`#0A0F1E`) with animated emerald/indigo mesh gradient orbs
- Hero: "Pay anyone, anywhere. Settle in half a second." — "half a second" in accent green
- 3 stat chips: `< 0.5s settlement`, `$0 wire fees`, `150+ countries`
- "Start free" and "View API docs" CTAs visible

**Scroll to:**
- Problem section: red `$47 wire cost`, `4 days`, `6.2% FX fees` with animated counters
- How It Works: 4-step flow (01 Employer Deposits → 02 AI Runs Payroll → 03 Smart Contract Batch → 04 Employee Receives)
- Pricing: 3-tier cards, Growth "Most Popular" highlighted with accent border

---

### 2. Auth / Login — `http://localhost:3000/login`
**Expected state:**
- Centered card with Remlo logo
- "Continue with email" / wallet connect options (Privy)
- Clean dark surface with border-default

---

### 3. Employer Dashboard Home — `http://localhost:3000/dashboard`
**Expected state:**
- Left sidebar: Remlo logo, nav links (Overview, Team, Payroll, Treasury, Compliance, API Access, Demo)
- 4 MetricTiles: Treasury Balance / Total Paid / Team Size / Avg Settlement
- Last 5 payroll runs list (mock data: 2–3 "Completed" runs)
- Recharts bar chart (30-day payment volume)
- Compliance donut (green/neutral)

---

### 4. Team Page — `http://localhost:3000/dashboard/team`
**Expected state:**
- Table: 3 mock employees (Sofia Mendez, James Okonkwo, Priya Sharma)
- Status badges: 2× "Approved" (green), 1× "Pending" (yellow)
- "Add Employee" + "Upload CSV" buttons in header
- Table scrolls horizontally on narrow viewport

**Actions to show:**
- Click "Upload CSV" → 4-step modal (drag-drop → column map → preview → done)
- Click employee row → navigates to `/dashboard/team/emp-1`

---

### 5. Employee Detail — `http://localhost:3000/dashboard/team/emp-1`
**Expected state:**
- 3-tab layout: Overview / Payment History / Compliance
- **Overview tab**: wallet address (truncated, font-mono), $95,000/yr salary, VisaCard display (front face), bridge bank account section
- **Payment History tab**: TxStatus chip + MemoDecoder with ISO 20022 fields decoded
- **Compliance tab**: TIP-403 status "CLEAR", policy ID, authorized wallet badge, audit log

---

### 6. Run Payroll Wizard — `http://localhost:3000/dashboard/payroll/new`
**Expected state:**
- 4-step wizard with animated `StepBar`
- Step 1 "Select Employees": 3 checkboxes (Sofia, Priya, Carlos)
- Step 2 "Edit Amounts": editable salary amounts with running total
- Step 3 "Review": read-only summary, total amount, recipient count
- Step 4 "Execute": BatchProgress component — 4 steps animate through signing → submitting → confirming → ✓ success

**Actions to show:**
- Select all → Next → Next → "Run Payroll" → watch BatchProgress animate to success
- Success state: confetti, tx hash link to Tempo Explorer, "Settled in 0.4s"

---

### 7. Treasury Page — `http://localhost:3000/dashboard/treasury`
**Expected state:**
- TreasuryCard: available balance + locked balance
- DepositPanel: wire instructions (IBAN, routing, SWIFT)
- YieldCard: current APY% (from YieldRouter), accrued yield counter
- TxHistoryTable: paginated history with type badges (Deposit/Payroll/Yield)

---

### 8. API Access + Agent Terminal — `http://localhost:3000/dashboard/api-access`
**Expected state:**
- 3-tier MPP pricing table (Micro-reads at $0.01, Operations at $0.50–$1.00, Premium at $0.50)
- AgentKeyPanel: "Generate API Key" button (800ms fake delay), copy-to-clipboard
- AgentTerminal: macOS-style terminal with "Run Demo" button
- Click "Run Demo" → terminal animates through 8 DEMO_LINES with type-colored output

---

### 9. Split-Screen Demo Page — `http://localhost:3000/dashboard/demo`
**Expected state:**
- Split view: terminal left, live state right
- **Right panel**: treasury $847,234.50 · StreamingBalanceTicker ticking · compliance ALL CLEAR · MPP cost table
- Click **"Run Demo Agent"** button:
  - Terminal streams 15 lines over ~7 seconds
  - Lines color-coded: system (muted) / request (cyan) / response (green) / payment (yellow)
  - Payment total counter increments: $0.01 → $0.03 → $0.28 → $1.28 → $1.29
  - Session complete line: "Session closed · $1.29 spent · $3.71 unspent returned"

---

### 10. Employee Portal — `http://localhost:3000/portal`
**Expected state:**
- Centered max-640px layout, "Good morning, Sofia." greeting
- Balance card with StreamingBalanceTicker (green pulsing dot = connected)
- Last payment card: amount, TxStatus chip, decoded memo label
- 4 quick-action tiles: View Payments / Manage Card / Off-ramp / Settings

---

### 11. Portal Payment History — `http://localhost:3000/portal/payments`
**Expected state:**
- Expandable payment cards grouped by month
- Expanded card: TxStatus, tx hash link, MemoDecoder (ISO 20022 fields), "Download payslip PDF" button
- Search input filters by label/amount/hash

---

### 12. CLI Demo Agent (Terminal)
```bash
npx ts-node scripts/demo-agent.ts
```

**Expected output:**
```
════════════════════════════════════════════════════════════
  REMLO — Autonomous AI Treasury Agent
  Machine-to-Machine Payroll via MPP (x402)
════════════════════════════════════════════════════════════

[STEP 1] Opening MPP session...
  ✓ Session initialized.

[STEP 2] Querying yield rates (MPP-1, $0.01)...
  ✓ $0.01 charged.

[STEP 3] Querying treasury balance (MPP-6, $0.02)...
  ✓ $0.02 charged.

[STEP 4] Running compliance checks on 5 employees...
  ✓ $0.25 charged. All 5 wallets verified.

[STEP 5] Executing payroll batch (MPP-3, $1.00)...
  ✓ $1.00 charged.

[STEP 6] Connecting to salary stream (MPP-5)...
  [demo mode or live ticks if server running]

[STEP 7] Session Closed
  deposited_usd: "5.00"
  total_spent_usd: "1.29"
  unspent_returned_usd: "3.71"
────────────────────────────────────────────────────────────
  DEMO COMPLETE — Autonomous AI Treasury Agent ran in ~60s
  Total MPP payments: $1.29
  Chain: Tempo Moderato (ID: 42431)
  Token: pathUSD (TIP-20)
────────────────────────────────────────────────────────────
```

**Exit code must be 0.** If server offline, all steps return demo stubs — still exits 0.

---

## Key Technical Talking Points

| Feature | Detail |
|---------|--------|
| Chain | Tempo Moderato (EVM, ID: 42431) |
| Token | pathUSD (TIP-20, 6 decimals) |
| Settlement | < 0.5s on-chain finality |
| Payment protocol | MPP (x402) — machine-to-machine micropayments |
| Compliance | TIP-403 registry — on-chain wallet authorization |
| Payroll memo | ISO 20022 encoded in 32-byte on-chain memo field |
| Salary streaming | `StreamVesting` contract — per-second accrual |
| Auth | Privy embedded wallets — no MetaMask needed |
| Yield | `YieldRouter` contract — treasury earns APY while idle |
| AI agent | Autonomous payroll run in ~60s, $1.29 total cost |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `pnpm dev` port in use | `lsof -ti:3000 \| xargs kill -9` |
| Demo agent crashes | Server offline is OK — stubs are returned, script still exits 0 |
| Build fails | Check `.env.local` has all placeholder values (see `.env.local`) |
| SSE not streaming | Check browser DevTools → Network → `run-agent` response is `text/event-stream` |
| Dark mode not enforced on landing | `useForceDark()` runs client-side — brief flash on first load is expected |
