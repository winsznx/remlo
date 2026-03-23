# PayStream Global: The Complete Build Guide for Tempo × Stripe

**PayStream Global is a borderless enterprise payroll and yield routing protocol that exploits Tempo L1's payment-native primitives and Stripe's Bridge API to deliver sub-second, sub-cent payroll settlement with embedded compliance — a combination no other chain or infrastructure stack can replicate.** The protocol turns idle payroll treasury float into yield via T-bill-backed stablecoins, issues Visa debit cards to employees globally, and encodes every payment with ISO 20022-compatible metadata for seamless accounting reconciliation. This guide covers every dimension a full-stack developer needs to build, differentiate, and win at the Tempo × Stripe HIIT Hackathon on **March 19, 2026** in San Francisco — real endpoints, real contracts, real numbers.

---

## Section 1: The $222 billion cross-border payments crisis PayStream solves

### Traditional rails bleed money and time

The global payroll ecosystem remains shackled to infrastructure built decades ago. **SWIFT international wire transfers cost $50–$150 all-in** per transaction (sender fees of $35–$50, recipient fees of $10–$30, intermediary bank fees of $10–$100+), settle in **1–5 business days**, and embed hidden FX spreads of **1–3%** on top of flat fees. The World Bank reports that sending $200 internationally still costs an average of **6.2–6.3%** in fees — more than double the UN's 3% target. Banks terminated relationships with **127 African financial institutions** during 2024–2025 alone, adding up to 48 hours and $12 to a $200 transaction through rerouting.

ACH costs just $0.20–$1.50 per transaction but is **US-only** and takes 1–3 business days. SEPA offers near-instant euro transfers but covers only 41 European countries in euros. None of these rails speak to each other natively, and none support programmable logic, streaming payments, or embedded compliance metadata.

### A market measured in trillions

The cross-border payments market stands at **$222 billion in 2025** (Mordor Intelligence), growing at 7.16% CAGR to $336 billion by 2031. B2B transactions represent **72.6%** of this volume. The global payroll services market reaches **$27.8 billion in 2025**, projected to hit $34.8 billion by 2030. Stablecoin transaction volume hit **$33 trillion in 2025** — a 72% year-over-year increase — with USDC alone processing $18.3 trillion. Total stablecoin market cap now exceeds **$300 billion**, and Standard Chartered projects it could reach **$2 trillion by 2028**.

### Web2 incumbents charge premium prices for slow rails

**Deel** (valued at $17.3 billion, $1.15B ARR, 35,000+ customers) charges $49/month per contractor and $599/month per EOR employee. It processes $22 billion/year in payroll but still uses ACH/SEPA/SWIFT rails with 1–5 day settlement and opaque FX markups. **Rippling** ($16.8B valuation, $570M ARR) covers only ~80 countries versus Deel's 150+. **Remote.com** ($3B valuation) has weaker integrations and limited coverage in emerging markets. **Papaya Global** ($3.7B valuation) relies on a third-party partner network rather than owned entities.

All four share the same fundamental limitation: they are wrappers around legacy banking rails. Settlement takes days. FX markups are embedded in rates rather than transparent. None offer programmable payment logic, streaming salaries, or yield on float.

### Web3 payroll attempts got half the equation right

**Request Finance** has processed $1.2 billion for ~2,000 web3 teams, offering crypto invoicing and batch payments, but serves only crypto-native DAOs with no fiat integration. **Superfluid** pioneered per-second streaming (backed by Circle Ventures) but requires wrapping tokens to "Super Tokens" and has no compliance layer. **Sablier** offers elegant time-locked streams represented as NFTs but requires upfront deposit of the full amount and supports no fiat rails. **Bitwage** is the most mature ($400M+ processed for 4,500+ companies) but lacks on-chain programmability and smart contract composability.

The gap is clear: Web2 players have compliance and fiat rails but slow settlement. Web3 players have programmable money but no compliance or off-ramps. PayStream Global bridges both worlds using Tempo + Bridge.

### Why stablecoin payroll is now inevitable

The **GENIUS Act** was signed into law on July 18, 2025 — the first comprehensive US stablecoin legislation. It requires 1:1 reserves, establishes payment stablecoins as neither securities nor commodities, and creates a path where a single PPSI (Permitted Payment Stablecoin Issuer) license could replace 49 separate state money transmitter licenses. Full implementation is mandated by **January 2027**. The **EU's MiCA regulation** has been fully effective since December 30, 2024, providing clear authorization frameworks for stablecoin issuers. Rise's 2025 Stablecoin Payroll Report found **one in four companies worldwide now pay employees in cryptocurrency**, with projections of 35–40% adoption by 2026.

### The unique gap PayStream fills

