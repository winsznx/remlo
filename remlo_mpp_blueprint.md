# Remlo × MPP: complete integration blueprint

**Remlo can become the first enterprise B2B application on the Machine Payment Protocol, a gap none of Tempo's 15 suggested hackathon ideas fill.** By gating payroll operations, compliance checks, treasury management, and salary streaming behind MPP's HTTP 402 flow, Remlo transforms from a payroll product into a programmable payroll API that AI agents and third-party services can pay to consume. This report maps 12 concrete MPP-gated endpoints to Remlo's actual smart contract architecture, with real `mppx` code, exact pricing rationale, and a 3-lap HIIT hackathon build plan culminating in a single 60-second killer demo: an AI treasury agent opening an MPP session, querying yield rates, triggering a payroll batch, and streaming real-time salary ticks to employees — all paid autonomously via PathUSD on Tempo.

---

## MPP's actual API surface and what matters for Remlo

MPP is an open protocol co-authored by **Stripe and Tempo Labs**, proposed as an IETF standard (`draft-ryan-httpauth-payment`). It repurposes HTTP `402 Payment Required` with a challenge/response flow: server returns 402 + `WWW-Authenticate: Payment` header, client fulfills payment, retries with `Authorization: Payment` credential, server validates and returns `200 OK` + `Payment-Receipt`. The `mppx` TypeScript SDK (maintained by Tempo Labs and Wevm) provides both server and client implementations.

**The three primitives Remlo needs are charge, session, and SSE streaming.** A one-time `mppx.charge()` gates a single request behind a payment — the client pays per call. A `tempo.session()` opens an on-chain payment channel with a `maxDeposit`, then subsequent requests send off-chain vouchers with only CPU-bound signature checks (no blockchain bottleneck). SSE streaming via `session.sse()` enables per-token or per-tick charging, where the server emits `payment-need-voucher` events when the channel balance runs low and the client auto-signs fresh vouchers without interrupting the stream.

Since Remlo runs **Next.js 15**, the cleanest integration uses `mppx/nextjs`:

```typescript
// lib/mpp.ts — Remlo's shared MPP server instance
import { Mppx, tempo } from 'mppx/nextjs'

export const mppx = Mppx.create({
  methods: [tempo({
    currency: '0x20c0000000000000000000000000000000000000', // pathUSD on Tempo Moderato
    recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
  })],
})
```

Every MPP-gated Next.js route handler becomes a one-liner wrapper around a business logic function. The `charge()` method is curried: `mppx.charge({ amount })(handlerFn)`. If the request lacks valid payment credentials, it returns a 402 challenge automatically. If paid, it executes the handler and attaches a `Payment-Receipt` header.

---

## Twelve concrete MPP-gated endpoints for Remlo

### 1. Treasury yield rate query — the AI agent's first call

**`GET /api/mpp/treasury/yield-rates`** — Returns current yield sources, APY rates, and allocation from Remlo's YieldRouter contract.

| Property | Value |
|----------|-------|
| Charge | **$0.01** single charge |
| Why single | Low frequency; agents poll periodically, not continuously |
| Payer | AI treasury agent |
| Remlo data | YieldRouter contract (`getYieldSources()`, `getCurrentAPY()`) |
| Business value | Monetizes Remlo's proprietary yield data; creates API-as-a-product revenue |

```typescript
// app/api/mpp/treasury/yield-rates/route.ts
import { mppx } from '@/lib/mpp'
import { yieldRouter } from '@/lib/contracts'

export const GET = mppx.charge({ amount: '0.01' })(async () => {
  const sources = await yieldRouter.read.getYieldSources()
  const apy = await yieldRouter.read.getCurrentAPY()
  const allocation = await yieldRouter.read.getAllocation()
  return Response.json({ sources, apy: apy.toString(), allocation, timestamp: Date.now() })
})
```

### 2. Autonomous payroll execution — the killer enterprise use case

