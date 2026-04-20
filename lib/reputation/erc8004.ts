/**
 * lib/reputation/erc8004.ts — ERC-8004 Reputation Registry integration.
 *
 * Ship 3 wires the write-side (giveFeedback on settled work) and the read-side
 * (getSummary + event fetches for dashboard). Validation Registry writes are
 * stubbed out; read path is wired.
 *
 * Signing: Ship 3 uses `REMLO_AGENT_PRIVATE_KEY` (the existing Tempo signer).
 * Migrating to Privy Tempo server wallet is Phase 2.
 *
 * Feedback semantics:
 *   - `value` is an int128; we use a -100..100 scale with valueDecimals=0.
 *   - Successful completion: +100. Rejected verdict participation: -50.
 *     Expired without delivery: 0 (neutral).
 *   - `tag1` encodes the flow ('payroll', 'escrow', 'agent_pay').
 *   - `tag2` encodes the currency or outcome ('usdc', 'usd_path', 'rejected',
 *     'expired').
 */
import { encodeFunctionData, keccak256, toBytes, type Hex, type Address } from 'viem'
import {
  IdentityRegistryAbi,
  ReputationRegistryAbi,
  ValidationRegistryAbi,
  getIdentityRegistryAddress,
  getReputationRegistryAddress,
  getValidationRegistryAddress,
  getTempoPublicClient,
  getTempoWalletClient,
} from '@/lib/reputation/erc8004-client'
import {
  enqueueReputationWrite,
  fetchWrittenReputationWritesForSubject,
  type ReputationWrite,
} from '@/lib/queries/reputation-writes'
import { getRemloAgentWallets, signTempoTransaction } from '@/lib/privy-server'

// ─── Payload shapes ──────────────────────────────────────────────────────────

export interface AgentPayFeedbackPayload {
  target_agent_id: string
  value: number
  value_decimals: number
  tag1: string
  tag2: string
  endpoint: string
  feedback_uri: string
  feedback_hash_hex: string
}

export interface PayrollCompletedFeedbackPayload extends AgentPayFeedbackPayload {
  payroll_run_id: string
  total_amount_base_units: string
  payment_count: number
}

export interface EscrowParticipationFeedbackPayload extends AgentPayFeedbackPayload {
  escrow_id: string
  role: 'requester' | 'worker'
  outcome: 'settled' | 'rejected_refunded' | 'expired_refunded'
}

// ─── Schema identifiers for reputation_writes queue ──────────────────────────

export const TEMPO_SCHEMA_AGENT_PAY = 'erc8004_feedback_agent_pay'
export const TEMPO_SCHEMA_PAYROLL = 'erc8004_feedback_payroll'
export const TEMPO_SCHEMA_ESCROW = 'erc8004_feedback_escrow'

// ─── Enqueue helpers ─────────────────────────────────────────────────────────

export async function enqueueAgentPayFeedback(args: {
  payload: AgentPayFeedbackPayload
  source_id: string | null
}): Promise<ReputationWrite | null> {
  return enqueueReputationWrite({
    chain: 'tempo',
    subject_address: args.payload.target_agent_id,
    schema_id: TEMPO_SCHEMA_AGENT_PAY,
    source_type: 'agent_pay_call',
    source_id: args.source_id,
    payload: args.payload as unknown as Record<string, unknown>,
  })
}

export async function enqueuePayrollCompletedFeedback(args: {
  payload: PayrollCompletedFeedbackPayload
  source_id: string | null
}): Promise<ReputationWrite | null> {
  return enqueueReputationWrite({
    chain: 'tempo',
    subject_address: args.payload.target_agent_id,
    schema_id: TEMPO_SCHEMA_PAYROLL,
    source_type: 'payment_item',
    source_id: args.source_id,
    payload: args.payload as unknown as Record<string, unknown>,
  })
}

export async function enqueueEscrowParticipationFeedback(args: {
  payload: EscrowParticipationFeedbackPayload
  source_id: string | null
}): Promise<ReputationWrite | null> {
  return enqueueReputationWrite({
    chain: 'tempo',
    subject_address: args.payload.target_agent_id,
    schema_id: TEMPO_SCHEMA_ESCROW,
    source_type: 'escrow',
    source_id: args.source_id,
    payload: args.payload as unknown as Record<string, unknown>,
  })
}

// ─── Cron-worker write path ──────────────────────────────────────────────────

