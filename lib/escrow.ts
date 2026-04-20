/**
 * lib/escrow.ts — Ship 2.2 service layer.
 *
 * Orchestrates the full escrow lifecycle: Privy server wallet signing +
 * Claude validator + Supabase state + Solana on-chain broadcast.
 *
 * On-chain authority model (from Ship 2.1):
 *   - initialize_escrow: requester signs (the posting agent — for SWARM scope,
 *     this is the Privy server wallet signing on behalf of an authorized agent)
 *   - submit_deliverable: worker signs (same mechanism — Privy-managed worker)
 *   - post_verdict: validator_authority signs (the Privy Solana server wallet)
 *   - settle / refund: permissionless. This service layer cranks them from the
 *     Privy server wallet as a convenience, but anyone can.
 *
 * NOTE: For the MVP all three signing roles are bound to the single Privy
 * Solana server wallet. Ship 2.3 opens external-agent-signed deliverables.
 */
import { createHash, randomBytes } from 'crypto'
import { BN, BorshInstructionCoder } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { createServerClient } from '@/lib/supabase-server'
import { findActiveAuthorization } from '@/lib/queries/agent-authorizations'
import {
  getRemloAgentWallets,
  signSolanaTransaction,
  PrivyPolicyRejectedError,
} from '@/lib/privy-server'
import { EscrowClient } from '@/lib/escrow-client'
import {
  SOLANA_RPC_URL,
  SOLANA_CLUSTER,
  SOLANA_USDC_MINT_DEVNET,
  SOLANA_USDC_MINT_MAINNET,
} from '@/lib/solana-constants'
import { CLAUDE_MODEL, extractTextContent, getAnthropicClient } from '@/lib/claude'
import {
  enqueueEscrowSettledAttestation,
  enqueueEscrowRefundedAttestation,
  enqueueEmployerVerifiedAttestationOnce,
  aggregateSolanaReputation,
} from '@/lib/reputation/sas'
import {
  computeExpiryHoursForWorker,
  getTierForAttestationCount,
} from '@/lib/reputation-tiers'
import {
  enqueueEscrowParticipationFeedback,
  computeFeedbackHash,
} from '@/lib/reputation/erc8004'
import {
  getValidatorsForEscrow,
  type RegisteredValidator,
} from '@/lib/validators/registry'
import {
  evaluateConsensus,
  DEFAULT_CONSENSUS,
  type ConsensusConfig,
  type ConsensusResult,
  type ValidatorVote,
} from '@/lib/validators/consensus'
import type { Database } from '@/lib/database.types'

export type EscrowRow = Database['public']['Tables']['escrows']['Row']

// ─── Constants ───────────────────────────────────────────────────────────────

const USDC_DECIMALS = 6
export const MAX_ESCROW_USDC_BASE_UNITS = 100_000_000n // 100 USDC
export const MIN_EXPIRY_HOURS = 1
export const MAX_EXPIRY_HOURS = 24 * 7
export const DEFAULT_EXPIRY_HOURS = 24
export const MAX_RUBRIC_CHARS = 2000
export const DELIVERABLE_FETCH_TIMEOUT_MS = 10_000
export const DELIVERABLE_MAX_BYTES = 100 * 1024

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PostEscrowParams {
  employerId: string
  requesterAgentIdentifier: string
  workerAgentIdentifier: string
  workerWalletAddress: string
  amountUsdc: string
  rubricPrompt: string
  expiryHours?: number
}