PayStream Global occupies the intersection that no competitor addresses: **instant settlement** (Tempo's 0.5s finality), **embedded compliance** (TIP-403 sanctions screening + Bridge KYC), **fiat on/off-ramps** (Bridge virtual accounts + Visa cards), **programmable payroll logic** (streaming vesting, batch payments, escrow), **yield on float** (T-bill-backed USDB at 3.7% APY), and **structured payment data** (TIP-20 memo fields with ISO 20022 encoding). This combination is architecturally impossible on Ethereum (12s blocks, $2+ gas), Solana (no native compliance layer), or any Web2 payroll platform.

---

## Section 2: Tempo L1 — a payments-native chain built for exactly this

Tempo is a Layer-1 blockchain incubated by Stripe and Paradigm, built on the Reth SDK with Simplex BFT consensus, EVM-compatible (targeting Osaka hardfork), and purpose-built for stablecoin payment workloads. The Moderato Testnet launched January 18, 2026 (chain ID **42431**). Tempo raised **$500M at a $5B valuation** in October 2025 from Thrive Capital, Greenoaks, Sequoia, and Ribbit Capital.

### TIP-20: the token standard that thinks like an accountant

TIP-20 extends ERC-20 with payment-native primitives. Every TIP-20 token enforces **6-decimal precision** (`decimals()` always returns 6), aligning perfectly with fiat accounting — $1,000.50 encodes as `1000500000` in raw units. The standard includes native memo functions:

- `transferWithMemo(address to, uint256 amount, bytes32 memo)`
- `transferFromWithMemo(address from, address to, uint256 amount, bytes32 memo)`

These emit `TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo)` events. The **indexed memo** enables efficient log queries for payroll reconciliation. Tempo's documentation explicitly states memos are "designed to align with the banking standard ISO 20022."

For payroll, the 32-byte memo field encodes: employee ID (first 8 bytes), payroll run ID (next 8 bytes), cost center (4 bytes), pay period (4 bytes), and a truncated SHA-256 hash of the full payroll record (remaining 8 bytes). Larger payroll metadata is stored off-chain with the hash serving as a commitment.

TIP-20 tokens include built-in RBAC: `ISSUER_ROLE` (mint/burn), `PAUSE_ROLE`/`UNPAUSE_ROLE` (emergency controls), `BURN_BLOCKED_ROLE` (burn from sanctioned addresses), and `DEFAULT_ADMIN_ROLE`. The **TIP20Factory** lives at `0x20Fc000000000000000000000000000000000000`, and all TIP-20 tokens have addresses prefixed with `0x20C0...`.

Key testnet stablecoin addresses:
- **pathUSD**: `0x20c0000000000000000000000000000000000000`
- **AlphaUSD**: `0x20c0000000000000000000000000000000000001`
- **BetaUSD**: `0x20c0000000000000000000000000000000000002`

### TIP-403: compliance as a protocol primitive

The TIP-403 Policy Registry is a predeployed contract at **`0x403c000000000000000000000000000000000000`** that TIP-20 tokens reference on every transfer. Before any token movement, `isAuthorized(policyId, from)` and `isAuthorized(policyId, to)` are both called — if either returns `false`, the transfer reverts with `PolicyForbids`.

Built-in policies: `policyId = 0` (always-reject), `policyId = 1` (always-allow, the default). Custom policies start at `policyId = 2` and auto-increment. Policies can be **WHITELIST** (only listed addresses can transact, for KYC-gated tokens) or **BLACKLIST** (listed addresses are blocked, for sanctions screening).

For PayStream's payroll use case, the integration pattern is:

```solidity
// Create a blacklist policy for OFAC screening
uint64 policyId = tip403Registry.createPolicy(adminAddress, PolicyType.BLACKLIST);
// Add sanctioned address
tip403Registry.modifyPolicyBlacklist(policyId, sanctionedAddress, true);
// Assign policy to payroll token
token.changeTransferPolicyId(policyId);
```

A single blacklist policy can be shared across all payroll tokens. When the compliance team updates the sanctions list, all tokens automatically enforce the new rules without per-contract updates. This eliminates the need for custom sanctions-screening middleware.

### TempoTransactions: gasless, batched, delegatable payroll

TempoTransactions (EIP-2718 Type `0x76`) are Tempo's native transaction format with three features critical for payroll:

**Fee Sponsorship** enables completely gasless employee transactions. A fee payer (employer/app) signs with magic byte `0x78`; the sender (employee) signs with `0x76`. The fee payer's balance is charged instead of the sender's. Tempo provides a **public testnet fee sponsor** at `https://sponsor.moderato.tempo.xyz`. The TypeScript SDK offers a `withFeePayer` transport in Viem.

**Call Batching** via the `calls: Vec<Call>` field executes multiple operations atomically in a single transaction. If any call reverts, the entire batch reverts. This means approve + distribute can happen in one transaction — critical for the PayrollBatcher contract that sends hundreds of payments simultaneously.

**2D Nonces** enable parallel transaction submission. `nonce_key = 0` is the standard protocol nonce; any `nonce_key > 0` has its own independent sequence. This allows a payroll automation agent to submit concurrent payroll runs without nonce conflicts. Access Keys can be provisioned with expiry timestamps and per-TIP20 spending limits, supporting secp256k1, P256, and WebAuthn signature types.

The **Account Keychain** precompile at `0xAAAAAAAA00000000000000000000000000000000` manages key delegation. The **Nonce** precompile at `0x4E4F4E4345000000000000000000000000000000` handles 2D nonce tracking.

### Payment lanes guarantee stable payroll fees

Tempo blocks have **separate gas limits** for general EVM execution and payment lanes. TIP-20 token transfers automatically route to the payment lane — no special tagging required. Payment transactions do not compete with DeFi liquidations, NFT mints, or other general traffic. Target fee: **< $0.001** (one-tenth of a cent) per payment transaction, stable regardless of network congestion. For payroll, this means batch payments of hundreds of employees cost fractions of a cent per recipient, with fees predictable enough for enterprise budgeting.

### Simplex BFT: 0.5-second deterministic finality changes payroll UX

Tempo uses Simplex BFT consensus (via Commonware) delivering **0.5-second deterministic finality**. Once a block is finalized, it is mathematically irreversible — no probabilistic confirmations, no reorgs. The testnet benchmarks at **20,000 TPS** with a mainnet target of 100,000+ TPS.

For payroll UX, this is transformative: when a PayrollBatcher transaction confirms, it is immediately and permanently final. The employer sees a confirmation receipt in under one second. Employees see funds in their wallet instantly. No "pending" states, no "wait for 12 confirmations." This is settlement certainty equivalent to what traditional financial systems promise but rarely deliver.

### Development environment setup

**Foundry installation:**
```bash
foundryup -n tempo
forge init -n tempo my-paystream && cd my-paystream
```
This installs `tempo-std` (Tempo standard library) automatically. Key CLI flags:

| Flag | Purpose |
|------|---------|
| `--tempo.fee-token <ADDRESS>` | TIP-20 token to pay fees |
| `--tempo.nonce-key <KEY>` | 2D nonce key for parallel tx |
| `--tempo.sponsor-signature <SIG>` | Fee payer signature |
| `--tempo.print-sponsor-hash` | Print hash for sponsor signing |

**Local devnet:**
```bash
anvil --tempo --hardfork t1
# Or fork live testnet:
anvil --tempo --fork-url https://rpc.moderato.tempo.xyz
```

**Contract deployment and verification:**
```bash
export VERIFIER_URL=https://contracts.tempo.xyz
forge create src/PayrollTreasury.sol:PayrollTreasury \
  --rpc-url $TEMPO_RPC_URL --interactive --broadcast --verify
```

**Batch transactions in Forge:**
```bash
forge script script/Deploy.s.sol --broadcast --batch \
  --rpc-url $TEMPO_RPC_URL --private-key $PRIVATE_KEY
```

**Testnet RPC endpoints:**

| Provider | URL | Best For |
|----------|-----|----------|
| **Official** | `https://rpc.moderato.tempo.xyz` | Default, free |
| **Alchemy** | `https://tempo-testnet.g.alchemy.com/v2/<key>` | Monitoring, WebSocket |
| **dRPC** | `https://tempo-testnet.drpc.org` | Free tier, multi-region |
| **Chainstack** | Custom per account | Production, archive |
| **1RPC** | Via 1rpc.io | Privacy-preserving |

**Test token provisioning via `tempo_fundAddress`:**
```bash
cast rpc tempo_fundAddress 0xYOUR_ADDRESS \
  --rpc-url https://rpc.moderato.tempo.xyz
```
This funds the address with pathUSD, AlphaUSD, BetaUSD, and ThetaUSD.

### OpenZeppelin compatibility — critical caveats

Tempo is fully EVM-compatible, so OpenZeppelin modules deploy and work. However, **`BALANCE` and `SELFBALANCE` opcodes always return 0** because Tempo has no native gas token. Any OZ module that checks `address(this).balance` will see zero. `ReentrancyGuard`, `AccessControl`, `Ownable`, and proxy patterns (UUPS, Transparent) all work correctly. The critical override: replace all native balance checks with TIP-20 `balanceOf()` calls.

State creation costs differ significantly: **250,000 gas** for a new storage slot (vs. 20,000 on Ethereum) and **1,000 gas per byte** for contract creation (vs. 200 on Ethereum). Adjust gas estimates for deployment accordingly.

---

## Section 3: Stripe Bridge API — the fiat bridge that makes it real

Bridge (acquired by Stripe for $1.1B, completed February 2025) is a stablecoin orchestration platform providing fiat-to-crypto conversion, custodial wallets, Visa card issuance, and custom stablecoin creation. Base API URL: `https://api.bridge.xyz/v0/`. Sandbox: `https://api.sandbox.bridge.xyz/v0/`.

### Authentication and rate limits

All requests use API key authentication via the `Api-Key` header. Sandbox keys are prefixed with `sk-test`. Rate limit: **2,000 requests per 5 minutes** (increasable). Idempotency supported via `Idempotency-Key` header.

### Core endpoints for PayStream

**Customer onboarding (KYC delegation):**
```
POST /v0/customers
Body: { "type": "individual", "first_name": "...", "last_name": "...",
        "email": "...", "signed_agreement_id": "<uuid>",
        "residential_address": {...}, "birth_date": "...",
        "identifying_information": [{ "type": "ssn", ... }] }
```
Or use hosted KYC via `POST /v0/kyc_links` which returns a Persona-hosted verification URL. Bridge handles full KYC/KYB, ToS acceptance, sanctions screening, and AML monitoring. Developers handle creating customers and directing them to KYC links.

**Virtual accounts (employer fiat deposits):**
```
POST /v0/customers/{id}/virtual_accounts
Body: { "source": { "currency": "usd" },
        "destination": { "payment_rail": "ethereum", "currency": "usdc",
                         "address": "0x..." },
        "developer_fee_percent": "0.10" }
```
Response includes bank account details (account number, routing number, bank name) supporting ACH and wire deposits. USD, EUR (SEPA IBAN), MXN (CLABE/SPEI), and BRL (PIX, beta) virtual accounts are available.

**Transfers (fiat-to-crypto, crypto-to-fiat, crypto-to-crypto):**
```
POST /v0/transfers
Body: { "amount": "10000.00", "on_behalf_of": "cust_employer",
        "developer_fee": "10.00",
        "source": { "payment_rail": "ach_push", "currency": "usd" },
        "destination": { "payment_rail": "ethereum", "currency": "usdc",
                         "to_address": "0xPayrollTreasury" } }
```
Transfer states: `awaiting_funds` → `funds_received` → `payment_submitted` → `payment_processed`.

**Visa card issuance (employee spending):**
```
POST /v0/customers/{id}/card_accounts
Body: { "currency": "usdb", "chain": "solana",
        "crypto_account": { "type": "bridge_wallet", "address": "..." } }
```
Cards are Prepaid Debit Visa cards, currently available in **Argentina, Colombia, Ecuador, Mexico, Peru, Chile**, expanding to Europe, Africa, and Asia. Bridge converts stablecoin to fiat at point of sale automatically. **No FX markups or cross-border fees** for local transactions. Developers earn interchange revenue on every card swipe and can program custom transaction fees.

**Off-ramping to local bank:**
```
POST /v0/transfers
Body: { "amount": "1000.00", "on_behalf_of": "<customer-id>",
        "source": { "payment_rail": "bridge_wallet", "currency": "usdb",
                    "bridge_wallet_id": "wallet_123" },
        "destination": { "payment_rail": "ach", "currency": "usd",
                         "external_account_id": "ext_account_123" } }
```

### USDB and the yield opportunity

USDB is Bridge's infrastructure stablecoin, backed 1:1 by **US dollars held in cash and short-duration money market funds at BlackRock**. Unlike USDC where Circle retains all reserve economics, USDB **shares the majority of reserve earnings with developers**. Conversions between USDB and USDC are **free** — no minting, burning, or conversion fees. Reserves earn approximately **3.7% APY** from US Treasuries (3-month yield as of March 2026).

Bridge's **Open Issuance** (launched September 30, 2025) enables any business to launch a branded stablecoin backed by BlackRock, Fidelity, and Superstate reserves. PayStream could theoretically issue a branded payroll stablecoin, though for the hackathon, using USDB or pathUSD is the pragmatic path.

### Webhook architecture for real-time payroll tracking

Create webhooks via `POST /v0/webhooks`. Event categories include `transfer` (state transitions), `virtual_account.activity` (deposits received), `card_transaction` (purchase approved/settled/declined), and `customer` (KYC status changes). Webhooks use PKI-based signature verification with RSA public keys. Maximum 10 webhooks per application.

Bridge supports customers in **170+ countries**, with 20 prohibited (OFAC-sanctioned), 11 controlled, and 30+ restricted — leaving 120+ countries as "not high risk" including the US, UK, EU nations, Japan, Singapore, Australia, Brazil, Mexico, and Argentina.

---

## Section 4: Smart contract architecture for production payroll

### System overview

The PayStream protocol consists of five core contracts deployed on Tempo Moderato testnet. Each leverages Tempo-specific primitives that would be impossible or impractical on other chains.

### PayrollTreasury.sol — the employer's stablecoin vault

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITIP20} from "tempo-std/interfaces/ITIP20.sol";

