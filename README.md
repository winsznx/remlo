**Remlo is a multi-chain payroll and agent-coordination protocol for stablecoin payments, LLM-judged escrow, and cross-chain reputation credentials.**

Remlo gives employers, workers, and autonomous agents a single substrate for borderless compensation: stablecoin payroll on two chains, three-party escrow with programmable verdicts, and portable on-chain reputation that follows a counterparty across protocols. Every primitive settles on-chain — funds custody is enforced by the program, not by Remlo.

---

## Live deployments

| Primitive | Chain | Address / Program ID |
|---|---|---|
| PayrollTreasury | Tempo Moderato | [`0xeFac4A0cC3D54903746e811f6cd45DD7F43A43a5`](https://explore.moderato.tempo.xyz/address/0xeFac4A0cC3D54903746e811f6cd45DD7F43A43a5) |
| PayrollBatcher | Tempo Moderato | [`0x90657d3F18abaB8B1b105779601644dF7ce4ee65`](https://explore.moderato.tempo.xyz/address/0x90657d3F18abaB8B1b105779601644dF7ce4ee65) |
| StreamVesting | Tempo Moderato | [`0x83ac4D8E7957F9DCD2e18F22EbD8b83c2BDD3021`](https://explore.moderato.tempo.xyz/address/0x83ac4D8E7957F9DCD2e18F22EbD8b83c2BDD3021) |
| EmployeeRegistry | Tempo Moderato | [`0xe7DdA49d250e014769F5d2C840146626Bf153BC4`](https://explore.moderato.tempo.xyz/address/0xe7DdA49d250e014769F5d2C840146626Bf153BC4) |
| YieldRouter | Tempo Moderato | [`0x78B0548c7bb5B51135BBC87382f131d85abf1061`](https://explore.moderato.tempo.xyz/address/0x78B0548c7bb5B51135BBC87382f131d85abf1061) |
| ERC-8004 IdentityRegistry | Tempo Moderato | [`0x1279d568C096937f73E1624B160A42eD67f7a485`](https://explore.moderato.tempo.xyz/address/0x1279d568C096937f73E1624B160A42eD67f7a485) |
| ERC-8004 ReputationRegistry | Tempo Moderato | [`0x9f514D7ad37507630541a5557dF325EC0eDC4ad7`](https://explore.moderato.tempo.xyz/address/0x9f514D7ad37507630541a5557dF325EC0eDC4ad7) |
| ERC-8004 ValidationRegistry | Tempo Moderato | [`0x2eeC2CA27E8428c409516E9418bb7F6560553B78`](https://explore.moderato.tempo.xyz/address/0x2eeC2CA27E8428c409516E9418bb7F6560553B78) |
| `remlo_escrow` (Anchor program) | Solana Devnet | [`2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA`](https://explorer.solana.com/address/2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA?cluster=devnet) |
| SAS Credential Authority | Solana Devnet | [`BxoTaz3cbrVafhA2chLWAPNzdV5JAvh1YTHJbgD79kn7`](https://explorer.solana.com/address/BxoTaz3cbrVafhA2chLWAPNzdV5JAvh1YTHJbgD79kn7?cluster=devnet) |

Tempo Moderato runs at chain ID `42431` (`https://rpc.moderato.tempo.xyz`). Solana addresses resolve on `devnet`.

---

## The three primitives

### Payroll

Employers deposit a stablecoin balance into `PayrollTreasury` and release payroll in atomic batches via `PayrollBatcher`. Employees can elect streaming compensation through `StreamVesting` (Tempo, native) or Streamflow (Solana). `/api/mpp/agent/pay` exposes the same settlement rail to external autonomous agents: authorized callers route USDC payments subject to per-transaction and per-day spend caps configured by the employer, with full audit trail and ERC-8004 feedback written on every success.

### Escrow

A three-party coordination primitive on Solana. The requester locks USDC in an escrow PDA with a rubric, the worker submits a deliverable URI, and a validator (default: Claude; configurable to human arbitrators or multi-validator consensus) posts a verdict on-chain. Funds are custodied during the escrow period by the `remlo_escrow` Anchor program — not by Remlo. Only `post_verdict` requires a privileged signer (the Remlo Privy server wallet, policy-gated to that single instruction); `settle`, `refund`, and `expired_refund` are permissionless on-chain. Even under a fully compromised server, funds remain claimable by the correct counterparty.

Optional multi-validator consensus supports `simple_majority`, `unanimous`, and `weighted` strategies over `llm_claude` and `human` validator types. When configured, N validators vote in Supabase; `tryFinalizeConsensus` broadcasts one atomic `post_verdict` on-chain when the consensus rule resolves.

### Reputation

Settled work writes portable, on-chain reputation credentials on both chains. On Solana, four Solana Attestation Service (SAS) schemas — `remlo-payment-completed`, `remlo-escrow-settled`, `remlo-escrow-refunded`, `remlo-employer-verified` — attest to recipient counterparties. On Tempo, every agent-pay or escrow settlement writes an ERC-8004 `giveFeedback` entry to the counterparty agent's identity, with `int128` value on a -100..100 scale and structured tags.

Reputation is read-back queryable: the escrow flow uses SAS attestation counts to reputation-tier worker wallets and scale escrow expiry accordingly. Unknown workers get the full requested waiting period; trusted workers (20+ prior attestations) earn a shorter floor.

---

## Architecture

```
                      ┌──────────────────────────┐
                      │      Employer UI         │
                      │   (Next.js, Privy auth)  │
                      └────────────┬─────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
       ┌───────────────┐  ┌────────────────┐  ┌────────────────┐
       │ Tempo payroll │  │ Solana payroll │  │ Escrow (Solana)│
       │ PayrollBatcher│  │ SPL Token +    │  │ remlo_escrow   │
       │ StreamVesting │  │ Streamflow     │  │ Anchor program │
       └───────┬───────┘  └────────┬───────┘  └────────┬───────┘
               │                   │                    │
               └─────────┬─────────┴────────┬───────────┘
                         │                  │
                         ▼                  ▼
            ┌────────────────────┐  ┌──────────────────┐
            │ ERC-8004 on Tempo  │  │ SAS on Solana    │
            │ Identity /         │  │ 4 credential     │
            │ Reputation /       │  │ schemas          │
            │ Validation         │  │                  │
            └────────────────────┘  └──────────────────┘
```

All signer authority is scoped. The Remlo Privy server wallet on each chain is policy-gated to whitelisted programs and instructions; no raw keys appear in any agent-initiated signing path on Solana, and Tempo ERC-8004 feedback writes sign through the same Privy wallet. Funds in the escrow PDA and the payroll treasury are never accessible via any off-chain key.

---

## For integrators

Discover Remlo's endpoints via the OpenAPI spec:

```
curl https://remlo.xyz/openapi.json
```

Or via the agentcash discovery protocol:

```
npx -y @agentcash/discovery@latest check https://remlo.xyz
```

Our agents are registered in the public ERC-8004 IdentityRegistry on Tempo. Read both agents' live reputation + discovery metadata:

```
curl https://remlo.xyz/api/agents/remlo
```

The public `/agents` page documents the full registration flow for external agents that want to transact against Remlo employers and build mutual on-chain reputation.

---

## Running locally

```bash
pnpm install
cp .env.local.example .env.local
# populate .env.local: Privy app credentials, Anthropic key,
# Supabase project + service key, Tempo contract addresses,
# Solana program ID, and ERC-8004 registry addresses.
pnpm dev
```

Local runtime requires a Privy app, a Supabase project with the migrations under `db/migrations/` applied, an Anthropic API key, and the deployed contract / program addresses listed above (or your own deployments).

---

## Contracts

**Tempo (Solidity)** — under [`contracts/`](./contracts/):

- `PayrollTreasury` — per-employer stablecoin custody with memo-indexed deposits
- `PayrollBatcher` — atomic multi-employee payroll distribution with fee accounting
- `StreamVesting` — native streaming compensation
- `EmployeeRegistry` — compliance anchoring (KYC status, jurisdiction metadata)
- `YieldRouter` — treasury idle-balance routing
- `erc8004/IdentityRegistry`, `erc8004/ReputationRegistry`, `erc8004/ValidationRegistry` — ERC-8004 trustless-agents registries (UUPS-upgradeable)

**Solana (Anchor)** — under [`solana/`](./solana/):

- `remlo_escrow` — three-party escrow with pluggable validator authority, atomic settlement, permissionless post-verdict operations

---

## License

MIT.
