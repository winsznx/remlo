# Remlo

Borderless enterprise payroll on Tempo L1. AI agents execute compliant batch payments via MPP, employees receive in 0.4s, and spend via Visa.

## What it does

Remlo turns payroll into Tempo-native settlement flows built on TIP-20 transfers with fixed 32-byte ISO 20022 memos that encode `paic`, employer ID, employee ID, pay period, cost center, and record hash. Every payout path runs through the TIP-403 Policy Registry before funds move, and atomic payroll runs execute through `PayrollBatcher.executeBatchPayroll` so a batch settles as one unit. Streaming compensation is handled by `StreamVesting` on a per-second accrual model, while Bridge provides employer virtual accounts, employee off-ramp rails, and Visa card issuance. All programmatic payroll operations are exposed as MPP endpoints and gated by HTTP 402 charges, so agents pay in PathUSD per action instead of authenticating with long-lived API keys.

## Architecture

Remlo is a Tempo settlement layer wrapped in a Next.js control plane. On-chain contracts handle treasury accounting, atomic payroll batches, employee compliance anchoring, salary streaming, and yield routing; Supabase stores employer, employee, payroll, compliance, and MPP session state; Bridge supplies the fiat ingress and card/off-ramp surface; Privy abstracts wallet creation and gas sponsorship; and `mppx` monetizes machine access to every payroll workflow.

| Layer | Technology |
|-------|-----------|
| Chain | Tempo L1 (Chain ID 42431, Simplex BFT, 0.5s finality) |
| Token standard | TIP-20 (6-decimal, ISO 20022 memo fields) |
| Compliance | TIP-403 Policy Registry (OFAC sanctions screening on every transfer) |
| Machine payments | MPP / mppx (HTTP 402, PathUSD, sessions + SSE streaming) |
| Fiat rails | Stripe Bridge API (virtual accounts, Visa cards, ACH/SEPA/PIX off-ramp) |
| Wallets | Privy embedded wallets (email/SMS, gasless via TempoTransaction Type 0x76) |
| Frontend | Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui |
| Database | Supabase (PostgreSQL, RLS, realtime) |
| State | Zustand + TanStack Query |

## MPP Endpoints

| Route | Charge | Description |
|-------|--------|-------------|
| `/api/mpp/treasury/yield-rates` | `$0.01` | Reads `YieldRouter.getYieldSources()` and `YieldRouter.getCurrentAPY()` for an AI treasury agent. |
| `/api/mpp/payroll/execute` | `$1.00` | Executes `PayrollBatcher.executeBatchPayroll()` and persists payroll receipt metadata to Supabase. |
| `/api/mpp/employee/advance` | `$0.50` | Claims accrued streamed wages from `StreamVesting.claimAccrued()` for an employee. |
| `/api/mpp/compliance/check` | `$0.05` | Runs TIP-403 authorization checks and records the result in `compliance_events`. |
| `/api/mpp/employee/balance/stream` | `$0.001/tick` | Streams live accrued salary balance over SSE using session vouchers and `StreamVesting.getAccruedBalance()`. |
| `/api/mpp/payslips/[runId]/[employeeId]` | `$0.02` | Returns a single payslip assembled from `payment_items` and `payroll_runs`. |
| `/api/mpp/memo/decode` | `$0.01` | Decodes on-chain TIP-20 memo bytes into ISO 20022 payroll fields via Viem. |
| `/api/mpp/employee/[id]/history` | `$0.05` | Returns employee payment history from `payment_items` and `payroll_runs`. |
| `/api/mpp/bridge/offramp` | `$0.25` | Initiates a Bridge transfer from payroll balance to local bank rails. |
| `/api/mpp/treasury/optimize` | `$0.10` | Session endpoint for treasury and yield optimization using `YieldRouter` and `PayrollTreasury`. |
| `/api/mpp/marketplace/compliance-list/[employerId]` | `$0.50` | Returns the employer compliance event ledger for auditors and marketplace consumers. |
| `/api/mpp/agent/session/treasury` | `$0.02` | Session endpoint for agent balance, yield, rebalance, and headcount actions across Remlo contracts. |