/**
 * Ship 7 Part 4 — Privy Tempo server-wallet signer with env-flag fallback.
 *
 * Flip USE_LEGACY_TEMPO_SIGNER=true to fall back to REMLO_AGENT_PRIVATE_KEY
 * without redeploying (one-env-var rollback). Privy is the default when the
 * Privy Tempo wallet is configured; legacy is the default otherwise.
 *
 * The function always records which signer path actually ran (so the caller
 * can attribute failures in reputation_writes.last_tempo_error + the
 * observability panel).
 */
export type TempoSignerPath = 'privy' | 'legacy'

export interface Erc8004WriteResult {
  txHash: string
  agentId: string
  signerPath: TempoSignerPath
}

function shouldUseLegacySigner(): boolean {
  const flag = process.env.USE_LEGACY_TEMPO_SIGNER
  if (flag === 'true' || flag === '1') return true
  // If Privy Tempo wallet isn't configured, the legacy signer is the only option.
  const { tempoWallet } = getRemloAgentWallets()
  return !tempoWallet
}

export async function processErc8004ReputationWrite(
  row: ReputationWrite,
): Promise<Erc8004WriteResult> {
  const payload = row.payload as unknown as AgentPayFeedbackPayload
  const agentId = BigInt(payload.target_agent_id)
  const feedbackHash: Hex = (payload.feedback_hash_hex?.startsWith('0x')
    ? (payload.feedback_hash_hex as Hex)
    : (`0x${payload.feedback_hash_hex ?? '0'.repeat(64)}` as Hex))

  const reputationAddress = getReputationRegistryAddress()
  const callData = encodeFunctionData({
    abi: ReputationRegistryAbi,
    functionName: 'giveFeedback',
    args: [
      agentId,
      BigInt(payload.value),
      payload.value_decimals,
      payload.tag1,
      payload.tag2,
      payload.endpoint,
      payload.feedback_uri,
      feedbackHash,
    ],
  })

  if (shouldUseLegacySigner()) {
    const privateKey = process.env.REMLO_AGENT_PRIVATE_KEY
    if (!privateKey) throw new Error('REMLO_AGENT_PRIVATE_KEY not set')

    const walletClient = getTempoWalletClient(privateKey as Hex)
    const txHash = await walletClient.sendTransaction({
      to: reputationAddress,
      data: callData,
    })
    return { txHash, agentId: agentId.toString(), signerPath: 'legacy' }
  }

  // Privy Tempo signing path.
  const { tempoWallet } = getRemloAgentWallets()
  if (!tempoWallet) {
    throw new Error(
      'Privy Tempo wallet not configured (PRIVY_TEMPO_AGENT_WALLET_ID/ADDRESS) — set USE_LEGACY_TEMPO_SIGNER=true to use the legacy signer.',
    )
  }

  const publicClient = getTempoPublicClient()

  const [nonce, feeData, estimatedGas] = await Promise.all([
    publicClient.getTransactionCount({ address: tempoWallet.address as Hex }),
    publicClient.estimateFeesPerGas().catch(() => null),
    publicClient
      .estimateGas({
        account: tempoWallet.address as Hex,
        to: reputationAddress,
        data: callData,
      })
      .catch(() => null),
  ])

  // Tempo state-creation cost is 12.5× Ethereum (TIP-1000). If estimateGas
  // fails or returns a low value, pad to 20M — safe for 2-3-slot contract
  // calls like giveFeedback; well under the 30M per-tx cap (TIP-1010).
  const gasLimit = estimatedGas ? (estimatedGas * 150n) / 100n : 20_000_000n

  const maxFeePerGas = feeData?.maxFeePerGas ?? 2_000_000_000n
  const maxPriorityFeePerGas =
    feeData?.maxPriorityFeePerGas ?? 1_000_000_000n

  const chainId = await publicClient.getChainId()

  const signedRawTx = await signTempoTransaction(tempoWallet.id, {
    to: reputationAddress,
    data: callData,
    nonce,
    chainId,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  })

  const txHash = await publicClient.sendRawTransaction({
    serializedTransaction: signedRawTx,
  })

  return { txHash, agentId: agentId.toString(), signerPath: 'privy' }
}

/** Helper for building `feedback_hash_hex` from any string payload. */
export function computeFeedbackHash(bodyText: string): string {
  return keccak256(toBytes(bodyText))
}

// ─── Read path ───────────────────────────────────────────────────────────────

export interface TempoFeedbackItem {
  feedbackIndex: string
  clientAddress: Address
  value: number
  valueDecimals: number
  tag1: string
  tag2: string
  endpoint: string
  feedbackUri: string
  feedbackHash: Hex
  timestamp: number
}

