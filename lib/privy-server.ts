import { PrivyClient } from '@privy-io/server-auth'
import type { Transaction, VersionedTransaction } from '@solana/web3.js'

/**
 * lib/privy-server.ts
 * Single entry point for all new agent-initiated signing on Remlo.
 *
 * As of Ship 1 (2026-04-19), Privy server wallets are the default signing
 * path for any new agent-initiated broadcast. The Tempo batch path using
 * `REMLO_AGENT_PRIVATE_KEY` is transitional and migrates here in Week 3.
 *
 * Policy enforcement happens inside Privy's infrastructure before signing.
 * Our server cannot bypass the policy by design.
 */

let cachedClient: PrivyClient | null = null

export function getPrivyServerClient(): PrivyClient {
  if (cachedClient) return cachedClient

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET
  const authorizationPrivateKey = process.env.PRIVY_AUTHORIZATION_KEY

  if (!appId) throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is not set')
  if (!appSecret) throw new Error('PRIVY_APP_SECRET is not set — get it from the Privy dashboard')

  cachedClient = new PrivyClient(appId, appSecret, {
    walletApi: authorizationPrivateKey ? { authorizationPrivateKey } : undefined,
  })
  return cachedClient
}

export interface AgentWallets {
  tempoWallet: { id: string; address: string } | null
  solanaWallet: { id: string; address: string } | null
}

/**
 * Returns the server-managed agent wallets for Tempo (reference-only in Ship 1)
 * and Solana (active broadcast path in Ship 1). Returns null for either chain
 * if the env vars aren't set — callers MUST handle null, not crash.
 */
export function getRemloAgentWallets(): AgentWallets {
  const tempoId = process.env.PRIVY_TEMPO_AGENT_WALLET_ID
  const tempoAddress = process.env.PRIVY_TEMPO_AGENT_WALLET_ADDRESS
  const solanaId = process.env.PRIVY_SOLANA_AGENT_WALLET_ID
  const solanaAddress = process.env.PRIVY_SOLANA_AGENT_WALLET_ADDRESS

  return {
    tempoWallet: tempoId && tempoAddress ? { id: tempoId, address: tempoAddress } : null,
    solanaWallet: solanaId && solanaAddress ? { id: solanaId, address: solanaAddress } : null,
  }
}

export class PrivyPolicyRejectedError extends Error {
  constructor(public readonly reason: string, public readonly raw?: unknown) {
    super(`Privy policy rejected the transaction: ${reason}`)
    this.name = 'PrivyPolicyRejectedError'
  }
}

/**
 * Signs an unsigned Solana transaction via a Privy server wallet.
 * Returns the signed transaction. Throws PrivyPolicyRejectedError if the policy
 * engine rejects the transaction (whitelist violation, spend cap hit, etc).
 */
export async function signSolanaTransaction(
  walletId: string,
  transaction: Transaction | VersionedTransaction,
): Promise<Transaction | VersionedTransaction> {
  const privy = getPrivyServerClient()

  try {
    const result = await privy.walletApi.solana.signTransaction({
      walletId,
      transaction,
    })
    return result.signedTransaction
  } catch (err) {
    const reason = extractPolicyReason(err)
    if (reason) throw new PrivyPolicyRejectedError(reason, err)
    throw err
  }
}

/**
 * Tempo transaction shape accepted by the Privy server wallet signer.
 *
 * Tempo is EVM-compatible (Osaka EVM) with pathUSD as the native gas token —
 * standard EIP-1559 (type 2) tx semantics apply. pathUSD denominates
 * maxFeePerGas / maxPriorityFeePerGas base units directly; no custom envelope
 * type byte is required for vanilla contract calls like ERC-8004 feedback.
 *
 * Caveats known at Ship 7 time:
 *   - Privy's `transaction.type` is constrained to 0 | 1 | 2. If Tempo later
 *     introduces a custom tx type byte for advanced features (e.g. sponsored
 *     gas via a fee-token field), this path won't cover it — callers should
 *     fall back to `REMLO_AGENT_PRIVATE_KEY` via the USE_LEGACY_TEMPO_SIGNER
 *     env flag in `lib/reputation/erc8004.ts`.
 *   - Gas estimation is caller's responsibility. Tempo state-creation is
 *     12.5× Ethereum (TIP-1000: new storage slot ≈ 250k gas), so callers must
 *     size `gasLimit` conservatively — a 20M gas limit is a safe default for
 *     ERC-8004 `giveFeedback` calls that touch 2-3 storage slots.
 */
export interface TempoTransactionRequest {
  to: `0x${string}`
  data: `0x${string}`
  nonce: number
  chainId: number
  gasLimit: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  value?: bigint
}

/**
 * Signs an unsigned EVM transaction against Tempo via a Privy server wallet.
 * Returns the signed, RLP-encoded raw tx — broadcast via viem/ethers.
 */
export async function signTempoTransaction(
  walletId: string,
  tx: TempoTransactionRequest,
): Promise<`0x${string}`> {
  const privy = getPrivyServerClient()

  const hex = (v: bigint | number): `0x${string}` =>
    `0x${(typeof v === 'bigint' ? v : BigInt(v)).toString(16)}` as `0x${string}`

  try {
    const result = await privy.walletApi.ethereum.signTransaction({
      walletId,
      transaction: {
        type: 2,
        to: tx.to,
        data: tx.data,
        nonce: hex(tx.nonce),
        chainId: hex(tx.chainId),
        gasLimit: hex(tx.gasLimit),
        maxFeePerGas: hex(tx.maxFeePerGas),
        maxPriorityFeePerGas: hex(tx.maxPriorityFeePerGas),
        ...(tx.value ? { value: hex(tx.value) } : {}),
      },
    })
    return result.signedTransaction as `0x${string}`
  } catch (err) {
    const reason = extractPolicyReason(err)
    if (reason) throw new PrivyPolicyRejectedError(reason, err)
    throw err
  }
}

function extractPolicyReason(err: unknown): string | null {
  if (!(err instanceof Error)) return null
  const msg = err.message.toLowerCase()
  if (
    msg.includes('policy') ||
    msg.includes('denied') ||
    msg.includes('not allowed') ||
    msg.includes('whitelist') ||
    msg.includes('cap')
  ) {
    return err.message
  }
  return null
}