export interface ValidatorResult {
  verdict: 'approved' | 'rejected'
  confidence: number
  reasoning: string
  model: string
  /**
   * Ship 6: true when the multi-validator consensus engine resolved this
   * call. When false, the escrow has been parked in 'voting' status awaiting
   * additional votes (e.g. human arbitrator via /api/escrows/[id]/vote) and
   * `verdict` carries only the placeholder used by the caller to decide
   * whether to settle synchronously.
   */
  consensus_reached: boolean
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sha256Bytes(input: string | Buffer): number[] {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return Array.from(createHash('sha256').update(buf).digest())
}

function sha256Hex(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return createHash('sha256').update(buf).digest('hex')
}

function getUsdcMint(): PublicKey {
  return new PublicKey(
    SOLANA_CLUSTER === 'mainnet-beta' ? SOLANA_USDC_MINT_MAINNET : SOLANA_USDC_MINT_DEVNET,
  )
}

// Clamp to 53 bits so the nonce round-trips through Supabase's BIGINT → JS number
// path without precision loss. 2^53 still gives ~9 quadrillion nonces per requester,
// far more than collision-space concerns require. The on-chain program accepts
// any u64 regardless.
function randomU64(): bigint {
  const bytes = randomBytes(8)
  return bytes.readBigUInt64LE(0) & 0x1fffffffffffffn
}

async function fetchDeliverableContent(uri: string): Promise<{ content: Buffer; error?: string }> {
  try {
    // data: URIs are common for inline deliverables; handle without network
    if (uri.startsWith('data:')) {
      const comma = uri.indexOf(',')
      if (comma === -1) return { content: Buffer.alloc(0), error: 'malformed data URI' }
      const body = uri.slice(comma + 1)
      const isBase64 = uri.slice(0, comma).includes(';base64')
      const content = isBase64 ? Buffer.from(body, 'base64') : Buffer.from(decodeURIComponent(body), 'utf8')
      if (content.byteLength > DELIVERABLE_MAX_BYTES) {
        return { content: Buffer.alloc(0), error: `deliverable exceeds ${DELIVERABLE_MAX_BYTES} byte cap` }
      }
      return { content }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DELIVERABLE_FETCH_TIMEOUT_MS)
    const res = await fetch(uri, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) return { content: Buffer.alloc(0), error: `fetch ${res.status}` }
    const ab = await res.arrayBuffer()
    if (ab.byteLength > DELIVERABLE_MAX_BYTES) {
      return { content: Buffer.alloc(0), error: `deliverable exceeds ${DELIVERABLE_MAX_BYTES} byte cap` }
    }
    return { content: Buffer.from(ab) }
  } catch (err) {
    return { content: Buffer.alloc(0), error: err instanceof Error ? err.message : 'fetch failed' }
  }
}

// ─── Core operations ─────────────────────────────────────────────────────────

/**
 * Posts an escrow: validates authorization, derives nonce + PDA, transfers
 * USDC from requester (Privy server wallet) into the program vault, persists
 * the Supabase row.
 */
export async function postEscrow(params: PostEscrowParams): Promise<EscrowRow> {
  // Validate inputs
  if (!params.rubricPrompt?.trim()) throw new Error('rubric_prompt is required')
  if (params.rubricPrompt.length > MAX_RUBRIC_CHARS) {
    throw new Error(`rubric_prompt exceeds ${MAX_RUBRIC_CHARS} characters`)
  }
  const amountFloat = parseFloat(params.amountUsdc)
  if (!Number.isFinite(amountFloat) || amountFloat <= 0) {
    throw new Error('amount_usdc must be a positive decimal')
  }
  const amountBaseUnits = BigInt(Math.round(amountFloat * 10 ** USDC_DECIMALS))
  if (amountBaseUnits > MAX_ESCROW_USDC_BASE_UNITS) {
    throw new Error(`amount exceeds 100 USDC cap`)
  }

  const requestedExpiryHours = params.expiryHours ?? DEFAULT_EXPIRY_HOURS
  if (requestedExpiryHours < MIN_EXPIRY_HOURS || requestedExpiryHours > MAX_EXPIRY_HOURS) {
    throw new Error(`expiry_hours must be between ${MIN_EXPIRY_HOURS} and ${MAX_EXPIRY_HOURS}`)
  }

  // Ship 7 J4 — look up the worker's SAS reputation and shorten the requested
  // expiry for known workers. Unknown workers get the full requested duration;
  // trusted workers (20+ attestations) earn a shorter floor. Pure policy,
  // computed client-side — the Anchor program enforces only MIN/MAX bounds.
  //
  // A failure to read reputation is treated as "unknown worker" — fall through
  // to the requested duration. We never block escrow posting on a reputation
  // read error.
  let workerAttestationCount = 0
  try {
    const repSummary = await aggregateSolanaReputation(params.workerWalletAddress)
    workerAttestationCount =
      repSummary.totalPaymentsReceived +
      repSummary.settledEscrows +
      repSummary.refundedEscrows
  } catch (err) {
    console.warn(
      '[postEscrow] reputation read failed, treating worker as unknown:',
      err instanceof Error ? err.message : err,
    )
  }
  const workerTier = getTierForAttestationCount(workerAttestationCount).tier
  const appliedExpiryHours = computeExpiryHoursForWorker(
    workerAttestationCount,
    requestedExpiryHours,
    MIN_EXPIRY_HOURS,
    MAX_EXPIRY_HOURS,
  )

  // Add 60s margin so external callers passing the floor (expiry_hours: 1) don't
  // race the on-chain ExpiryTooSoon guard when slot time drifts ahead of wall clock.
  const EXPIRY_SAFETY_MARGIN_SEC = 60
  const expiresAtSec = BigInt(
    Math.floor(Date.now() / 1000) + appliedExpiryHours * 3600 + EXPIRY_SAFETY_MARGIN_SEC,
  )

  // Authorize
  const authorization = await findActiveAuthorization(
    params.employerId,
    params.requesterAgentIdentifier,
  )
  if (!authorization) {
    throw new Error('Requester agent is not authorized for this employer')
  }
  if (amountFloat > Number(authorization.per_tx_cap_usd)) {
    throw new Error(`Amount exceeds per-transaction cap (${authorization.per_tx_cap_usd} USDC)`)
  }

  const { solanaWallet } = getRemloAgentWallets()
  if (!solanaWallet) {
    throw new Error('Solana agent wallet not configured on server')
  }

  // Validate worker wallet address
  let workerPubkey: PublicKey
  try {
    workerPubkey = new PublicKey(params.workerWalletAddress)
  } catch {
    throw new Error('worker_wallet_address is not a valid Solana address')
  }

  const rubricHashBytes = sha256Bytes(params.rubricPrompt)
  const rubricHashHex = sha256Hex(params.rubricPrompt)
  const requesterPubkey = new PublicKey(solanaWallet.address)
  const mint = getUsdcMint()
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const client = new EscrowClient(connection)

  // Insert DB row first with the generated nonce (the UNIQUE constraint on
  // (requester_pubkey, nonce) guarantees uniqueness before we build the on-chain tx).
  // Retry up to 3 times on the rare collision.
  const supabase = createServerClient()
  let attempt = 0
  let inserted: EscrowRow | null = null
  let nonceUsed: bigint = 0n

  while (attempt < 3) {
    attempt++
    nonceUsed = randomU64()
    const [escrowPda] = client.deriveEscrowPda(requesterPubkey, new BN(nonceUsed.toString()))

    const { data, error } = await supabase
      .from('escrows')
      .insert({
        employer_id: params.employerId,
        requester_agent_identifier: params.requesterAgentIdentifier,
        worker_agent_identifier: params.workerAgentIdentifier,
        requester_pubkey: requesterPubkey.toBase58(),
        worker_wallet_address: workerPubkey.toBase58(),
        nonce: Number(nonceUsed),
        escrow_pda: escrowPda.toBase58(),
        amount_base_units: Number(amountBaseUnits),
        rubric_prompt: params.rubricPrompt,
        rubric_hash: rubricHashHex,
        expires_at: new Date(Number(expiresAtSec) * 1000).toISOString(),
        requested_expiry_hours: requestedExpiryHours,
        applied_expiry_hours: appliedExpiryHours,
        worker_reputation_tier: workerTier,
        worker_attestation_count: workerAttestationCount,
        status: 'posted',
      })
      .select('*')
      .single()

    if (!error) {
      inserted = data
      break
    }

    if (error.code === '23505') {
      // unique constraint — collision, retry
      continue
    }
    throw new Error(`Failed to insert escrow row: ${error.message}`)
  }

  if (!inserted) {
    throw new Error('Failed to insert escrow after 3 nonce retries')
  }

  // Build + sign + broadcast initialize_escrow
  const tx = await client.buildInitializeEscrowTx({
    requester: requesterPubkey,
    worker: workerPubkey,
    validatorAuthority: requesterPubkey, // same Privy wallet serves all roles in MVP
    mint,
    nonce: new BN(nonceUsed.toString()),
    amountBaseUnits: new BN(amountBaseUnits.toString()),
    rubricHash: rubricHashBytes,
    expiresAt: new BN(Number(expiresAtSec)),
  })

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight

  const signed = (await signSolanaTransaction(solanaWallet.id, tx)) as Transaction
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  )

