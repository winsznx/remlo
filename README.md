**Remlo is the payroll, agent payment, and reputation protocol for borderless work. Companies pay teams in stablecoins on Tempo or Solana. Agents pay our APIs in USDC on Tempo, Base, or Solana. Every settled payment writes portable on-chain reputation.**

Three primitives, two settlement chains, one stack. Funds are custodied by the protocol, not by Remlo. Every settled action produces a credential that another protocol can read.

---

## Live deployments

### Tempo Moderato (chainId `42431`)

| Contract | Address |
|---|---|
| PayrollTreasury | [`0xEC73B9762b13148C54De792d70a2DB48690fD1F7`](https://explore.moderato.tempo.xyz/address/0xEC73B9762b13148C54De792d70a2DB48690fD1F7) |
| PayrollBatcher | [`0xeEBa523F0AB45838F4e2c2872cEd0d5512bb4e88`](https://explore.moderato.tempo.xyz/address/0xeEBa523F0AB45838F4e2c2872cEd0d5512bb4e88) |
| EmployeeRegistry | [`0x2B8fC6eACBd89a7B01bB400cDd492ff0CE931a7e`](https://explore.moderato.tempo.xyz/address/0x2B8fC6eACBd89a7B01bB400cDd492ff0CE931a7e) |
| StreamVesting | [`0xEEd5bab5A4A09fd59610513C95E106D285c87A2F`](https://explore.moderato.tempo.xyz/address/0xEEd5bab5A4A09fd59610513C95E106D285c87A2F) |
| YieldRouter | [`0x718B2bBfC6434AcaD06416Ad6d51dC6B0A7e3d42`](https://explore.moderato.tempo.xyz/address/0x718B2bBfC6434AcaD06416Ad6d51dC6B0A7e3d42) |
| ERC-8004 IdentityRegistry | [`0x1279d568C096937f73E1624B160A42eD67f7a485`](https://explore.moderato.tempo.xyz/address/0x1279d568C096937f73E1624B160A42eD67f7a485) |
| ERC-8004 ReputationRegistry | [`0x9f514D7ad37507630541a5557dF325EC0eDC4ad7`](https://explore.moderato.tempo.xyz/address/0x9f514D7ad37507630541a5557dF325EC0eDC4ad7) |
| ERC-8004 ValidationRegistry | [`0x2eeC2CA27E8428c409516E9418bb7F6560553B78`](https://explore.moderato.tempo.xyz/address/0x2eeC2CA27E8428c409516E9418bb7F6560553B78) |

RPC: `https://rpc.moderato.tempo.xyz`. Stablecoin: USDC.e at `0x20C000000000000000000000b9537d11c60E8b50`.

### Solana Devnet

| Program | Address |
|---|---|
| `remlo_escrow` (Anchor) | [`2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA`](https://explorer.solana.com/address/2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA?cluster=devnet) |
| SAS Credential Authority | [`BxoTaz3cbrVafhA2chLWAPNzdV5JAvh1YTHJbgD79kn7`](https://explorer.solana.com/address/BxoTaz3cbrVafhA2chLWAPNzdV5JAvh1YTHJbgD79kn7?cluster=devnet) |

The escrow program runs the M-4 audit fix as of 2026-05-03 (approved verdicts now require `confidence_bps > 0`, enforced on-chain).

---

## The three primitives

### Payroll

Companies fund a treasury and run batched payouts in two clicks. Tempo settlement lands in under a second; Solana settlement runs through SPL transfers and Streamflow streams. Every payment carries a 32-byte ISO 20022 memo so compliance pipelines can index by `messageType`, `employerId`, `employeeId`, and `payPeriod` without parsing tx logs. Employees can elect streaming compensation through StreamVesting on Tempo or Streamflow on Solana and claim accrued balance any time before payday.

The same execution rail powers `/api/mpp/agent/pay`, the agent to agent payment endpoint. External agents pay $0.05 in USDC and Remlo broadcasts a single recipient transfer from the named employer's treasury, capped by per transaction and per day spend limits the employer set in advance.

### Escrow

A three party coordination primitive on Solana. The requester locks USDC in an escrow PDA with a rubric. The worker submits a deliverable URI. A validator posts a verdict on-chain. Funds are custodied by the `remlo_escrow` Anchor program, not by Remlo.

Only `post_verdict` requires a privileged signer (the Remlo Privy server wallet, policy gated to that one instruction). `settle`, `refund`, and `expired_refund` are permissionless. Even under a fully compromised server, funds remain claimable by the correct counterparty because the program rejects any settle that doesn't match the recorded verdict and PDA.

Default validator: `llm_claude`. Configurable: human arbitrators or multi validator consensus. Consensus rules supported are `simple_majority`, `unanimous`, and `weighted`. When N validators are configured, votes persist in Supabase and one atomic `post_verdict` is broadcast on-chain when the rule resolves.

### Reputation

Settled work writes portable on-chain reputation on both chains.

On Solana, four Solana Attestation Service schemas attest to recipient counterparties: `remlo-payment-completed`, `remlo-escrow-settled`, `remlo-escrow-refunded`, `remlo-employer-verified`. On Tempo, every agent pay or escrow settlement writes an ERC-8004 `giveFeedback` entry to the counterparty agent's identity, with `int128` value on a -100..100 scale and structured tags.

Reputation is queryable. The escrow flow already uses SAS attestation counts to tier worker wallets and scale escrow expiry. Trusted workers (20+ prior attestations) earn shorter floors. Anyone can read any subject's reputation:

```bash
curl https://www.remlo.xyz/api/reputation/<address>
```

Free, no auth.

---

## For agents

Most paid endpoints accept payment on three chains in parallel. The 402 challenge surfaces every option in one response. AgentCash, raw `@x402/core`, Coinbase Agent Kit, and any custom HTTP client read the same body and pick whichever rail their wallet has balance on.

```
HTTP/1.1 402 Payment Required
WWW-Authenticate: Payment realm="www.remlo.xyz", method="tempo", chainId="4217",
                      currency="0x20C00000...", recipient="0xC9231...",
                      amount="0.01"
Content-Type: application/json
Cache-Control: no-store

{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "amount": "10000",
      "payTo": "0xC9231..."
    },
    {
      "scheme": "exact",
      "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "amount": "10000",
      "payTo": "BxoTaz3..."
    }
  ]
}
```

Server inspects `Authorization: Payment ...` (Tempo MPP, with legacy `mpp ...` accepted) or `X-PAYMENT` (Base / Solana x402) on retry, dispatches to the right verifier, runs the handler, settles fire and forget after the response goes out.

State mutating endpoints that touch Tempo treasury balances (payroll execute, fiat off ramp) stay Tempo only. Charging in another currency for a Tempo state mutation creates a settlement asymmetry that doesn't roll back cleanly if the on-chain action reverts.

Discover endpoints via the OpenAPI spec:

```bash
curl https://www.remlo.xyz/openapi.json
```

Or via AgentCash discovery:

```bash
npx -y agentcash@latest discover https://www.remlo.xyz
```

Both Remlo agents are registered in the public ERC-8004 IdentityRegistry on Tempo. Read live reputation and discovery metadata:

```bash
curl https://www.remlo.xyz/api/agents/remlo
```

---

## Architecture

```
                       Employer dashboard
                       (Next.js, Privy auth)
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
     Tempo payroll        Solana payroll        Escrow (Solana)
     PayrollBatcher       Streamflow            remlo_escrow
     StreamVesting        SPL Token             Anchor program
            │                   │                   │
            └─────────┬─────────┴─────────┬─────────┘
                      │                   │
                      ▼                   ▼
             ERC-8004 on Tempo       SAS on Solana
             Identity / Reputation   4 credential
             Validation              schemas

  Agents call /api/mpp/* and /api/x402/* paying USDC on
  Tempo, Base, or Solana via x402 / mpp protocol negotiation.
```

Signer authority is scoped end to end. The Remlo Privy server wallets on each chain are policy gated to whitelisted programs and instructions. No raw keys appear in any agent initiated signing path on Solana, and Tempo ERC-8004 feedback writes go through the same Privy wallet. Funds in escrow PDAs and payroll treasuries are never accessible via any off-chain key.

---

## Running locally

```bash
pnpm install
cp .env.local.example .env.local
# Fill in: Privy app credentials, Anthropic key, Supabase project + service key,
# Tempo + Solana fee recipient EOAs, Bridge sandbox keys (optional, but employee
# KYC blocks until set), Resend API key for transactional email.
pnpm dev
```

Requirements:

- A Privy app with email + SMS + wallet login methods enabled.
- A Supabase project with every migration under `db/migrations/` applied.
- An Anthropic API key.
- A Bridge sandbox key (optional. The app boots without it, but employee invites that need KYC return null until a key is set.)
- The deployed contracts above (or your own redeployments).

---

## Apps and surfaces

- **Employer dashboard** at `/dashboard`. Treasury, team, payroll wizard, escrows, council, reputation, AI agent, cards, compliance.
- **Employee portal** at `/portal`. Salary, wallet, card, off-ramp, payments, reputation.
- **Public marketing** at `/`, `/agents`, `/pricing`, `/about`.
- **MPP / x402 API** at `/api/mpp/*` and `/api/x402/*`. OpenAPI spec at `/openapi.json`.
- **Mintlify docs** at [docs.remlo.xyz](https://docs.remlo.xyz).

---

## Contracts

**Tempo (Solidity)** under [`contracts/`](./contracts/):

- `PayrollTreasury`. Per employer stablecoin custody with memo indexed deposits.
- `PayrollBatcher`. Atomic multi employee distribution with fee accounting.
- `StreamVesting`. Native streaming compensation.
- `EmployeeRegistry`. Compliance anchoring (KYC status, jurisdiction metadata, TIP-403 policy binding).
- `YieldRouter`. Treasury idle balance routing.
- `erc8004/IdentityRegistry`, `ReputationRegistry`, `ValidationRegistry`. UUPS upgradeable trustless agents registries (ERC-8004).

**Solana (Anchor)** under [`solana/`](./solana/):

- `remlo_escrow`. Three party escrow with pluggable validator authority, atomic settlement, and permissionless post verdict operations.

---

## License

MIT.