**`POST /api/mpp/payroll/execute`** — An AI agent pays to trigger a full payroll batch via PayrollBatcher.

| Property | Value |
|----------|-------|
| Charge | **$1.00** single charge |
| Why single | High-stakes, low-frequency action; one charge per payroll run |
| Payer | AI agent (funded by employer treasury) |
| Remlo data | PayrollBatcher (`executeBatch()`), EmployeeRegistry, PayrollTreasury, TIP-403 compliance |
| Business value | First autonomous payroll execution by an AI agent, gated by economic commitment |

```typescript
// app/api/mpp/payroll/execute/route.ts
import { mppx } from '@/lib/mpp'
import { supabase } from '@/lib/supabase'
import { payrollBatcher, employeeRegistry, treasury } from '@/lib/contracts'

export const POST = mppx.charge({ amount: '1.00' })(async (req: Request) => {
  const { employerId, payrollRunId } = await req.json()

  // Fetch employees and amounts from Supabase
  const { data: items } = await supabase
    .from('payment_items')
    .select('employee_id, amount, cost_center')
    .eq('payroll_run_id', payrollRunId)

  // Resolve wallet addresses from EmployeeRegistry
  const recipients = await Promise.all(
    items.map(i => employeeRegistry.read.getWallet([i.employee_id]))
  )

  // Execute atomic batch via PayrollBatcher (uses Type 0x76 for gasless + batching)
  const txHash = await payrollBatcher.write.executeBatch([
    recipients,
    items.map(i => BigInt(i.amount)),
    payrollRunId,
  ])

  // Record in Supabase
  await supabase.from('payroll_runs').update({ status: 'executed', tx_hash: txHash }).eq('id', payrollRunId)

  return Response.json({ txHash, employeeCount: items.length, status: 'executed' })
})
```

The **$1.00 charge** is deliberate — it creates an economic cost that prevents an AI agent from accidentally triggering payroll in a tight loop. This is a safety mechanism, not just monetization.

### 3. On-demand salary advance — employee-initiated

**`POST /api/mpp/employee/advance`** — Employee pays a small fee to pull accrued salary early from StreamVesting.

| Property | Value |
|----------|-------|
| Charge | **$0.50** single charge |
| Why single | Infrequent, high-value action; one advance per request |
| Payer | Employee (via Privy embedded wallet) |
| Remlo data | StreamVesting (`claimAccrued()`), EmployeeRegistry |
| Business value | Earned wage access without traditional payday lending; fee is transparent and on-chain |

```typescript
// app/api/mpp/employee/advance/route.ts
import { mppx } from '@/lib/mpp'
import { streamVesting, employeeRegistry } from '@/lib/contracts'

export const POST = mppx.charge({ amount: '0.50' })(async (req: Request) => {
  const { employeeId } = await req.json()

  const wallet = await employeeRegistry.read.getWallet([employeeId])
  const accrued = await streamVesting.read.getAccruedBalance([wallet])
  const txHash = await streamVesting.write.claimAccrued([wallet])

  return Response.json({ txHash, amountClaimed: accrued.toString(), fee: '0.50' })
})
```

### 4. Compliance check API — pay-per-sanctions-screening

**`POST /api/mpp/compliance/check`** — Query TIP-403 sanctions status of any wallet address.

| Property | Value |
|----------|-------|
| Charge | **$0.05** single charge |
| Why single | Stateless lookup; no session benefit |
| Payer | Employer, external service, or compliance auditor |
| Remlo data | TIP-403 Registry (`0x403c...`), compliance_events table in Supabase |
| Business value | Monetizes compliance infrastructure; creates a compliance-as-a-service API |