  const { data: updated } = await supabase
    .from('escrows')
    .update({ initialize_signature: signature })
    .eq('id', inserted.id)
    .select('*')
    .single()

  // ── Enqueue employer-verified attestation on first activity (Ship 3) ─
  // Idempotent — guarded via DB check so re-posts don't duplicate.
  void (async () => {
    try {
      await enqueueEmployerVerifiedAttestationOnce({
        payload: {
          subject_address: requesterPubkey.toBase58(),
          employer_id: params.employerId,
          first_payroll_run_id: inserted.id, // escrow id as the "first event" anchor
          verified_at: BigInt(Math.floor(Date.now() / 1000)),
        },
        source_id: inserted.id,
      })
    } catch (err) {
      console.error(
        `[postEscrow ${inserted.id}] employer-verified enqueue failed (non-fatal):`,
        err instanceof Error ? err.message : err,
      )
    }
  })()

  return updated ?? inserted
}

/**
 * Submits a deliverable URI. For the MVP the worker is the same Privy server
 * wallet as the requester and validator — so we can sign the submit_deliverable
 * instruction ourselves. Ship 2.3 opens external-agent-signed deliverables.
 */
export async function submitDeliverable(
  escrowId: string,
  deliverableUri: string,
  submittingAgentIdentifier: string,
): Promise<EscrowRow> {
  const supabase = createServerClient()

  const { data: escrow } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', escrowId)
    .single()

  if (!escrow) throw new Error('Escrow not found')
  if (escrow.status !== 'posted') {
    throw new Error(`Escrow is ${escrow.status}, not posted — cannot submit deliverable`)
  }
  if (escrow.worker_agent_identifier.toLowerCase() !== submittingAgentIdentifier.toLowerCase()) {
    throw new Error('Submitting agent identifier does not match the worker for this escrow')
  }

  if (new Date(escrow.expires_at).getTime() < Date.now()) {
    throw new Error('Escrow has already expired')
  }

  // Fetch deliverable content + hash it
  const { content, error: fetchError } = await fetchDeliverableContent(deliverableUri)
  if (fetchError) {
    throw new Error(`Deliverable fetch failed: ${fetchError}`)
  }

  const uriHashHex = sha256Hex(deliverableUri)
  const contentHashHex = sha256Hex(content)
  const uriHashBytes = sha256Bytes(deliverableUri)
  const contentHashBytes = sha256Bytes(content)

  const { solanaWallet } = getRemloAgentWallets()
  if (!solanaWallet) throw new Error('Solana agent wallet not configured')

  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const client = new EscrowClient(connection)
  const requesterPubkey = new PublicKey(escrow.requester_pubkey)
  const workerPubkey = new PublicKey(solanaWallet.address) // MVP: same wallet

  const tx = await client.buildSubmitDeliverableTx({
    worker: workerPubkey,
    requester: requesterPubkey,
    nonce: new BN(String(escrow.nonce)),
    uriHash: uriHashBytes,
    contentHash: contentHashBytes,
  })

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight

  const signed = (await signSolanaTransaction(solanaWallet.id, tx)) as Transaction
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  )

  const { data: updated } = await supabase
    .from('escrows')
    .update({
      status: 'delivered',
      deliverable_uri: deliverableUri,
      deliverable_hash: contentHashHex,
      deliverable_submitted_at: new Date().toISOString(),
      deliverable_signature: signature,
    })
    .eq('id', escrowId)
    .select('*')
    .single()

  // Fire validator + settlement async (don't await)
  void runValidatorAndSettle(escrowId)

  return updated ?? escrow
}

/**
 * Ship 2.3 — external-worker-signed deliverable submission.
 * Verifies a worker-signed submit_deliverable transaction, broadcasts it,
 * records the deliverable, and fires the same validator+settle orchestration
 * as submitDeliverable. Use when the worker agent manages its own Solana
 * keys instead of delegating to Remlo's Privy wallet.
 */
