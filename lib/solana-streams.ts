/**
 * lib/solana-streams.ts — Solana payroll streaming via Streamflow Protocol.
 *
 * Ship 5 flipped this from stub → real `@streamflow/stream` integration on
 * Solana devnet. The exported types (`SolanaStreamConfig`, `SolanaStreamHandle`,
 * `SolanaStreamCancellation`) are unchanged from Ship 4 — no caller breaks.
 *
 * Signing path: the Privy Solana server wallet is injected into Streamflow
 * via `createPrivySignerAdapter` (see `lib/solana-signer-adapter.ts`).
 * Streamflow's SDK treats `invoker: SignerWalletAdapter | Keypair` — we
 * supply the adapter shape with a type-level cast at the boundary.
 *
 * Policy requirement: the Privy Solana wallet's policy must whitelist
 * Streamflow's devnet program ID. The Privy Solana policy must whitelist it
 * alongside the other agent-callable programs.
 *
 * Out-of-scope (Ship 6+):
 *   - Mainnet support (SDK handles it; we just swap cluster)
 *   - Top-up + transfer stream ops
 *   - Claim-side attestation enqueue (SAS `remlo-stream-claimed` schema)
 */
import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import {
  SolanaStreamClient,
  PROGRAM_ID,
  type ICreateStreamData,
  type ICreateStreamExt,
  type ICancelData,
  type IInteractStreamExt,
} from '@streamflow/stream'
import { ICluster } from '@streamflow/common'
import { SOLANA_RPC_URL, SOLANA_CLUSTER, SOLANA_USDC_MINT_DEVNET, SOLANA_USDC_MINT_MAINNET, SOLANA_USDC_DECIMALS } from '@/lib/solana-constants'
import { getRemloAgentWallets } from '@/lib/privy-server'
import { createPrivySignerAdapter } from '@/lib/solana-signer-adapter'

// Derive the exact signer type Streamflow expects from its own SDK types.
// Importing `SignerWalletAdapter` directly from `@solana/wallet-adapter-base`
// would hit a pnpm peer-version skew (0.9.19 in the SDK's store vs whichever
// version resolves at our root), so this extraction sidesteps that entirely.
type StreamflowSender = ICreateStreamExt['sender']
type StreamflowInvoker = IInteractStreamExt['invoker']

export interface SolanaStreamConfig {
  recipientAddress: string
  amountUsdc: number
  durationSeconds: number
  cliffSeconds?: number
  cancelAuthority: 'sender' | 'recipient' | 'both'
}

export interface SolanaStreamHandle {
  streamId: string
  provider: 'streamflow' | 'native'
  startedAt: number
  estimatedEndAt: number
  claimedUsdc: number
  remainingUsdc: number
}

export interface SolanaStreamCancellation {
  cancelledAt: number
  refundedUsdc: number
}

// ─── Streamflow program ID (for reference + Privy policy whitelist) ─────────

export const STREAMFLOW_PROGRAM_ID_DEVNET = PROGRAM_ID.devnet
export const STREAMFLOW_PROGRAM_ID_MAINNET = PROGRAM_ID.mainnet

export function getStreamflowProgramId(): string {
  return SOLANA_CLUSTER === 'mainnet-beta' ? PROGRAM_ID.mainnet : PROGRAM_ID.devnet
}

function getUsdcMint(): string {
  return SOLANA_CLUSTER === 'mainnet-beta' ? SOLANA_USDC_MINT_MAINNET : SOLANA_USDC_MINT_DEVNET
}

function getStreamflowCluster(): ICluster {
  return SOLANA_CLUSTER === 'mainnet-beta'
    ? ('mainnet' as ICluster)
    : ('devnet' as ICluster)
}

// ─── Internal: build configured Streamflow client ───────────────────────────

function createStreamflowClient(): SolanaStreamClient {
  return new SolanaStreamClient(
    SOLANA_RPC_URL,
    getStreamflowCluster(),
    'confirmed',
  )
}

function requireAgentWallet(): { id: string; address: string } {
  const { solanaWallet } = getRemloAgentWallets()
  if (!solanaWallet) {
    throw new Error(
      'Solana agent wallet not configured — set PRIVY_SOLANA_AGENT_WALLET_ID and PRIVY_SOLANA_AGENT_WALLET_ADDRESS in the environment',
    )
  }
  return solanaWallet
}

// ─── Public API: create stream ──────────────────────────────────────────────