```typescript
// app/api/mpp/compliance/check/route.ts
import { mppx } from '@/lib/mpp'
import { tip403Registry } from '@/lib/contracts'
import { supabase } from '@/lib/supabase'

export const POST = mppx.charge({ amount: '0.05' })(async (req: Request) => {
  const { walletAddress } = await req.json()

  const isSanctioned = await tip403Registry.read.isRestricted([walletAddress])
  const riskScore = await tip403Registry.read.getRiskScore([walletAddress])

  // Log compliance event
  await supabase.from('compliance_events').insert({
    wallet_address: walletAddress,
    result: isSanctioned ? 'BLOCKED' : 'CLEAR',
    risk_score: riskScore,
    checked_at: new Date().toISOString(),
  })

  return Response.json({ walletAddress, sanctioned: isSanctioned, riskScore, registry: '0x403c000000000000000000000000000000000000' })
})
```

### 5. Streaming salary balance — the session showcase

**`GET /api/mpp/employee/balance/stream`** — Real-time per-second salary tick via SSE, charged per tick through an MPP session.

| Property | Value |
|----------|-------|
| Charge | **$0.001** per SSE event |
| Why session | **High frequency** — ticks every second; session avoids per-request on-chain overhead |
| Payer | Employee or dashboard agent |
| Remlo data | StreamVesting (`getAccruedBalance()`), EmployeeRegistry |
| Business value | Showcases both MPP sessions AND Remlo's per-second streaming salary; visually stunning in demo |

**Server (manual mode for SSE control):**