export async function deliverSignedTransaction(params: {
  escrowId: string
  deliverableUri: string
  signedTransactionBase64: string
  submittingAgentIdentifier: string
}): Promise<EscrowRow> {
  const supabase = createServerClient()
  const { data: escrow } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', params.escrowId)
    .single()
  if (!escrow) throw new Error('Escrow not found')
  if (escrow.status !== 'posted') {
    throw new Error(
      `Escrow is ${escrow.status}, not posted — cannot submit deliverable`,
    )
  }
  if (
    escrow.worker_agent_identifier.toLowerCase() !==
    params.submittingAgentIdentifier.toLowerCase()
  ) {
    throw new Error(
      'Submitting agent identifier does not match the worker for this escrow',
    )
  }
  if (new Date(escrow.expires_at).getTime() < Date.now()) {
    throw new Error('Escrow has already expired')
  }

  let tx: Transaction
  try {
    const txBytes = Buffer.from(params.signedTransactionBase64, 'base64')
    tx = Transaction.from(txBytes)
  } catch (err) {
    throw new Error(
      `Could not decode signed_transaction: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const client = new EscrowClient(connection)

  const submitIx = tx.instructions.find((ix) => ix.programId.equals(client.programId))
  if (!submitIx) {
    throw new Error('Signed tx does not target the remlo_escrow program')
  }

  const ixCoder = new BorshInstructionCoder(client.program.idl)
  const decoded = ixCoder.decode(submitIx.data)
  if (!decoded || decoded.name !== 'submitDeliverable') {
    throw new Error(
      `Signed tx instruction is not submit_deliverable (got ${decoded?.name ?? 'unknown'})`,
    )
  }

  const expectedUriHash = createHash('sha256')
    .update(params.deliverableUri, 'utf8')
    .digest()
  const decodedData = decoded.data as unknown as {
    uriHash?: number[] | Buffer
    contentHash?: number[] | Buffer
  }
  const signedUriHash = Buffer.from(decodedData.uriHash ?? [])
  if (signedUriHash.length !== 32 || !signedUriHash.equals(expectedUriHash)) {
    throw new Error(
      'uri_hash in signed instruction does not match sha256(deliverable_uri)',
    )
  }

  const workerPubkey = new PublicKey(escrow.worker_wallet_address)
  if (!tx.feePayer || !tx.feePayer.equals(workerPubkey)) {
    throw new Error('Signed tx fee payer does not match the escrow worker address')
  }
  if (!tx.recentBlockhash) {
    throw new Error('Signed tx is missing recentBlockhash')
  }

  const signature = await connection.sendRawTransaction(tx.serialize())
  try {
    await connection.confirmTransaction(
      {
        signature,
        blockhash: tx.recentBlockhash,
        lastValidBlockHeight: tx.lastValidBlockHeight ?? 0,
      },
      'confirmed',
    )
  } catch (err) {
    console.warn(
      `[deliverSignedTransaction] confirm failed (signature posted, may still confirm):`,
      err instanceof Error ? err.message : err,
    )
  }

  const contentHashHex = Buffer.from(decodedData.contentHash ?? []).toString('hex')
  const { data: updated } = await supabase
    .from('escrows')
    .update({
      status: 'delivered',
      deliverable_uri: params.deliverableUri,
      deliverable_hash: contentHashHex,
      deliverable_submitted_at: new Date().toISOString(),
      deliverable_signature: signature,
    })
    .eq('id', params.escrowId)
    .select('*')
    .single()

  void runValidatorAndSettle(params.escrowId)

  return updated ?? escrow
}

/**
 * Runs all configured validators, evaluates consensus, and broadcasts
 * post_verdict + settle/refund when consensus is reached. Detached from the
 * deliver request — client polls status to observe.
 *
 * Ship 6 — multi-validator orchestration. Application-layer consensus,
 * on-chain atomic settlement. See lib/validators/consensus.ts.
 */
async function runValidatorAndSettle(escrowId: string): Promise<void> {
  try {
    const result = await runValidator(escrowId)
    if (result.consensus_reached) {
      await settleOrRefund(escrowId, result.verdict)
    }
    // Not reached: escrow is parked in 'voting' status. The next vote —
    // via /api/escrows/[id]/vote — will re-evaluate and trigger settlement.
  } catch (err) {
    console.error(`[escrow ${escrowId}] validate+settle failed:`, err)
  }
}

export async function runValidator(escrowId: string): Promise<ValidatorResult> {
  const supabase = createServerClient()
  const { data: escrow } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', escrowId)
    .single()

  if (!escrow) throw new Error('Escrow not found')
  if (!escrow.deliverable_uri) throw new Error('No deliverable to validate')

  await supabase.from('escrows').update({ status: 'validating' }).eq('id', escrowId)

  // Re-fetch deliverable content (each validator re-reads; 100KB cap applies).
  const { content, error: fetchError } = await fetchDeliverableContent(escrow.deliverable_uri)

  // Resolve the configured validator set. Empty config → platform default
  // (single Claude validator via Privy wallet). See lib/validators/registry.
  const validators = await getValidatorsForEscrow(escrow.employer_id, supabase)
  const consensusConfig = getConsensusConfigForValidators(validators)

  // Auto-validators vote synchronously. Today: Claude only. Stubs
  // (llm_gpt4, oracle) are configured extension points that runAutoValidator
  // skips until their real implementations ship. Human votes arrive later
  // via /api/escrows/[id]/vote.
  for (const v of validators) {
    if (v.validatorType === 'human') continue

    const existing = await hasValidatorVoted(escrowId, v.validatorId)
    if (existing) continue

    const result = await runAutoValidator(v, escrow, content, fetchError)
    if (result) {
      await castValidatorVote(escrowId, v, result)
    }
  }

  return tryFinalizeConsensus(escrowId, consensusConfig)
}

/**
 * Maps configured validators → consensus config.
 *
 * Only validator types that can actually cast a vote count toward the
 * required-votes threshold. Today that means Claude (auto-votes in
 * runAutoValidator) and human (votes via /api/escrows/[id]/vote). Stub
 * types (llm_gpt4, oracle) are configured as extension points but can't
 * produce a vote — counting them would deadlock every escrow until the
 * stubs ship, which is the opposite of what we want.
 *
 * Threshold rules (voting-capable validators only):
 *   - 1 validator (single Claude, platform default): `DEFAULT_CONSENSUS`
 *     — Claude votes and consensus resolves immediately. Fast path
 *     preserves Ship 2.2 single-validator behavior.
 *   - N > 1: require ALL voting-capable validators to vote. Deliberate
 *     choice over "majority of N": if an employer configures Claude +
 *     human, the human's vote MUST count. "Majority of 2" is 1, which
 *     lets Claude finalize before the human weighs in — defeating the
 *     point of adding them.
 *
 * Deadlock safety valve: the escrow's `expires_at` + the expired-refund
 * cron. If a human validator goes silent past expiry, the escrow refunds
 * to the requester. Employers who don't want this hard requirement
 * simply don't configure a human validator.
 */
function getConsensusConfigForValidators(
  validators: RegisteredValidator[],
): ConsensusConfig {
  const votingValidators = validators.filter(
    (v) => v.validatorType === 'llm_claude' || v.validatorType === 'human',
  )

  if (votingValidators.length <= 1) return DEFAULT_CONSENSUS

  return {
    ...DEFAULT_CONSENSUS,
    strategy: 'simple_majority',
    requiredVotes: votingValidators.length,
  }
}

/**
 * Runs the auto-validation logic for a single validator and returns a
 * ValidatorResult WITHOUT writing a vote or verdict. Caller is responsible
 * for castValidatorVote + consensus evaluation.
 *
 * Returns null when the validator type can't produce a real vote today:
 *   - 'human': votes arrive via /api/escrows/[id]/vote, not here
 *   - 'llm_gpt4': extension point, not implemented
 *   - 'oracle':   extension point, not implemented
 *
 * Non-null (real vote cast):
 *   - 'llm_claude': real Anthropic call against rubric + deliverable.
 *     Auto-rejects with confidence 100 if deliverable fetch failed or the
 *     Anthropic API key isn't set — both fail-closed patterns.
 */
async function runAutoValidator(
  v: RegisteredValidator,
  escrow: EscrowRow,
  content: Buffer,
  fetchError: string | undefined,
): Promise<ValidatorResult | null> {
  if (v.validatorType === 'human') return null

  if (v.validatorType === 'llm_gpt4') {
    // TODO(ship-7+): wire real GPT-4 validator.
    // Return null so no vote is cast. A fake stub vote would:
    //   (a) bias consensus confidence toward 0%
    //   (b) silently auto-approve every escrow (prior impl used 'approved'
    //       as the placeholder, biasing outcomes)
    //   (c) pollute the validator_votes audit trail with non-real decisions
    // The consensus engine's `getConsensusConfigForValidators` filters stub
    // types from the required-votes threshold so configuring an unimplemented
    // type doesn't deadlock escrows either. Flip to a real implementation
    // here when ready — the type is already registered.
    console.warn(
      `[runAutoValidator] skipping llm_gpt4 validator ${v.validatorId}: not implemented`,
    )
    return null
  }

  if (v.validatorType === 'oracle') {
    // TODO(ship-7+): wire real oracle integration (Pyth / Switchboard /
    // custom on-chain price feed depending on rubric type).
    // Same rationale as llm_gpt4 above — return null, don't fake a vote.
    console.warn(
      `[runAutoValidator] skipping oracle validator ${v.validatorId}: not implemented`,
    )
    return null
  }

  // llm_claude — real call path.
  if (fetchError) {
    return {
      verdict: 'rejected',
      confidence: 100,
      reasoning: `Validator could not fetch deliverable: ${fetchError}. Auto-rejected.`,
      model: 'n/a',
      consensus_reached: false,
    }
  }

  const anthropic = getAnthropicClient()
  if (!anthropic) {
    return {
      verdict: 'rejected',
      confidence: 100,
      reasoning: 'No Anthropic API key configured on server. Auto-rejected to unblock escrow.',
      model: 'n/a',
      consensus_reached: false,
    }
  }

  const systemPrompt = [
    escrow.rubric_prompt,
    '',
    'Evaluate the deliverable against the rubric above. Respond with STRICT JSON only, matching this schema:',
    '{',
    '  "verdict": "approved" | "rejected",',
    '  "confidence": integer 0-100,',
    '  "reasoning": "one-paragraph explanation of why you approved or rejected"',
    '}',
    'Do not include any text outside the JSON object.',
  ].join('\n')

  const deliverableText = content.toString('utf8')
  const userMessage = `Deliverable:\n${deliverableText.slice(0, 50_000)}`

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = extractTextContent(response.content)

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Claude did not return JSON: ${text.slice(0, 200)}`)
    const obj = JSON.parse(jsonMatch[0]) as { verdict?: string; confidence?: number; reasoning?: string }

    if (obj.verdict !== 'approved' && obj.verdict !== 'rejected') {
      throw new Error(`Invalid verdict: ${obj.verdict}`)
    }
    const confidence = typeof obj.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(obj.confidence))) : 50
    const reasoning = obj.reasoning ?? 'No reasoning provided.'

    return {
      verdict: obj.verdict,
      confidence,
      reasoning,
      model: CLAUDE_MODEL,
      consensus_reached: false,
    }
  } catch (err) {
    return {
      verdict: 'rejected',
      confidence: 100,
      reasoning: `Claude validator failed: ${err instanceof Error ? err.message : 'unknown error'}. Auto-rejected.`,
      model: CLAUDE_MODEL,
      consensus_reached: false,
    }
  }
}