contract PayrollTreasury {
    struct EmployerAccount {
        uint256 balance;           // TIP-20 6-decimal
        uint256 gasBudget;         // Pre-deposited fee sponsorship pool
        uint64 policyId;           // TIP-403 compliance policy
        address admin;
        bool active;
    }

    mapping(bytes32 => EmployerAccount) public employers; // keccak256(employerAddress)
    ITIP20 public immutable payToken; // pathUSD or USDB on Tempo

    function deposit(uint256 amount, bytes32 memo) external {
        payToken.transferFromWithMemo(msg.sender, address(this), amount, memo);
        employers[keccak256(abi.encodePacked(msg.sender))].balance += amount;
    }

    function fundGasBudget(uint256 amount) external {
        // Employer pre-deposits gas budget for employee fee sponsorship
        payToken.transferFrom(msg.sender, address(this), amount);
        employers[keccak256(abi.encodePacked(msg.sender))].gasBudget += amount;
    }
}
```

The treasury receives employer deposits via Bridge (employer sends fiat → Bridge converts to stablecoin → deposits to treasury contract). The `memo` field on deposits encodes the funding source reference for accounting reconciliation. The `gasBudget` tracks pre-deposited funds used for TempoTransaction fee sponsorship, ensuring employees never interact with gas.

### StreamVesting.sol — time-based salary streaming

```solidity
contract StreamVesting {
    struct VestingStream {
        address employer;
        address employee;
        uint256 totalAmount;       // 6-decimal precision
        uint256 released;
        uint64 startTime;
        uint64 endTime;
        uint64 cliffEnd;           // Optional cliff period
        bytes32 payrollMemo;       // ISO 20022 reference
    }

    mapping(uint256 => VestingStream) public streams;

    function release(uint256 streamId) external {
        VestingStream storage s = streams[streamId];
        require(block.timestamp >= s.cliffEnd, "cliff not reached");
        uint256 elapsed = block.timestamp - s.startTime;
        uint256 duration = s.endTime - s.startTime;
        uint256 vested = (s.totalAmount * elapsed) / duration;
        uint256 releasable = vested - s.released;
        s.released += releasable;
        // Use transferWithMemo for audit trail
        payToken.transferWithMemo(s.employee, releasable, s.payrollMemo);
    }
}
```

Simplex BFT's 0.5s deterministic finality means `block.timestamp` is reliable for vesting calculations — no risk of reorgs invalidating timestamp-dependent logic. Streams support monthly salary, bi-weekly pay periods, or continuous per-second streaming for contractors.

### EmployeeRegistry.sol — compliance-integrated identity mapping

```solidity
contract EmployeeRegistry {
    struct Employee {
        address wallet;
        bytes32 employerId;
        uint64 policyId;          // TIP-403 policy for this employee's transfers
        bytes32 employeeIdHash;   // Hash of offchain employee record
        bool active;
    }

    mapping(address => Employee) public employees;
    address public tip403Registry = 0x403c000000000000000000000000000000000000;

    function registerEmployee(
        address wallet, bytes32 employerId, bytes32 employeeIdHash
    ) external onlyEmployerAdmin(employerId) {
        // Verify wallet passes TIP-403 compliance
        (bool authorized) = ITIP403(tip403Registry).isAuthorized(
            employers[employerId].policyId, wallet
        );
        require(authorized, "wallet fails compliance check");
        employees[wallet] = Employee(wallet, employerId, 
            employers[employerId].policyId, employeeIdHash, true);
    }
}
```

The registry maps employee wallets to employer accounts and integrates TIP-403 compliance hooks. Before any employee can be registered, their wallet address is checked against the employer's compliance policy (OFAC blacklist). Employee PII is stored off-chain — only a hash of the employee record (`employeeIdHash`) goes on-chain, satisfying GDPR data minimization requirements.

### PayrollBatcher.sol — hundreds of payments in one atomic transaction

```solidity
contract PayrollBatcher {
    function executeBatchPayroll(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata memos
    ) external onlyAuthorizedAgent {
        require(recipients.length == amounts.length && 
                amounts.length == memos.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            payToken.transferWithMemo(recipients[i], amounts[i], memos[i]);
        }
        emit PayrollBatchExecuted(msg.sender, recipients.length, block.timestamp);
    }
}
```

When called via a TempoTransaction with call batching, the employer's payroll agent can approve the treasury spend and execute the batch in a single atomic transaction. With Payment Lane routing guaranteeing sub-cent fees and Simplex BFT's 0.5s finality, a batch of 500 employee payments confirms in under a second with total gas cost under $0.50.

The payroll automation agent uses a delegated access key (via the Account Keychain precompile) with a 2D nonce key, enabling it to submit payroll runs concurrently without nonce conflicts. The access key has per-TIP20 spending limits and expiry timestamps, preventing unauthorized fund movement.

### YieldRouter.sol — turning idle treasury into returns

```solidity
contract YieldRouter {
    enum YieldModel { EMPLOYER_KEEPS, EMPLOYEE_BONUS, SPLIT }

    struct YieldConfig {
        YieldModel model;
        uint16 employeeSplitBps;   // Basis points (e.g., 5000 = 50%)
        address yieldStrategy;      // External yield protocol
    }

    function depositToYield(bytes32 employerId, uint256 amount) external {
        // Route idle treasury to yield strategy
        payToken.approve(yieldConfig[employerId].yieldStrategy, amount);
        IYieldStrategy(yieldConfig[employerId].yieldStrategy).deposit(amount);
    }

    function distributeYield(bytes32 employerId) external {
        uint256 yield = IYieldStrategy(yieldConfig[employerId].yieldStrategy)
            .claimYield();
        if (yieldConfig[employerId].model == YieldModel.SPLIT) {
            uint256 employeeShare = (yield * yieldConfig[employerId].employeeSplitBps) / 10000;
            // Distribute proportionally to all employees
            _distributeToEmployees(employerId, employeeShare);
            // Remainder to employer
            payToken.transfer(employers[employerId].admin, yield - employeeShare);
        }
    }
}
```

### ISO 20022 memo encoding scheme

The 32-byte TIP-20 memo field packs payroll reference data using a fixed schema:

| Bytes | Field | Example |
|-------|-------|---------|
| 0–3 | Message type (ISO 20022 code) | `0x70616963` ("paic" = pain.001) |
| 4–11 | Employer ID (8 bytes) | `0x0000000000000001` |
| 12–19 | Employee ID (8 bytes) | `0x00000000000003E8` |
| 20–23 | Pay period (YYYYMMDD packed) | `0x07F60301` (2026-03-01) |
| 24–27 | Cost center (4 bytes) | `0x00000064` |
| 28–31 | Record hash (truncated SHA-256) | `0xDEADBEEF` |

This encoding enables off-chain reconciliation services to decode any TIP-20 Transfer event into structured payroll records without additional lookups.

### Security considerations

**Reentrancy in batch payments**: Each `transferWithMemo` call in the batch loop could theoretically re-enter the batcher. Use OpenZeppelin's `ReentrancyGuard` (which works correctly on Tempo) and the checks-effects-interactions pattern. TIP-20's protocol-level transfer execution mitigates most reentrancy vectors, but defense-in-depth is essential.

**Integer overflow in 6-decimal arithmetic**: Solidity 0.8+ has built-in overflow protection. However, when calculating vesting amounts, `(totalAmount * elapsed) / duration` should use a multiplication-before-division pattern and be tested with maximum realistic values (e.g., $10M payroll over 1-second duration).

**Front-running in yield routing**: On Tempo, Payment Lane transactions are sequenced by proposers with deterministic ordering, and 0.5s finality limits the window for MEV extraction. For additional protection, yield deposits/withdrawals can use private mempools or commit-reveal patterns.

**Upgradability**: Use UUPS proxy pattern (OpenZeppelin `UUPSUpgradeable`) over Transparent Proxy to save gas on every call. The UUPS upgrade logic lives in the implementation contract, reducing proxy overhead. Note the higher state creation cost on Tempo (250k gas per slot) when initializing proxy storage.

---

## Section 5: Full-stack implementation from zero to demo

### Recommended tech stack

- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui for rapid, polished component development
- **Blockchain interaction**: Viem (preferred for Tempo — has native `Abis` import from `viem/tempo`) + Wagmi v2 for React hooks
- **Wallet**: Privy SDK (Stripe-owned, confirmed Tempo support with `"caip2": "eip155:42431"`, working example at `github.com/privy-io/examples/tree/main/examples/privy-next-tempo`)
- **Database**: Supabase (PostgreSQL) for off-chain payroll records, employee PII, compliance logs
- **Deployment**: Vercel (frontend + API routes), Supabase (managed Postgres)
- **Smart contracts**: Foundry (Tempo fork) for development, testing, deployment

### Privy wallet integration for gasless onboarding

```typescript
import { PrivyProvider } from '@privy-io/react-auth';

