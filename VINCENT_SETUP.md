# Lit Protocol Chipotle PKP Signing — Setup Guide

Remlo's autonomous payroll agent signs Tempo L1 transactions using Lit Protocol Chipotle (v3). The agent's private key is held inside Lit's distributed TEE network — it never exists in one place, and no single node can sign independently.

The integration uses the Chipotle REST API directly (`api.dev.litprotocol.com`). No SDK node client is required.

---

## Live Credentials (Dev Network)

The following credentials were provisioned by running `scripts/setup-vincent.ts` and are already in `.env.local`:

```
LIT_API_KEY=NIaeZIW728rH9CPjjxLjP0+dKWM7SU4OYGOv3KUz21o=   # Admin key — manage groups/CIDs only
LIT_USAGE_KEY=7S2iwQbeU2YaQMU7nqRQlFLzz7gf+4d3SKuI+2zbAgA=  # Execute key — used by the signing runtime
VINCENT_PKP_ETH_ADDRESS=0x3324a8B644a78ed5c9EEBbD0e661b67FE417342F  # PKP wallet address
```

These target `api.dev.litprotocol.com` (Lit Chipotle dev network). This network is persistent and suitable for demos and testnet deployments. The PKP wallet is live, the signing action is pre-authorized, and the demo agent will produce real on-chain transactions when run.

To use the Lit production network for mainnet deployments:
```bash
LIT_API_URL=https://api.litprotocol.com/core/v1 npx ts-node scripts/setup-vincent.ts
```

---

## What Was Set Up

1. **Lit account** — account with admin API key
2. **PKP wallet** — `0x3324a8B644a78ed5c9EEBbD0e661b67FE417342F`
3. **Signing group** — `remlo-payroll-signers` (group id 1) with PKP added
4. **Usage key** — scoped to execute-only in the signing group
5. **Signing action** — IPFS CID `QmSAfc7Hh6MPhe3T3fTBVEvryYR6ChaeHf2icins23aET7` pre-authorized in the group

---

## How Signing Works

`lib/vincent-agent.ts` exports `signWithVincent(unsignedTx: UnsignedTempoTx)`:

1. Serializes the unsigned EIP-1559 transaction via ethers v5 `serializeTransaction`
2. POSTs to `POST /lit_action` with `LIT_USAGE_KEY` and the PKP address
3. The Lit Action runs inside a TEE:
   - Retrieves the PKP private key via `Lit.Actions.getPrivateKey({ pkpId })`
   - Calls `ethers.Wallet.signTransaction()` — the key never leaves the enclave
   - Returns `{ signedTransaction: "0x..." }`
4. Returns the signed tx hex to the caller

The Lit Action code is a stable constant — changing it changes the IPFS CID and requires re-authorizing it via the setup script.

---

## Re-provisioning (Fresh Setup)

```bash
npx ts-node scripts/setup-vincent.ts
```

The script creates a new account, mints a PKP, creates the signing group and usage key, pre-authorizes the signing action CID, and prints the three env vars.

To re-run against an existing account (e.g., to add a new PKP):
```bash
LIT_API_KEY=<your-admin-key> npx ts-node scripts/setup-vincent.ts
```

To reuse an existing PKP:
```bash
LIT_API_KEY=<key> VINCENT_PKP_ETH_ADDRESS=0x... npx ts-node scripts/setup-vincent.ts
```

---

## Fund the PKP Wallet

For agent-initiated transactions on Tempo L1, the PKP wallet needs pathUSD for payroll funds and LPX/ETH for gas. Deposit to:

```
0x3324a8B644a78ed5c9EEBbD0e661b67FE417342F  (PKP wallet — Tempo L1, chainId 4217)
```

---

## Replacing `getServerWalletClient(DEPLOYER_KEY)` in Route Handlers

The production migration path: replace raw-key signing in route handlers with PKP signing.

**Current** (`app/api/mpp/agent/session/treasury/route.ts`):
```typescript
const walletClient = getServerWalletClient(DEPLOYER_KEY)
const txHash = await walletClient.writeContract({ ... })
```

**With Lit PKP** (future):
```typescript
// 1. Build calldata via viem's encodeFunctionData
// 2. Estimate gas and fetch nonce from Tempo RPC
// 3. Call signWithVincent(unsignedTx) → signedTx hex
// 4. Broadcast: await publicClient.sendRawTransaction({ serializedTransaction: signedTx })
```

---

## Production Notes

- `LIT_API_KEY` should be kept server-only — it can manage groups and mint PKPs
- `LIT_USAGE_KEY` is scoped execute-only, but still server-only (don't expose to browser)
- The signing action CID is immutable — the action code is content-addressed on IPFS
- To rotate the PKP, mint a new one via `GET /create_wallet`, add it to the group, update `VINCENT_PKP_ETH_ADDRESS`