async function hasValidatorVoted(escrowId: string, validatorId: string): Promise<boolean> {
  const supabase = createServerClient()
  const { count } = await supabase
    .from('validator_votes')
    .select('id', { count: 'exact', head: true })
    .eq('escrow_id', escrowId)
    .eq('validator_id', validatorId)
  return (count ?? 0) > 0
}

async function castValidatorVote(
  escrowId: string,
  v: RegisteredValidator,
  result: ValidatorResult,
): Promise<void> {
  const supabase = createServerClient()
  // confidence stored as 0.000–1.000 in the DB; runValidator uses 0–100.
  const normalizedConfidence = Math.min(1, Math.max(0, result.confidence / 100))
  await supabase.from('validator_votes').insert({
    escrow_id: escrowId,
    validator_id: v.validatorId,
    validator_address: v.validatorAddress,
    validator_type: v.validatorType,
    verdict: result.verdict,
    confidence: normalizedConfidence,
    reasoning: result.reasoning.slice(0, 4000),
  })
}

/**
 * Reads current votes, evaluates consensus, and — if reached and the escrow
 * hasn't been finalized yet — broadcasts post_verdict on-chain via the
 * existing writeVerdict helper. Returns a ValidatorResult that the caller
 * uses to decide whether to fall through to settleOrRefund.
 *
 * Exported so the vote endpoint can call it after inserting a human vote.
 */