const tempoChain = {
  id: 42431,
  name: 'Tempo Moderato Testnet',
  network: 'tempo-moderato',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.moderato.tempo.xyz'] }
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' }
  }
};

// Privy config with passkey authentication
<PrivyProvider
  appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
  config={{
    defaultChain: tempoChain,
    supportedChains: [tempoChain],
    loginMethods: ['email', 'sms', 'passkey'],
    embeddedWallets: { createOnLogin: 'users-without-wallets' }
  }}
>
```

Employees authenticate via email, SMS, or passkey — no seed phrases, no browser extensions. Privy creates an embedded wallet on Tempo automatically. For transactions, use the `caip2: "eip155:42431"` identifier.

### Employer dashboard features

The employer dashboard provides: **bulk CSV employee upload** (parse CSV with columns: name, email, wallet, salary, currency, pay frequency → batch-register via EmployeeRegistry), **real-time payroll status** (subscribe to TIP-20 Transfer events via WebSocket at `wss://rpc.moderato.tempo.xyz`), **treasury balance** (query PayrollTreasury contract), **yield earned** (query YieldRouter for accrued yield), and **compliance status per employee** (query TIP-403 `isAuthorized` for each wallet).

### Employee portal features

The employee portal delivers: **wallet setup via email/SMS** (Privy embedded wallet, no crypto knowledge required), **payment history with decoded memos** (parse the 32-byte memo into human-readable payroll fields), **Visa card management** (Bridge card API integration for spending), and **off-ramp to local bank** (Bridge transfer API for stablecoin-to-fiat conversion via ACH, SEPA, SPEI, or PIX).