## Smart Contracts

| Contract | Description | Moderato testnet address |
|----------|-------------|--------------------------|
| `PayrollTreasury` | Employer treasury ledger for payroll balances, locked funds, and gas budget sponsorship. | `0x93dfCcd80895147EfC1c191013cD935f18a79859` |
| `PayrollBatcher` | Atomic batch executor that sends TIP-20 payroll transfers with memo fields in one run. | `0x58E5102BAED1c703dC1052cc7f5E30A96af34Eb8` |
| `EmployeeRegistry` | Employee wallet registry anchored to employer identity and TIP-403 policy approval. | `0x1fF7E623CFdb6e263Be0D25A9142DD7888F5CBdA` |
| `StreamVesting` | Per-second salary streaming contract with accrued balance reads and claims. | `0x71a2BA383d2C8ec15310705A13693F054271531f` |
| `YieldRouter` | Yield allocation layer for idle treasury capital and employer/employee yield splits. | `0x41dD786b2e01825437e2F67b51719CBeDcd527b0` |

## Local development

```bash
pnpm install
cp .env.local.example .env.local
# fill in env vars - see Environment Variables section below
pnpm dev
```

## Contract deployment

```bash
foundryup -n tempo
cd contracts
forge build
cast rpc tempo_fundAddress <YOUR_ADDRESS> --rpc-url https://rpc.moderato.tempo.xyz
forge script script/Deploy.s.sol --broadcast --rpc-url https://rpc.moderato.tempo.xyz
```

## Running the demo agent

```bash
npx ts-node scripts/demo-agent.ts
```

The script opens an MPP session, queries yield, checks compliance, executes payroll, starts the streaming balance flow, and closes the session. The full run spends roughly `$1.33` across 12 MPP actions, with unspent session balance returned on close.

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_TEMPO_RPC` | Tempo Moderato RPC URL used by client and server contract callers. |
| `NEXT_PUBLIC_TEMPO_CHAIN_ID` | Public chain ID for Tempo Moderato. |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy application ID from the Privy dashboard. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key used by browser clients. |
| `NEXT_PUBLIC_PAYROLL_TREASURY` | Deployed `PayrollTreasury` address exposed to the frontend. |
| `NEXT_PUBLIC_PAYROLL_BATCHER` | Deployed `PayrollBatcher` address exposed to the frontend. |
| `NEXT_PUBLIC_EMPLOYEE_REGISTRY` | Deployed `EmployeeRegistry` address exposed to the frontend. |
| `NEXT_PUBLIC_STREAM_VESTING` | Deployed `StreamVesting` address exposed to the frontend. |
| `NEXT_PUBLIC_YIELD_ROUTER` | Deployed `YieldRouter` address exposed to the frontend. |
| `NEXT_PUBLIC_APP_URL` | Public app origin used for MPP session callback URLs. |
| `SUPABASE_SERVICE_KEY` | Server only. Supabase service role key for API routes and background writes. |
| `BRIDGE_API_KEY` | Server only. Stripe Bridge API key for fiat rails, card issuance, and off-ramp operations. |
| `BRIDGE_WEBHOOK_SECRET` | Server only. Bridge RSA webhook verification secret. |
| `REMLO_TREASURY_ADDRESS` | Server only. Tempo wallet that receives MPP fees. |
| `REMLO_AGENT_PRIVATE_KEY` | Server only. Private key for the autonomous demo treasury agent. |
| `RESEND_API_KEY` | Server only. Resend API key for invite and notification email delivery. |
| `CLAUDE_API_KEY` | Server only. Anthropic API key for CSV parsing, anomaly detection, and compliance explanations. |
| `STRIPE_SECRET_KEY` | Server only. Stripe secret key used by multi-rail MPP payment fallback. |
| `MPP_SECRET_KEY` | Server only. Base64 secret used by `mppx` to sign and verify session state. |

## Built at

Tempo × Stripe HIIT Hackathon - March 19, 2026, San Francisco