export async function tryFinalizeConsensus(
  escrowId: string,
  config: ConsensusConfig = DEFAULT_CONSENSUS,
): Promise<ValidatorResult> {
  const supabase = createServerClient()
  const { data: escrow, error: readErr } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', escrowId)
    .single()
  if (!escrow) {
    throw new Error(
      `Escrow not found (id=${escrowId}, supabase error=${readErr?.message ?? 'null'})`,
    )
  }

  const { data: votes } = await supabase
    .from('validator_votes')
    .select('*')
    .eq('escrow_id', escrowId)
    .eq('decision_type', 'escrow_verdict')

  const voteRows = (votes ?? []) as ValidatorVote[]
  const consensus = evaluateConsensus(voteRows, config)

  if (!consensus.reached) {
    // Still waiting — park the escrow in 'voting' so the UI + cron know.
    if (escrow.status !== 'voting') {
      await supabase.from('escrows').update({ status: 'voting' }).eq('id', escrowId)
    }
    return {
      verdict: 'rejected', // placeholder — caller inspects consensus_reached
      confidence: 0,
      reasoning: `Awaiting additional validator votes (${consensus.totalVotes}/${consensus.requiredVotes}).`,
      model: 'consensus',
      consensus_reached: false,
    }
  }

  // Consensus reached. If verdict already broadcast, no-op.
  if (escrow.verdict_signature) {
    return {
      verdict: consensus.verdict === 'approved' ? 'approved' : 'rejected',
      confidence: Math.round(consensus.confidence * 100),
      reasoning: 'Consensus already broadcast on-chain — post_verdict signature already recorded.',
      model: 'consensus',
      consensus_reached: true,
    }
  }

  const finalVerdict: 'approved' | 'rejected' =
    consensus.verdict === 'approved' ? 'approved' : 'rejected'

  const merged: ValidatorResult = {
    verdict: finalVerdict,
    confidence: Math.round(consensus.confidence * 100),
    reasoning: buildConsensusReasoning(voteRows, consensus),
    model: 'consensus',
    consensus_reached: true,
  }

  await writeVerdict(escrowId, escrow.requester_pubkey, BigInt(escrow.nonce), merged)
  return merged
}

function buildConsensusReasoning(
  votes: ValidatorVote[],
  consensus: ConsensusResult,
): string {
  const lines = [
    `Consensus: ${consensus.verdict.toUpperCase()} — ${consensus.approveCount} approve / ${consensus.rejectCount} reject (${consensus.totalVotes} total, ${consensus.requiredVotes} required).`,
  ]
  for (const v of votes) {
    lines.push(
      `  · ${v.validator_type} (${v.validator_address.slice(0, 8)}…): ${v.verdict}${v.confidence !== null ? ` @ ${Math.round(v.confidence * 100)}%` : ''} — ${(v.reasoning ?? '').slice(0, 140)}`,
    )
  }
  return lines.join('\n').slice(0, 4000)
}

/**
 * Broadcasts post_verdict on-chain and updates the Supabase row.
 */