### Calling PayrollBatcher with fee sponsorship via Viem

```typescript
import { createWalletClient, http } from 'viem';
import { tempoModerato } from 'viem/chains';
import { Abis } from 'viem/tempo';

const client = createWalletClient({
  chain: tempoModerato,
  transport: http('https://rpc.moderato.tempo.xyz')
});

// Execute batch payroll with fee sponsorship
const hash = await client.sendTransaction({
  type: 'tempo', // 0x76 transaction type
  calls: [
    {
      to: PAYROLL_TREASURY_ADDRESS,
      data: encodeFunctionData({
        abi: PayrollTreasuryAbi,
        functionName: 'approve',
        args: [BATCHER_ADDRESS, totalAmount]
      })
    },
    {
      to: PAYROLL_BATCHER_ADDRESS,
      data: encodeFunctionData({
        abi: PayrollBatcherAbi,
        functionName: 'executeBatchPayroll',
        args: [recipients, amounts, memos]
      })
    }
  ],
  feeToken: PATHUSD_ADDRESS, // 0x20c0...000
  // Fee sponsorship: employer pays gas
  feePayer: employerAddress,
  feePayerSignature: sponsorSig
});
```

### Database schema (Supabase PostgreSQL)

```sql
CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  tip403_policy_id BIGINT,
  treasury_contract TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES employers(id),
  wallet_address TEXT NOT NULL,
  email TEXT NOT NULL,
  employee_id_hash TEXT NOT NULL, -- SHA-256 of full record
  bridge_customer_id TEXT,       -- Bridge KYC customer ID
  card_account_id TEXT,          -- Bridge Visa card ID
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES employers(id),
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  total_amount NUMERIC(18,6),
  employee_count INTEGER,
  tx_hash TEXT,                  -- Tempo transaction hash
  block_number BIGINT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES payroll_runs(id),
  employee_id UUID REFERENCES employees(id),
  amount NUMERIC(18,6),
  memo BYTEA,                    -- 32-byte TIP-20 memo
  memo_decoded JSONB,            -- Parsed memo fields
  tx_hash TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Event indexing for reconciliation

```typescript
import { createPublicClient, http, parseAbiItem } from 'viem';