export interface TempoReputationSummary {
  agentId: string
  totalFeedbackCount: number
  averageScore: number | null
  feedbackByTag: Record<string, number>
  firstFeedbackAt: string | null
  latestFeedbackAt: string | null
  feedback: TempoFeedbackItem[]
}

/**
 * DB-backed primary + chain-backed authority read. We return the DB-sourced
 * set (fast, reliable) but verify a sample of the on-chain authoritative
 * feedback items via getSummary() for truth. Dashboard uses DB; smoke test
 * verifies on-chain.
 */
export async function aggregateTempoReputation(
  agentIdStr: string,
): Promise<TempoReputationSummary> {
  const rows = await fetchWrittenReputationWritesForSubject('tempo', agentIdStr)

  // Score + tag aggregation across written rows' payloads
  const feedback: TempoFeedbackItem[] = rows.map((r, i) => {
    const payload = r.payload as unknown as AgentPayFeedbackPayload
    return {
      feedbackIndex: String(i),
      clientAddress: '0x0000000000000000000000000000000000000000' as Address,
      value: Number(payload.value ?? 0),
      valueDecimals: Number(payload.value_decimals ?? 0),
      tag1: String(payload.tag1 ?? ''),
      tag2: String(payload.tag2 ?? ''),
      endpoint: String(payload.endpoint ?? ''),
      feedbackUri: String(payload.feedback_uri ?? ''),
      feedbackHash: (payload.feedback_hash_hex?.startsWith('0x')
        ? payload.feedback_hash_hex
        : `0x${payload.feedback_hash_hex ?? '0'.repeat(64)}`) as Hex,
      timestamp: r.written_at ? Math.floor(new Date(r.written_at).getTime() / 1000) : 0,
    }
  })

  const scores = feedback.map((f) => f.value).filter((v) => Number.isFinite(v))
  const averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null

  const feedbackByTag: Record<string, number> = {}
  for (const f of feedback) {
    feedbackByTag[f.tag1] = (feedbackByTag[f.tag1] ?? 0) + 1
  }

  const times = rows.map((r) => r.written_at).filter((t): t is string => !!t).sort()

  return {
    agentId: agentIdStr,
    totalFeedbackCount: feedback.length,
    averageScore,
    feedbackByTag,
    firstFeedbackAt: times[0] ?? null,
    latestFeedbackAt: times[times.length - 1] ?? null,
    feedback,
  }
}

/** On-chain authoritative summary — slow but truth. Used by smoke test. */
export async function fetchOnchainSummary(agentIdStr: string): Promise<{
  count: bigint
  summaryValue: bigint
  summaryValueDecimals: number
}> {
  const publicClient = getTempoPublicClient()
  const [count, summaryValue, summaryValueDecimals] = (await publicClient.readContract({
    address: getReputationRegistryAddress(),
    abi: ReputationRegistryAbi,
    functionName: 'getSummary',
    args: [BigInt(agentIdStr), [], '', ''],
  })) as [bigint, bigint, number]
  return { count, summaryValue, summaryValueDecimals }
}

/** Confirm an agent ID exists and return its agentURI. Used by dashboard + validators. */
export async function fetchAgentURI(agentIdStr: string): Promise<string | null> {
  try {
    const publicClient = getTempoPublicClient()
    const uri = (await publicClient.readContract({
      address: getIdentityRegistryAddress(),
      abi: IdentityRegistryAbi,
      functionName: 'tokenURI',
      args: [BigInt(agentIdStr)],
    })) as string
    return uri
  } catch {
    return null
  }
}

/** Validation Registry reads — wired for dashboard parity; writes are stubbed. */
export async function fetchValidationSummary(agentIdStr: string): Promise<{
  count: bigint
  avgResponse: number
} | null> {
  try {
    const publicClient = getTempoPublicClient()
    const [count, avgResponse] = (await publicClient.readContract({
      address: getValidationRegistryAddress(),
      abi: ValidationRegistryAbi,
      functionName: 'getSummary',
      args: [BigInt(agentIdStr), [], ''],
    })) as [bigint, number]
    return { count, avgResponse }
  } catch {
    return null
  }
}

// Phase 2: validator `validationRequest` / `validationResponse` writes. Stub
// left intentionally.
export async function writeValidationResponse(): Promise<void> {
  throw new Error('Validation Registry writes are Phase 2 — not implemented in Ship 3')
}