async function writeVerdict(
  escrowId: string,
  requesterPubkeyStr: string,
  nonce: bigint,
  result: ValidatorResult,
): Promise<void> {
  const supabase = createServerClient()
  const { solanaWallet } = getRemloAgentWallets()
  if (!solanaWallet) throw new Error('Solana agent wallet not configured')

  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const client = new EscrowClient(connection)

  const confidenceBps = result.confidence * 100 // 0-100 -> 0-10000

  const tx = await client.buildPostVerdictTx({
    validatorAuthority: new PublicKey(solanaWallet.address),
    requester: new PublicKey(requesterPubkeyStr),
    nonce: new BN(nonce.toString()),
    verdict: result.verdict,
    confidenceBps,
  })

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight

  try {
    const signed = (await signSolanaTransaction(solanaWallet.id, tx)) as Transaction
    const signature = await connection.sendRawTransaction(signed.serialize())
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    )

    await supabase
      .from('escrows')
      .update({
        validator_verdict: result.verdict,
        validator_confidence: result.confidence,
        validator_reasoning: result.reasoning,
        validator_model: result.model,
        validator_decided_at: new Date().toISOString(),
        verdict_signature: signature,
      })
      .eq('id', escrowId)
  } catch (err) {
    if (err instanceof PrivyPolicyRejectedError) {
      throw new Error(`Privy policy rejected post_verdict: ${err.reason}`)
    }
    throw err
  }
}

/**
 * Cranks settle or refund based on the recorded verdict. Permissionless on-chain;
 * our server just has to be the one broadcasting.
 */
export async function settleOrRefund(
  escrowId: string,
  verdictHint?: 'approved' | 'rejected',
): Promise<string> {
  const supabase = createServerClient()
  const { data: escrow, error: readErr } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', escrowId)
    .single()
  if (!escrow) {
    throw new Error(
      `Escrow not found in settleOrRefund (id=${escrowId}, supabase error=${readErr?.message ?? 'null'})`,
    )
  }

  const verdict = verdictHint ?? escrow.validator_verdict
  if (verdict !== 'approved' && verdict !== 'rejected') {
    throw new Error(`Cannot settle/refund: verdict is ${verdict}`)
  }

  const { solanaWallet } = getRemloAgentWallets()
  if (!solanaWallet) throw new Error('Solana agent wallet not configured')

  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const client = new EscrowClient(connection)
  const mint = getUsdcMint()
  const payer = new PublicKey(solanaWallet.address)
  const requester = new PublicKey(escrow.requester_pubkey)

  let tx: Transaction
  if (verdict === 'approved') {
    tx = await client.buildSettleTx({
      payer,
      requester,
      nonce: new BN(String(escrow.nonce)),
      worker: new PublicKey(escrow.worker_wallet_address),
      mint,
    })
  } else {
    tx = await client.buildRefundTx({
      payer,
      requester,
      nonce: new BN(String(escrow.nonce)),
      mint,
      reason: 'rejected',
    })
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight

  const signed = (await signSolanaTransaction(solanaWallet.id, tx)) as Transaction
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  )

  const statusUpdate = verdict === 'approved'
    ? { status: 'settled' as const, settlement_signature: signature }
    : { status: 'rejected_refunded' as const, refund_signature: signature }

  await supabase
    .from('escrows')
    .update(statusUpdate)
    .eq('id', escrowId)

  // ── Enqueue reputation writes (Ship 3) ──────────────────────────────
  // Non-blocking: failures are logged but never propagate. The
  // /api/cron/process-reputation-writes worker drains the queue.
  void (async () => {
    try {
      const rubricHashBytes = Buffer.from(escrow.rubric_hash, 'hex')
      const confidence = escrow.validator_confidence ?? 0
      if (verdict === 'approved') {
        await enqueueEscrowSettledAttestation({
          payload: {
            subject_address: escrow.worker_wallet_address,
            escrow_pda: escrow.escrow_pda,
            amount_base_units: BigInt(escrow.amount_base_units),
            rubric_hash: new Uint8Array(rubricHashBytes),
            validator_confidence: confidence,
            settled_at: BigInt(Math.floor(Date.now() / 1000)),
          },
          source_id: escrowId,
        })
      } else {
        await enqueueEscrowRefundedAttestation({
          payload: {
            subject_address: escrow.requester_pubkey,
            escrow_pda: escrow.escrow_pda,
            reason: 'rejected',
            refunded_at: BigInt(Math.floor(Date.now() / 1000)),
            validator_confidence: confidence,
          },
          source_id: escrowId,
        })
      }

      // ERC-8004 feedback about the validator agent from the escrow.
      const validatorAgentId = process.env.REMLO_VALIDATOR_AGENT_ID ?? '0'
      const feedbackBody = JSON.stringify({
        kind: 'escrow_participation',
        escrow_id: escrowId,
        outcome: verdict === 'approved' ? 'settled' : 'rejected_refunded',
        confidence,
      })
      await enqueueEscrowParticipationFeedback({
        payload: {
          target_agent_id: validatorAgentId,
          value: verdict === 'approved' ? 100 : -50,
          value_decimals: 0,
          tag1: 'escrow',
          tag2: verdict === 'approved' ? 'settled' : 'rejected',
          endpoint: 'https://remlo.xyz/api/mpp/escrow',
          feedback_uri: `https://remlo.xyz/dashboard/escrows/${escrowId}`,
          feedback_hash_hex: computeFeedbackHash(feedbackBody),
          escrow_id: escrowId,
          role: 'requester',
          outcome: verdict === 'approved' ? 'settled' : 'rejected_refunded',
        },
        source_id: escrowId,
      })
    } catch (err) {
      console.error(
        `[settleOrRefund ${escrowId}] reputation enqueue failed (non-fatal):`,
        err instanceof Error ? err.message : err,
      )
    }
  })()

  return signature
}