```typescript
// app/api/mpp/employee/balance/stream/route.ts
import { Mppx, tempo } from 'mppx/server'

const mppx = Mppx.create({
  methods: [tempo({
    currency: '0x20c0000000000000000000000000000000000000',
    recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
  })],
})

export async function GET(req: Request) {
  const employeeId = new URL(req.url).searchParams.get('employeeId')

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let balance = BigInt(0)
      const salaryPerSecond = BigInt(3170979198) // ~$100k/yr in pathUSD wei per second

      const interval = setInterval(() => {
        balance += salaryPerSecond
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ employeeId, balance: balance.toString(), tick: Date.now() })}\n\n`
        ))
      }, 1000)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  // Charge per SSE connection (session vouchers handle per-tick billing)
  const response = await mppx.charge({ amount: '0.001' })(req)
  if (response.status === 402) return response.challenge

  return response.withReceipt(new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  }))
}
```

**Client (AI agent or dashboard):**

```typescript
// Agent-side code
import { tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'

const session = tempo.session({
  account: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`),
  maxDeposit: '0.50', // Covers ~500 ticks (8+ minutes of streaming)
})

const stream = await session.sse('https://remlo.app/api/mpp/employee/balance/stream?employeeId=emp_001')

for await (const tick of stream) {
  const data = JSON.parse(tick)
  console.log(`Balance: ${data.balance} pathUSD-wei at ${data.tick}`)
}

await session.close() // Reclaim unspent deposit
```

### 6. Payslip generation — pay-per-document

**`GET /api/mpp/payslips/[runId]/[employeeId]`** — Generate and return a structured payslip.

| Property | Value |
|----------|-------|
| Charge | **$0.02** single charge |
| Payer | Employee or employer |
| Remlo data | payroll_runs + payment_items tables, TIP-20 memo fields |

```typescript
// app/api/mpp/payslips/[runId]/[employeeId]/route.ts
import { mppx } from '@/lib/mpp'
import { supabase } from '@/lib/supabase'

export const GET = mppx.charge({ amount: '0.02' })(
  async (req: Request, { params }: { params: { runId: string; employeeId: string } }) => {
    const { data: payslip } = await supabase
      .from('payment_items')
      .select('*, payroll_runs(*)')
      .eq('payroll_run_id', params.runId)
      .eq('employee_id', params.employeeId)
      .single()

    return Response.json({
      employee: params.employeeId,
      payPeriod: payslip.payroll_runs.pay_period,
      grossAmount: payslip.amount,
      costCenter: payslip.cost_center,
      txHash: payslip.tx_hash,
      memoHash: payslip.memo_sha256,
      generatedAt: new Date().toISOString(),
    })
  }
)
```

### 7. ISO 20022 memo decode — pay-per-parse

**`POST /api/mpp/memo/decode`** — Decode TIP-20 structured memo fields from any Tempo transaction.

| Property | Value |
|----------|-------|
| Charge | **$0.01** single charge |
| Payer | Auditor, employer, or third-party analytics service |
| Remlo data | On-chain TIP-20 memo data (employee ID, payroll run ID, cost center, pay period, SHA-256 hash) |

```typescript
// app/api/mpp/memo/decode/route.ts
import { mppx } from '@/lib/mpp'
import { tempoClient } from '@/lib/tempo'

export const POST = mppx.charge({ amount: '0.01' })(async (req: Request) => {
  const { txHash } = await req.json()

  const tx = await tempoClient.getTransaction({ hash: txHash })
  const memo = decodeTIP20Memo(tx.input) // Parses ISO 20022 structured fields

  return Response.json({
    employeeId: memo.employeeId,
    payrollRunId: memo.payrollRunId,
    costCenter: memo.costCenter,
    payPeriod: memo.payPeriod,
    contentHash: memo.sha256Hash,
    iso20022: memo.rawStructured,
  })
})
```

### 8. Employee payment history — gated data export

**`GET /api/mpp/employee/[id]/history`** — Full payment history with structured metadata.

| Property | Value |
|----------|-------|
| Charge | **$0.05** single charge |
| Payer | Employee or their AI financial agent |
| Remlo data | payment_items + payroll_runs tables, EmployeeRegistry |

```typescript
// app/api/mpp/employee/[id]/history/route.ts
import { mppx } from '@/lib/mpp'
import { supabase } from '@/lib/supabase'

export const GET = mppx.charge({ amount: '0.05' })(
  async (req: Request, { params }: { params: { id: string } }) => {
    const { data: history } = await supabase
      .from('payment_items')
      .select('amount, tx_hash, created_at, cost_center, payroll_runs(pay_period, status)')
      .eq('employee_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100)

    return Response.json({ employeeId: params.id, payments: history, count: history.length })
  }
)
```

### 9. Bridge off-ramp trigger — pay to cash out

**`POST /api/mpp/bridge/offramp`** — Trigger a Stripe Bridge fiat off-ramp for an employee's PathUSD balance.

| Property | Value |
|----------|-------|
| Charge | **$0.25** single charge |
| Why $0.25 | Covers Remlo's operational cost of Bridge API call; employee pays once per off-ramp |
| Payer | Employee |
| Remlo data | Bridge API (Stripe), Privy embedded wallet |

```typescript
// app/api/mpp/bridge/offramp/route.ts
import { mppx } from '@/lib/mpp'
import { bridgeClient } from '@/lib/bridge'

export const POST = mppx.charge({ amount: '0.25' })(async (req: Request) => {
  const { employeeId, amount, destinationCurrency } = await req.json()

  const offramp = await bridgeClient.createOfframp({
    amount,
    sourceCurrency: 'pathUSD',
    destinationCurrency: destinationCurrency || 'USD',
    employeeId,
  })

  return Response.json({
    offrampId: offramp.id,
    estimatedArrival: offramp.eta,
    fiatAmount: offramp.destinationAmount,
    status: 'initiated',
  })
})
```

### 10. Treasury optimization AI — session-based advisory

**`POST /api/mpp/treasury/optimize`** — AI-powered yield optimization suggestions. Uses a session because employers may ask multiple follow-up questions.

| Property | Value |
|----------|-------|
| Charge | **$0.10** per query |
| Why session | Conversational; employer's AI agent asks 3-5 follow-up optimization questions |
| Payer | Employer AI agent |
| Remlo data | YieldRouter, PayrollTreasury (`getAvailableBalance()`, `getLockedBalance()`) |

```typescript
// app/api/mpp/treasury/optimize/route.ts
import { Mppx, tempo } from 'mppx/server'
import { yieldRouter, treasury } from '@/lib/contracts'

const mppx = Mppx.create({
  methods: [tempo({
    currency: '0x20c0000000000000000000000000000000000000',
    recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
  })],
})

export async function POST(req: Request) {
  const response = await mppx.charge({ amount: '0.10' })(req)
  if (response.status === 402) return response.challenge

  const { employerId, question } = await req.json()

  const available = await treasury.read.getAvailableBalance([employerId])
  const locked = await treasury.read.getLockedBalance([employerId])
  const currentYield = await yieldRouter.read.getCurrentAPY()

  // AI analysis (could call an LLM here, also gated by MPP upstream)
  const suggestion = analyzeYieldStrategy({ available, locked, currentYield, question })

  return response.withReceipt(Response.json({
    suggestion,
    currentAPY: currentYield.toString(),
    idleFunds: available.toString(),
    projectedAnnualYield: ((Number(available) * Number(currentYield)) / 10000).toString(),
  }))
}
```

### 11. Multi-employer compliance marketplace

**`GET /api/mpp/marketplace/compliance-list/[employerId]`** — Employer A pays to access Employer B's pre-screened wallet allowlist.

| Property | Value |
|----------|-------|
| Charge | **$0.50** single charge |
| Payer | Employer (the one consuming the list) |
| Remlo data | compliance_events + employers table, TIP-403 registry |
| Business value | Creates a network effect between Remlo employers; compliance data becomes a tradeable asset |

```typescript
// app/api/mpp/marketplace/compliance-list/[employerId]/route.ts
import { mppx } from '@/lib/mpp'
import { supabase } from '@/lib/supabase'

export const GET = mppx.charge({ amount: '0.50' })(
  async (req: Request, { params }: { params: { employerId: string } }) => {
    const { data: cleared } = await supabase
      .from('compliance_events')
      .select('wallet_address, result, checked_at')
      .eq('employer_id', params.employerId)
      .eq('result', 'CLEAR')
      .order('checked_at', { ascending: false })

    return Response.json({
      providerId: params.employerId,
      clearedWallets: cleared.length,
      list: cleared,
      lastUpdated: cleared[0]?.checked_at,
    })
  }
)
```

### 12. Agent session — full autonomous treasury management

**`POST /api/mpp/agent/session/treasury`** — An AI agent opens an MPP session and continuously monitors + manages treasury.

| Property | Value |
|----------|-------|
| Charge | **$0.02** per action within session |
| Why session | Agent makes **50-100 calls** per management cycle (check balance, query rates, rebalance, report) |
| Payer | AI agent (employer-funded embedded wallet) |
| Remlo data | All contracts: YieldRouter, PayrollTreasury, EmployeeRegistry, StreamVesting |

```typescript
// app/api/mpp/agent/session/treasury/route.ts
import { Mppx, tempo } from 'mppx/server'
import { treasury, yieldRouter, employeeRegistry } from '@/lib/contracts'

const mppx = Mppx.create({
  methods: [tempo({
    currency: '0x20c0000000000000000000000000000000000000',
    recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
  })],
})

export async function POST(req: Request) {
  const response = await mppx.charge({ amount: '0.02' })(req)
  if (response.status === 402) return response.challenge

  const { action, employerId, params: actionParams } = await req.json()

  let result: any
  switch (action) {
    case 'balance':
      result = {
        available: (await treasury.read.getAvailableBalance([employerId])).toString(),
        locked: (await treasury.read.getLockedBalance([employerId])).toString(),
      }
      break
    case 'yield':
      result = { apy: (await yieldRouter.read.getCurrentAPY()).toString() }
      break
    case 'rebalance':
      const txHash = await yieldRouter.write.rebalance([employerId, actionParams.targetAllocation])
      result = { txHash, action: 'rebalanced' }
      break
    case 'headcount':
      result = { count: (await employeeRegistry.read.getEmployeeCount([employerId])).toString() }
      break
    default:
      return response.withReceipt(Response.json({ error: 'Unknown action' }, { status: 400 }))
  }

  return response.withReceipt(Response.json({ action, result, timestamp: Date.now() }))
}
```

**Agent client code for the session:**

```typescript
import { tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'

const session = tempo.session({
  account: privateKeyToAccount(process.env.AGENT_KEY as `0x${string}`),
  maxDeposit: '5.00', // 250 actions at $0.02 each
})

// First call opens channel on-chain
const balance = await session.fetch('https://remlo.app/api/mpp/agent/session/treasury', {
  method: 'POST',
  body: JSON.stringify({ action: 'balance', employerId: 'emp_acme' }),
})

// Subsequent calls use off-chain vouchers — instant, no gas
const yield_ = await session.fetch('https://remlo.app/api/mpp/agent/session/treasury', {
  method: 'POST',
  body: JSON.stringify({ action: 'yield', employerId: 'emp_acme' }),
})

// When done, settle and reclaim unspent deposit
await session.close()
```

---

## How MPP sessions actually work under the hood

Sessions solve a critical problem: if an AI agent makes 100 API calls at $0.01 each, paying on-chain per call is unacceptable latency and cost. Sessions use **payment channels** — a well-established pattern where funds are locked on-chain once, then spent incrementally via off-chain signed vouchers.

**The lifecycle has three phases.** First, on the initial request, the client opens a payment channel by depositing `min(suggestedDeposit, maxDeposit)` PathUSD into an escrow contract on Tempo. This is the only on-chain transaction. Second, for every subsequent request, the client signs a voucher — a message saying "I authorize the server to claim X PathUSD from my channel" — where X increases incrementally. The server verifies the signature (pure CPU, **no blockchain call**) and serves the response. Vouchers are cumulative: each new voucher supersedes the previous one. Third, when the session ends, either party can close the channel on-chain. The server claims the final voucher amount; the remainder returns to the client automatically.

**For SSE streaming**, the flow adds a fourth mechanism. As the server streams data (e.g., salary balance ticks), it emits a special `payment-need-voucher` SSE event when the current voucher balance is depleted. The client's `session.sse()` method intercepts this event, signs a new voucher with higher authorization, and sends it back — all without interrupting the data stream. This is how Remlo's streaming salary endpoint can charge $0.001 per tick continuously.

The key configuration parameter is `maxDeposit` on the client. Setting it to `'1'` means the client locks up to 1 PathUSD in the channel. At $0.01 per action, that's 100 actions before the channel needs topping up. **Unspent funds are always reclaimable** via `session.close()`.

---

## Multi-rail MPP: how Stripe method enables fiat fallback

MPP's architecture separates **intents** (what kind of payment) from **methods** (how to pay). Remlo can offer both Tempo and Stripe methods simultaneously, giving employers a choice between PathUSD and traditional fiat.

**Stripe offers two distinct MPP methods.** The **Stripe crypto method** uses `tempo.charge()` but routes settlement through Stripe's infrastructure. The server creates a Stripe PaymentIntent with `payment_method_types: ['crypto']` and `crypto.mode: 'deposit'`, which returns a Tempo deposit address. The client pays PathUSD to that address; Stripe auto-captures the PaymentIntent when funds settle. The payment appears in Stripe Dashboard alongside all other transactions, with standard reporting, tax calculation, and refund support. The **Stripe SPT (Shared Payment Token) method** uses `stripe.charge()` and supports traditional cards, Link, and BNPL. The client collects card details via Stripe Elements, creates a PaymentMethod, and exchanges it for an SPT credential.

**For Remlo, the dual-rail configuration looks like this:**

```typescript
// lib/mpp-multirial.ts — Remlo's multi-rail MPP server
import crypto from 'crypto'
import { Mppx, tempo, stripe } from 'mppx/server'

const mppSecretKey = crypto.randomBytes(32).toString('base64')

export const mppxMultiRail = Mppx.create({
  methods: [
    // Rail 1: PathUSD on Tempo (instant, sub-cent fees)
    tempo({
      currency: '0x20c0000000000000000000000000000000000000',
      recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
    }),
    // Rail 2: Stripe fiat (cards, wallets — for employers not yet on-chain)
    stripe.charge({
      networkId: 'internal',
      paymentMethodTypes: ['card', 'link'],
      secretKey: process.env.STRIPE_SECRET_KEY!,
    }),
  ],
  secretKey: mppSecretKey,
})
```

When the server returns a 402 challenge, it advertises **both methods** in the `WWW-Authenticate` header. The client picks whichever method it supports. An AI agent with a Tempo wallet pays in PathUSD. A traditional employer's browser-based dashboard, using Stripe Elements, pays with a credit card. Same endpoint, same business logic, two payment rails. This is a significant Remlo advantage: the Stripe Bridge API is already integrated for fiat on/off-ramp, so adding Stripe as an MPP method is architecturally consistent.

---

## HIIT hackathon build sequence across three laps

### Lap 1 (9:30–11:30): Foundation — 4 core endpoints

**Goal: Get MPP working end-to-end with Remlo's actual contracts by 11:30.**

- **9:30–9:50** — Install `mppx`, create `lib/mpp.ts` shared server instance, run `npx mppx account create` and `npx mppx account fund` for test wallets
- **9:50–10:20** — Build endpoints #1 (yield rates) and #4 (compliance check) — simplest single-charge patterns, pure read operations, prove the 402 flow works
- **10:20–11:00** — Build endpoint #2 (payroll execution) — the high-value write operation. Wire up PayrollBatcher contract call, test with `npx mppx --method POST`
- **11:00–11:30** — Build endpoint #3 (salary advance) and test all four endpoints via CLI. Verify `Payment-Receipt` headers are returned correctly

**Exit criteria:** Four working MPP-gated endpoints, demonstrated via `npx mppx` CLI.

### Lap 2 (1:00–3:00): Sessions + streaming + UI

**Goal: Build the visually impressive streaming salary demo and agent session.**

- **1:00–1:30** — Build endpoint #5 (streaming salary balance SSE). This is the visual centerpiece
- **1:30–2:00** — Build endpoint #12 (agent session for treasury management). Demonstrate multi-action sessions
- **2:00–2:30** — Write a demo agent script that opens a session, queries yield, checks compliance, triggers payroll, then streams salary ticks — the full agent lifecycle
- **2:30–3:00** — Build a minimal dashboard page (Next.js + shadcn/ui) showing the streaming salary balance with a live-updating counter and transaction receipts

**Exit criteria:** Full agent lifecycle demo script working. Dashboard shows live streaming salary with MPP receipts.

### Lap 3 (4:00–6:00): Polish, multi-rail, and demo prep

**Goal: Add Stripe fallback, polish UI, rehearse demo.**

- **4:00–4:30** — Add Stripe SPT method as fallback on 2-3 key endpoints. Show dual-rail payment selection in UI
- **4:30–5:00** — Build remaining endpoints (#6 payslip, #7 memo decode, #8 history) — these are straightforward and add depth to the demo
- **5:00–5:30** — Create a split-screen demo view: left side shows the AI agent's terminal (MPP requests flowing), right side shows the employer dashboard (balances updating, payroll executed, salary streaming)
- **5:30–6:00** — Rehearse the 60-second killer demo. Record a backup video

---

## The 60-second killer demo moment

The demo opens on a split screen. Left: an AI treasury agent's terminal. Right: Remlo's employer dashboard.

**Seconds 0–10:** The agent opens an MPP session with `maxDeposit: '5.00'`. The dashboard shows a "Session Opened" event with the channel deposit transaction on Tempo.

**Seconds 10–20:** The agent queries yield rates ($0.01 charged via voucher, no on-chain tx). Dashboard shows **3.6% APY** from T-bill-backed yield. Agent queries treasury balance — **$47,250 available**, **$12,750 locked** for next payroll.

**Seconds 20–35:** The agent runs a TIP-403 compliance check on all 5 employees ($0.05), then triggers payroll execution ($1.00). The dashboard shows the payroll batch executing atomically — 5 employees paid in a single transaction via PayrollBatcher. The MPP receipt hash appears alongside the payroll transaction hash.

**Seconds 35–50:** Immediately after payroll, the streaming salary balance SSE kicks in. A live counter on the dashboard shows an employee's balance ticking up **every second** — $0.0031 per tick, accruing in real-time via StreamVesting. Each tick is charged $0.001 via the MPP session voucher. The numbers visibly increment.

**Seconds 50–60:** The agent closes its session. Dashboard shows total MPP charges: **$1.18** across 12 actions. Unspent deposit of **$3.82** returned. Total time for autonomous payroll management: 50 seconds. Total on-chain transactions: **3** (session open, payroll batch, session close). Everything else was off-chain vouchers.

**The punchline**: "An AI agent just managed an entire payroll cycle — compliance screening, yield optimization, batch execution, and real-time salary streaming — paying for every action via MPP. No API keys. No subscriptions. No invoices. Just HTTP 402."

---

## Why Remlo owns a gap no other team will fill

Of Tempo's 15 suggested hackathon ideas, **every single one targets consumer or entertainment use cases**: games (Pokémon, checkers, Tetris, RuneScape), content (paywalls, video generation, image generation), or novelty (trivia, DJ arcade). Not one touches **enterprise, B2B, or financial infrastructure**. This is verifiable by reading the list — the closest to "serious" is the pay-per-query knowledge base, and even that is framed as a consumer tool.

A judge who has seen 10 MPP demos will have seen pay-per-image, pay-per-LLM-token, and pay-per-game-move. They will **not** have seen an AI agent autonomously managing a $47,000 treasury, executing compliant payroll for 5 employees, and streaming salary in real-time — all paid via MPP. The differentiation is threefold. First, **economic gravity**: a $1.00 payroll execution charge has real business justification, unlike $0.01 game moves. Second, **composability**: Remlo chains 5+ MPP calls into a coherent business workflow (yield → compliance → payroll → streaming), not isolated transactions. Third, **dual-rail relevance**: Remlo's existing Stripe Bridge integration makes the Stripe MPP fallback natural, not bolted on — demonstrating that MPP works for enterprises that haven't adopted crypto yet.

The strongest competitive moat is that **Remlo already has the smart contracts and database schema** — PayrollTreasury, PayrollBatcher, EmployeeRegistry, StreamVesting, YieldRouter, TIP-403 compliance, TIP-20 memos. MPP is the distribution layer that turns this infrastructure into a programmable, payable API. No other hackathon team will arrive with this depth of existing architecture.

---

## Conclusion

The core insight is that MPP is not just a payment protocol — it's an **access control and metering layer** for any HTTP endpoint. For Remlo, this transforms payroll infrastructure from a SaaS product (monthly subscription) into a programmable utility (pay-per-use). The 12 endpoints designed here span three pricing tiers: **micro-reads** ($0.001–0.05 for queries and ticks), **standard operations** ($0.10–0.50 for compliance checks, advances, and off-ramps), and **premium actions** ($1.00 for payroll execution). Sessions handle high-frequency agent interactions without per-call blockchain overhead. The Stripe SPT fallback ensures employers who aren't on Tempo can still pay for API access with a credit card. And the hackathon demo — an AI agent executing an entire payroll lifecycle in under 60 seconds, charged $1.18 across 12 MPP actions — tells a story no game or image generator can match: machines paying machines to move real money to real people.