const client = createPublicClient({
  chain: tempoModerato,
  transport: http('https://rpc.moderato.tempo.xyz')
});

// Listen for TIP-20 TransferWithMemo events
const unwatch = client.watchEvent({
  address: PATHUSD_ADDRESS,
  event: parseAbiItem(
    'event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo)'
  ),
  onLogs: (logs) => {
    for (const log of logs) {
      const decoded = decodeMemo(log.args.memo);
      // Insert into Supabase for reconciliation
      await supabase.from('transactions').insert({
        amount: Number(log.args.amount) / 1e6,
        memo: log.args.memo,
        memo_decoded: decoded,
        tx_hash: log.transactionHash
      });
    }
  }
});
```

### Bridge webhook handling (Next.js API route)

```typescript
// app/api/webhooks/bridge/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('X-Webhook-Signature');
  const body = await request.text();
  // Verify PKI signature
  if (!verifyBridgeSignature(signature, body)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  const event = JSON.parse(body);
  switch (event.event_type) {
    case 'transfer.payment_processed':
      // Fiat deposit confirmed — update treasury balance
      await handleDepositConfirmed(event.event_object);
      break;
    case 'card_transaction.created':
      // Employee card swipe — log transaction
      await handleCardTransaction(event.event_object);
      break;
    case 'customer.updated':
      // KYC status change — update employee compliance status
      await handleKycUpdate(event.event_object);
      break;
  }
  return Response.json({ received: true });
}
```

### Environment variables

```bash
# .env.local
NEXT_PUBLIC_TEMPO_RPC=https://rpc.moderato.tempo.xyz
NEXT_PUBLIC_TEMPO_CHAIN_ID=42431
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
BRIDGE_API_KEY=sk-test-your-bridge-sandbox-key
BRIDGE_WEBHOOK_SECRET=your-webhook-signing-key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key
NEXT_PUBLIC_PAYROLL_TREASURY=0x...deployed-address
NEXT_PUBLIC_PAYROLL_BATCHER=0x...deployed-address
NEXT_PUBLIC_EMPLOYEE_REGISTRY=0x...deployed-address
```

---

## Section 6: Yield routing turns payroll float into revenue

### The yield mechanics

Employer payroll treasuries hold significant stablecoin float between deposit and disbursement. A company running biweekly payroll for 100 employees at $5,000 average salary holds $500,000 in float for up to 14 days. At current 3-month Treasury yields of **3.72%** (March 2026), that float generates approximately **$510/year** in passive yield — and this scales linearly with employer size and treasury duration.

Bridge's USDB shares the **majority of reserve earnings** with developers. For PayStream, this means the protocol earns yield on every dollar sitting in the treasury contract simply by holding USDB rather than USDC. No additional DeFi integration required for the base case.

### Yield distribution models

The YieldRouter supports three models configurable per employer:

- **Employer keeps yield**: Default model. Employer deposits stablecoins, earns yield on idle treasury. Simple value proposition: "Your payroll treasury earns 3.5%+ APY while waiting for payday."
- **Employee bonus model**: Yield accrued on the treasury is distributed proportionally to all employees as a bonus on top of their salary. Employees earn yield on their "pre-paycheck" allocation.
- **Split model**: Configurable basis-point split (e.g., 50/50) between employer and employee pool. The employee share serves as a retention incentive — employees who leave forfeit their accrued yield share.

### Realistic APY ranges

Based on current conditions: **3.5–4.25% APY** from T-bill-backed stablecoin reserves (USDB/USDC), with some DeFi lending protocols offering **4–5%** on USDC deposits. The BIS reports that crypto platforms offered 4.25% APY on USDC in September 2025 — more than 4× the average US bank deposit rate.

### Risk disclosure requirements

Under both the GENIUS Act and MiCA, stablecoin issuers are **prohibited from paying interest/yield directly to holders**. Yield must be generated through third-party mechanisms (DeFi protocols, money market exposure via Bridge's reserve sharing). PayStream must disclose: (1) yield is not guaranteed, (2) yield comes from reserve investments that carry market risk, (3) yield rates fluctuate with Treasury rates, (4) smart contract risk exists. Frame this as "treasury optimization" rather than "interest" to maintain regulatory clarity.

---

## Section 7: Why this moat compounds and cannot be replicated elsewhere

### The Tempo + Bridge stack creates a unique lock-in flywheel

**Architectural moat**: The combination of TIP-20 memo fields, TIP-403 policy registry, TempoTransaction fee sponsorship, Payment Lane guaranteed throughput, and Bridge's fiat on/off-ramps with Visa card issuance **cannot be assembled on any other chain**. Ethereum lacks native memo fields and compliance hooks. Solana lacks a standardized policy registry. No other L1 offers stablecoin-denominated gas with fee sponsorship and call batching in one transaction type.

**Compliance compounding**: TIP-403's on-chain sanctions screening combined with Bridge's KYC delegation creates a compliance layer that strengthens over time. Every new employee wallet that passes KYC becomes a verified node in the network. Every sanctioned address added to the blacklist policy protects all employers simultaneously. This shared compliance infrastructure becomes more valuable with each participant.

**Data moat from ISO 20022 memos**: Every PayStream transaction carries structured payroll metadata. Over time, this creates the richest on-chain payroll dataset in existence — searchable by employer, employee, pay period, cost center. Competitors without native memo fields cannot replicate this data density. Accounting integrations, audit tools, and analytics layers built on this data create deep switching costs.

**B2B2C flywheel**: Employers onboard → employees receive Privy wallets → employees receive Visa cards funded by stablecoins → employees use cards at merchants → merchants see stablecoin volume → merchants adopt Tempo for their own payments → more employers join. Each layer reinforces the next.

**Yield-based retention**: Employees earning 3.5%+ APY on their paycheck float have a tangible financial incentive to stay on the platform. Traditional bank accounts pay 0.5%. This yield differential creates measurable switching costs.

**Switching costs**: Once employees have Privy wallets, Bridge-issued Visa cards, configured bank off-ramp connections, and accumulated payment history with decoded memos, migrating to a competitor requires rebuilding every touchpoint. For employers, re-onboarding employees, re-deploying treasury contracts, and losing the ISO 20022 audit trail makes migration prohibitively expensive.

### How to frame this in the hackathon pitch

Lead with: "PayStream Global is the only payroll protocol that combines sub-second deterministic settlement, embedded OFAC compliance, gasless employee transactions, ISO 20022 payment metadata, fiat-to-crypto-to-Visa card full-cycle, and yield on idle treasury — and it can only exist on Tempo + Bridge." Emphasize that every feature leverages a Tempo-specific primitive that judges helped build.

---

## Section 8: Winning the Tempo × Stripe HIIT Hackathon on March 19

### The format demands speed and focus

The Tempo × Stripe "HIIT Hackathon" takes place **March 19, 2026** in San Francisco — 6 days away. The format is **3 rounds of building, back to back** (High Intensity Interval Training-style). This is not a 48-hour marathon; it is a series of rapid sprints where each round likely has a distinct deliverable.

### Judging criteria and how to maximize each

Based on standard blockchain hackathon frameworks and Tempo's ecosystem priorities:

**Innovation (25%)**: Demonstrate novel use of Tempo primitives that no existing product combines. The ISO 20022 memo encoding + TIP-403 compliance + fee sponsorship + yield routing combination is genuinely novel. No one has built enterprise payroll on a payment-native L1 before.

**Design and Implementation (25%)**: Ship a working demo, not slides. Use shadcn/ui for instant polish. Prioritize one flawless flow (employer deposits → batch payroll → employee receives → employee off-ramps) over many half-finished features. Code quality matters — clean contract architecture with NatSpec documentation signals engineering rigor.

**Presentation (25%)**: Open with the $150 international wire transfer pain point. Show the live demo in under 3 minutes. End with the Tempo-specific architecture diagram showing how each primitive contributes. Judges want to see you understand their technology deeply.

**Future Potential (25%)**: This is about **ecosystem alignment**, not generic product vision. Show how PayStream drives adoption of Tempo's Payment Lanes, TIP-20, TIP-403, and Bridge. Reference Klarna's KlarnaUSD on Tempo as proof of institutional demand. Position PayStream as the payroll rail that makes every Tempo ecosystem partner's users into wallet holders.

### Minimum viable demo that must work live

The core demo flow in under 90 seconds:
1. Employer logs in → sees treasury dashboard with balance
2. Employer uploads 3 employees via CSV → wallets auto-created via Privy
3. Employer clicks "Run Payroll" → PayrollBatcher executes on Tempo
4. Show **0.5-second finality** — transaction confirms instantly on Tempo Explorer
5. Switch to employee view → employee sees payment with decoded memo
6. Employee clicks "Off-ramp to bank" → Bridge transfer initiated

This flow touches every hackathon sponsor technology: Tempo (chain), TIP-20 (token), TIP-403 (compliance), TempoTransaction (batching + fee sponsorship), Bridge (off-ramp), and Privy (wallet).

### Stretch features that dramatically increase scores

If time permits after the core flow: (1) **Visa card issuance** for an employee via Bridge card API — judges will remember a live Visa card demo, (2) **yield dashboard** showing APY earned on idle treasury, (3) **streaming salary** where an employee's balance ticks up in real-time per-second.

### Time allocation for 3-round HIIT format

**Pre-hackathon (now through March 18)**: Deploy all smart contracts to Moderato testnet. Set up Privy with Tempo chain config. Get Bridge sandbox credentials. Build the Next.js scaffold with shadcn/ui. Pre-populate test data. Have the Foundry environment fully configured with `foundryup -n tempo`.

**Round 1**: Smart contract integration — wire up the frontend to deployed contracts. Get the basic deposit → batch payroll → confirm flow working end-to-end.

**Round 2**: Polish the UX. Add Bridge off-ramp integration. Implement memo decoding in the employee view. Add real-time event listening.

**Round 3**: Demo rehearsal. Record backup video. Prepare 2 slides (problem + architecture). Test everything with fresh wallets to simulate judge experience.

### Common mistakes to avoid

Never spend more than 20% of time on slides — judges want to see working code. Do not try to explain every smart contract; focus on the user experience. Do not demo with MetaMask — use Privy embedded wallets to show the "no-crypto-knowledge-required" UX. Have a pre-recorded backup demo in case of network issues. Do not build custom wallet infrastructure when Privy exists.

---

## Section 9: Regulatory positioning that's honest and impressive

### Stripe's licensing covers the heavy lifting

**Stripe holds money transmitter licenses across US states** and is a registered MSB with FinCEN. In the EU, Stripe Technology Europe Limited is authorized as an **EMI by the Central Bank of Ireland** (reference C187865), passporting across all EEA countries under PSD2. **Bridge Building Inc.** (NMLS #2450917) holds MTLs in 22+ states and expanding. Bridge Building Sp. Z.o.o. covers EEA payment services.

Building on Bridge API means PayStream operates under Bridge's licensed infrastructure **as long as the platform does not take custody or control of customer funds**. The smart contracts hold tokens, but Bridge handles the fiat conversion and banking rails. This architecture eliminates the need for independent MTLs (which would cost **$1M+ for nationwide US coverage** and take 18–24 months).

### GENIUS Act creates a potential single-license path

The GENIUS Act's PPSI framework could allow a stablecoin payroll platform to operate under a single federal license rather than 49 state MTLs — the implementing rules are expected by November 2026. K&L Gates analysis positions this as a "bespoke fintech license" for stablecoin payment services.

### GDPR compliance through architecture

Store all employee PII exclusively off-chain in Supabase. On-chain: only cryptographic hashes (the `employeeIdHash` in EmployeeRegistry) and payment amounts with encoded memos (which contain IDs, not names). If an employee exercises their right to erasure, delete the off-chain mapping — the on-chain hash becomes effectively anonymous without the lookup table. This "destroy the key" approach aligns with emerging EDPB guidance from April 2025 on blockchain-GDPR compatibility.

### Employment law reality check

In the US, the FLSA requires minimum wage paid in "cash or negotiable instruments." Stablecoins likely don't qualify. **Best practice**: structure payroll as fiat-denominated compensation with optional stablecoin settlement at the employee's election. Ensure statutory minimum wage is met in local currency before any conversion. For the hackathon, frame this as: "Employees choose their settlement preference — local bank account, stablecoin wallet, or Visa card."

### The pitch framing

"PayStream operates under Stripe/Bridge's existing money transmission licenses across 22+ US states and the EU. Our architecture ensures we never take custody of funds — Bridge handles all regulated money movement. Every transaction is screened against OFAC sanctions via TIP-403's on-chain policy registry. Employee PII stays off-chain with GDPR-compliant deletion capability. We're building on the first regulatory-clear stablecoin infrastructure stack, positioned for GENIUS Act compliance as implementation rules are finalized."

---

## Section 10: From hackathon to $100M ARR — the commercialization path

### 6-month roadmap (post-hackathon to mainnet)

Deploy on Tempo mainnet when it launches (expected later 2026). Migrate from Bridge sandbox to production API. Onboard 10 design partners — crypto-native companies already paying contractors in USDC. Implement Stripe Checkout integration for employer fiat deposits. Launch Visa cards for employees in Latin American markets (Bridge's initial card footprint). Achieve SOC 2 compliance for the off-chain database layer.

### 12-month roadmap

Expand to 100+ employer accounts. Add multi-currency support (EUR via SEPA virtual accounts, MXN via SPEI). Integrate Chainlink CCIP for cross-chain treasury management. Build accounting integrations (QuickBooks, Xero) that auto-import decoded memo fields. Launch the yield-sharing program for employee retention. Target remote-first startups and NGOs doing humanitarian transfers — organizations where traditional banking is slowest and most expensive.

### 24-month roadmap

Scale to 1,000+ employers and 50,000+ employee wallets. Expand Visa card program to Europe, Africa, and Asia as Bridge coverage grows. Launch Open Issuance branded stablecoin ("PayStream USD") for maximum yield capture. Build the merchant payment acceptance layer — employees spending via Visa cards at merchants who also accept Tempo stablecoins. Pursue independent PPSI license under GENIUS Act for full regulatory independence.

### Pricing model

- **Per-seat SaaS**: $5–$15/employee/month (vs. Deel's $49–$599)
- **Percentage of payroll volume**: 0.1–0.5% of total payroll processed (competitive with traditional wire fees)
- **Yield split**: 20% of treasury yield retained by PayStream as platform fee
- **Interchange revenue**: Share of Visa interchange on employee card transactions (typically 1.5–2% of transaction value)

### Target markets in order

1. **Crypto-native companies** (1,000+ already paying in crypto via Deel/Bitwage — immediate product-market fit)
2. **Remote-first startups** with international teams (pain of $50–$150 wire transfers per employee per month)
3. **NGOs and humanitarian organizations** (World Bank data shows 6.2% average remittance cost — PayStream offers sub-1%)
4. **Gig economy platforms** (contractors who want instant settlement and card access)
5. **Enterprise** (companies with 500+ international employees seeking treasury yield)

### Fundraising context

The stablecoin infrastructure VC landscape is white-hot. Investment in stablecoin companies surpassed **$1.5B in 2025** (30× from 2019), with $1.4B committed in January 2026 alone. Recent rounds: Rain ($250M Series C at $1.95B), BVNK ($50M Series B), Coinflow ($25M Series A). Key VCs: a16z crypto, Paradigm (Tempo's backer), Ribbit Capital (backed both Deel and Tempo), Dragonfly, Pantera, Coinbase Ventures. Y Combinator now offers $500K investments in USDC. Winning the Tempo × Stripe hackathon provides direct visibility to Paradigm and Stripe's investment networks.

### Team composition to scale beyond hackathon

- **Smart contract engineer** (Solidity, Foundry, security auditing)
- **Full-stack engineer** (Next.js, TypeScript, Supabase, API integrations)
- **Compliance/ops lead** (regulatory navigation, Bridge partnership management)
- **Growth lead** (sales to crypto-native companies, partnership development)
- **Designer** (enterprise UX for both employer dashboard and employee mobile experience)

### Key partnerships to pursue

- **Circle**: USDC native deployment on Tempo mainnet for maximum liquidity
- **Chainlink**: CCIP for cross-chain treasury deposits + Data Streams for real-time FX rates
- **Klarna**: Already on Tempo testnet with KlarnaUSD — explore integration where Klarna merchants can accept employee payroll card payments
- **Bitwage**: Potential acquisition target or partnership for their 4,500+ employer customer base
- **Chainalysis/TRM Labs**: Formalize compliance tooling integration for automated OFAC screening feeds to TIP-403 policies

---

## Conclusion: the convergence window is now

PayStream Global sits at the intersection of three converging forces: regulatory clarity (GENIUS Act + MiCA), infrastructure maturity (Tempo's payment-native L1 + Bridge's stablecoin orchestration), and market demand (1 in 4 companies already paying in crypto, $33T in stablecoin volume). The **6-day window before the HIIT Hackathon** is the opportunity to build the definitive proof-of-concept.

The technical moat is real and specific: TIP-20 memo fields create structured payroll data that no competitor can match. TIP-403 policy registry provides sanctions compliance at the protocol level. TempoTransaction fee sponsorship and call batching enable gasless, atomic batch payroll. Payment Lanes guarantee sub-cent fees regardless of network congestion. Bridge's Visa card issuance and fiat off-ramps complete the full payroll lifecycle. And USDB's yield sharing turns idle treasury into revenue.

The minimum viable demo — employer deposit, batch payroll execution with 0.5s finality, employee payment receipt with decoded ISO 20022 memo, and off-ramp initiation — can be built in a single sprint by a prepared developer. The smart contracts are straightforward Solidity deploying to a standard EVM. The frontend is a Next.js app with Privy wallets. The fiat layer is REST API calls to Bridge.

What makes PayStream Global a hackathon winner and a viable company is the same thing: it is the first protocol that makes stablecoin payroll feel like direct deposit while giving employers yield, employees Visa cards, and compliance teams audit trails — all settling in half a second for a tenth of a cent.