/**
 * Cron-triggered refund for expired escrows. Permissionless on-chain.
 */
export async function refundExpiredEscrow(escrowId: string): Promise<string> {
  const supabase = createServerClient()
  const { data: escrow } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', escrowId)
    .single()
  if (!escrow) throw new Error('Escrow not found')

  if (!['posted', 'delivered', 'validating'].includes(escrow.status)) {
    throw new Error(`Escrow is ${escrow.status}, not a candidate for expiry refund`)
  }
  if (new Date(escrow.expires_at).getTime() >= Date.now()) {
    throw new Error('Escrow has not yet expired')
  }

  const { solanaWallet } = getRemloAgentWallets()
  if (!solanaWallet) throw new Error('Solana agent wallet not configured')

  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const client = new EscrowClient(connection)
  const mint = getUsdcMint()
  const payer = new PublicKey(solanaWallet.address)
  const requester = new PublicKey(escrow.requester_pubkey)

  const tx = await client.buildRefundTx({
    payer,
    requester,
    nonce: new BN(String(escrow.nonce)),
    mint,
    reason: 'expired',
  })

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight

  const signed = (await signSolanaTransaction(solanaWallet.id, tx)) as Transaction
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  )

  await supabase
    .from('escrows')
    .update({
      status: 'expired_refunded',
      refund_signature: signature,
    })
    .eq('id', escrowId)

  // ── Enqueue expired-refund reputation write (Ship 3) ─────────────────
  void (async () => {
    try {
      await enqueueEscrowRefundedAttestation({
        payload: {
          subject_address: escrow.requester_pubkey,
          escrow_pda: escrow.escrow_pda,
          reason: 'expired',
          refunded_at: BigInt(Math.floor(Date.now() / 1000)),
          validator_confidence: 0,
        },
        source_id: escrowId,
      })
      const validatorAgentId = process.env.REMLO_VALIDATOR_AGENT_ID ?? '0'
      const feedbackBody = JSON.stringify({
        kind: 'escrow_participation',
        escrow_id: escrowId,
        outcome: 'expired_refunded',
      })
      await enqueueEscrowParticipationFeedback({
        payload: {
          target_agent_id: validatorAgentId,
          value: 0,
          value_decimals: 0,
          tag1: 'escrow',
          tag2: 'expired',
          endpoint: 'https://remlo.xyz/api/mpp/escrow',
          feedback_uri: `https://remlo.xyz/dashboard/escrows/${escrowId}`,
          feedback_hash_hex: computeFeedbackHash(feedbackBody),
          escrow_id: escrowId,
          role: 'requester',
          outcome: 'expired_refunded',
        },
        source_id: escrowId,
      })
    } catch (err) {
      console.error(
        `[refundExpiredEscrow ${escrowId}] reputation enqueue failed (non-fatal):`,
        err instanceof Error ? err.message : err,
      )
    }
  })()

  return signature
}

export async function processExpiredEscrows(): Promise<{
  processed: number
  failures: { escrow_id: string; error: string }[]
}> {
  const supabase = createServerClient()
  const { data: expired } = await supabase
    .from('escrows')
    .select('id')
    .in('status', ['posted', 'delivered', 'validating'])
    .lt('expires_at', new Date().toISOString())

  let processed = 0
  const failures: { escrow_id: string; error: string }[] = []

  for (const row of expired ?? []) {
    try {
      await refundExpiredEscrow(row.id)
      processed++
    } catch (err) {
      failures.push({
        escrow_id: row.id,
        error: err instanceof Error ? err.message : 'unknown error',
      })
    }
  }

  return { processed, failures }
}

/**
 * Public-facing subset of the row — omits validator_model, internal hashes,
 * and agent identifiers. Safe to return to any x402 caller via /status.
 */
export function publicEscrowView(row: EscrowRow): Record<string, unknown> {
  const amount_usdc = (Number(row.amount_base_units) / 10 ** USDC_DECIMALS).toFixed(USDC_DECIMALS)
  const explorer = (sig: string | null) =>
    sig ? `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_CLUSTER}` : null

  return {
    escrow_id: row.id,
    status: row.status,
    amount_usdc,
    currency: row.currency,
    chain: row.chain,
    worker_wallet_address: row.worker_wallet_address,
    rubric_prompt: row.rubric_prompt,
    deliverable_uri: row.deliverable_uri,
    validator_verdict: row.validator_verdict,
    validator_confidence: row.validator_confidence,
    validator_reasoning: row.validator_reasoning,
    expires_at: row.expires_at,
    requested_expiry_hours: row.requested_expiry_hours,
    applied_expiry_hours: row.applied_expiry_hours,
    worker_reputation_tier: row.worker_reputation_tier,
    worker_attestation_count: row.worker_attestation_count,
    escrow_pda: row.escrow_pda,
    signatures: {
      initialize: row.initialize_signature,
      deliverable: row.deliverable_signature,
      verdict: row.verdict_signature,
      settlement: row.settlement_signature,
      refund: row.refund_signature,
    },
    solana_explorer_urls: {
      escrow_account: `https://explorer.solana.com/address/${row.escrow_pda}?cluster=${SOLANA_CLUSTER}`,
      initialize: explorer(row.initialize_signature),
      deliverable: explorer(row.deliverable_signature),
      verdict: explorer(row.verdict_signature),
      settlement: explorer(row.settlement_signature),
      refund: explorer(row.refund_signature),
    },
  }
}