export async function createSolanaPayrollStream(
  config: SolanaStreamConfig,
  agentWalletId: string,
): Promise<SolanaStreamHandle> {
  const wallet = requireAgentWallet()
  // Prefer env-configured walletId when caller's matches; otherwise trust
  // caller. Keeps the existing Ship 4 call signature.
  const walletIdToUse = agentWalletId || wallet.id

  const client = createStreamflowClient()
  const adapter = createPrivySignerAdapter(walletIdToUse, wallet.address)

  // Convert human USDC → base units (6 decimals)
  const depositedBase = BigInt(Math.round(config.amountUsdc * 10 ** SOLANA_USDC_DECIMALS))
  const period = 1 // 1-second granularity
  const numPeriods = BigInt(Math.max(1, Math.floor(config.durationSeconds / period)))
  // Floor-divide so amountPerPeriod * numPeriods == deposited; Streamflow
  // requires that equality (or rounding within tolerance). We adjust the
  // total to exactly `amountPerPeriod * numPeriods` to guarantee it.
  const amountPerPeriodBase = depositedBase / numPeriods
  const adjustedDeposited = amountPerPeriodBase * numPeriods

  // Streamflow's program rejects streams whose `start` is not strictly in the
  // future at the moment of confirmation. The RPC clock and the validator
  // clock drift by a few seconds, so we need a meaningful buffer. 30s is the
  // pattern in Streamflow's own examples. `cliff` is an absolute timestamp,
  // not a duration — equal to `start` = "no pre-cliff lock."
  const START_BUFFER_SEC = 30
  const start = Math.floor(Date.now() / 1000) + START_BUFFER_SEC
  const cliff = start + (config.cliffSeconds ?? 0)

  const data: ICreateStreamData = {
    period,
    start,
    cliff,
    cancelableBySender: config.cancelAuthority !== 'recipient',
    cancelableByRecipient: config.cancelAuthority !== 'sender',
    transferableBySender: false,
    transferableByRecipient: false,
    canTopup: false,
    automaticWithdrawal: true,
    withdrawalFrequency: 60, // auto-withdraw once per minute
    tokenId: getUsdcMint(),
    recipient: config.recipientAddress,
    amount: new BN(adjustedDeposited.toString()),
    name: `remlo-${Date.now()}`,
    cliffAmount: new BN(0),
    amountPerPeriod: new BN(amountPerPeriodBase.toString()),
  }

  // NB: omit `metadataPubKeys` entirely — Streamflow's SDK uses
  // `if (!metadataPubKeys) generate keypair` which treats `[]` as truthy and
  // falls through to `metadataPubKeys[0] === undefined`, crashing on
  // `metadataPubKey.toBuffer()`. The correct contract for "let the SDK
  // generate a fresh stream metadata keypair" is to leave the field absent.
  const extParams: ICreateStreamExt = {
    sender: adapter as unknown as StreamflowSender,
    isNative: false,
  }

  const result = await client.create(data, extParams)

  return {
    streamId: result.metadataId,
    provider: 'streamflow',
    startedAt: start,
    estimatedEndAt: start + config.durationSeconds,
    claimedUsdc: 0,
    remainingUsdc: Number(adjustedDeposited) / 10 ** SOLANA_USDC_DECIMALS,
  }
}

// ─── Public API: cancel stream ──────────────────────────────────────────────

export async function cancelSolanaPayrollStream(
  streamId: string,
  agentWalletId: string,
): Promise<SolanaStreamCancellation> {
  const wallet = requireAgentWallet()
  const walletIdToUse = agentWalletId || wallet.id

  const client = createStreamflowClient()
  const adapter = createPrivySignerAdapter(walletIdToUse, wallet.address)

  // Snapshot on-chain state BEFORE cancel so we can compute refund amount.
  // After cancel, the stream account may be closed or zeroed.
  const preCancel = await client.getOne({ id: streamId }).catch(() => null)

  const cancelData: ICancelData = { id: streamId }
  const cancelExt: IInteractStreamExt = {
    invoker: adapter as unknown as StreamflowInvoker,
  }
  await client.cancel(cancelData, cancelExt)

  const cancelledAt = Math.floor(Date.now() / 1000)

  // Refund = deposited - withdrawn at the moment of cancel.
  // depositedAmount is a BN in the fetched contract; fall back to 0 if we
  // couldn't read state pre-cancel.
  let refundedUsdc = 0
  if (preCancel) {
    try {
      const deposited = new BN(preCancel.depositedAmount.toString())
      const withdrawn = new BN(preCancel.withdrawnAmount.toString())
      const refundedBase = deposited.sub(withdrawn)
      refundedUsdc = Number(refundedBase.toString()) / 10 ** SOLANA_USDC_DECIMALS
    } catch {
      refundedUsdc = 0
    }
  }

  return { cancelledAt, refundedUsdc }
}

// ─── Public API: read stream state (used by smoke test + dashboards) ────────

export async function getSolanaPayrollStream(streamId: string): Promise<{
  streamId: string
  recipient: string
  depositedUsdc: number
  withdrawnUsdc: number
  remainingUsdc: number
  start: number
  end: number
  canceled: boolean
} | null> {
  const client = createStreamflowClient()
  try {
    const s = await client.getOne({ id: streamId })
    const deposited = Number(s.depositedAmount.toString()) / 10 ** SOLANA_USDC_DECIMALS
    const withdrawn = Number(s.withdrawnAmount.toString()) / 10 ** SOLANA_USDC_DECIMALS
    return {
      streamId,
      recipient: s.recipient,
      depositedUsdc: deposited,
      withdrawnUsdc: withdrawn,
      remainingUsdc: deposited - withdrawn,
      start: Number(s.start),
      end: Number(s.end),
      canceled: Boolean(s.canceledAt),
    }
  } catch {
    return null
  }
}

// Touch PublicKey to keep import referenced (used in signer-adapter path).
export type { PublicKey }
