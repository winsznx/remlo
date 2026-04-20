/**
 * lib/reputation/sas.ts — Solana Attestation Service integration.
 *
 * Schema design notes:
 *   1. Every schema's FIRST field is `subject_address: string`. SAS uses
 *      `nonce` as the PDA-disambiguator, not as the subject pointer — so we
 *      use random nonces (one per attestation) and put the subject in the
 *      data. This lets a single subject have many attestations per schema
 *      (e.g. one `payment-completed` per payment) while keeping the
 *      attestation self-describing on-chain.
 *   2. SAS has no `bytes32` type — 32-byte hashes use field type 13
 *      (Vec<u8>). 32-byte length is enforced in app code.
 *   3. There are no nullable fields — `worker_agent_identifier` uses the
 *      empty-string sentinel when no agent identity is known.
 *
 * Authority model:
 *   - The Privy Solana server wallet (`PRIVY_SOLANA_AGENT_WALLET_ADDRESS`)
 *     is BOTH the credential authority AND the authorized signer.
 *   - All on-chain writes route through `signSolanaTransaction` (existing
 *     Privy v1 path), bridged via `sas-bridge.ts` from sas-lib's v2
 *     instructions.
 */
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
} from '@solana/web3.js'
import {
  deriveAttestationPda,
  deriveCredentialPda,
  deriveSchemaPda,
  fetchSchema,
  getCreateAttestationInstruction,
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
  serializeAttestationData,
  SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
  type Schema,
} from 'sas-lib'
import { createNoopSigner, createSolanaRpc } from '@solana/kit'
import { signSolanaTransaction } from '@/lib/privy-server'
import { SOLANA_RPC_URL } from '@/lib/solana-constants'
import { v2InstructionToV1, publicKeyToAddress } from '@/lib/reputation/sas-bridge'
import {
  enqueueReputationWrite,
  fetchWrittenReputationWritesForSubject,
  hasEmployerVerifiedAttestation,
  type ReputationWrite,
} from '@/lib/queries/reputation-writes'

// ─── Schema registry ─────────────────────────────────────────────────────────

export const SAS_PROGRAM_ID = '22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG'
export const REMLO_CREDENTIAL_NAME = 'Remlo'

// SAS borsh field type bytes
const FIELD_U8 = 0
const FIELD_U64 = 3
const FIELD_I64 = 8
const FIELD_STRING = 12
const FIELD_BYTES = 13

export interface SasSchemaSpec {
  name: string
  description: string
  layout: Uint8Array
  fieldNames: string[]
  envVar: string
}

export const SCHEMA_PAYMENT_COMPLETED: SasSchemaSpec = {
  name: 'remlo-payment-completed',
  description: 'Remlo: a Solana payroll payment was settled to this subject.',
  layout: new Uint8Array([FIELD_STRING, FIELD_STRING, FIELD_U64, FIELD_STRING, FIELD_BYTES, FIELD_I64, FIELD_STRING, FIELD_STRING]),
  fieldNames: [
    'subject_address',
    'employer_id',
    'amount_base_units',
    'currency',
    'memo_hash',
    'settled_at',
    'payroll_run_id',
    'worker_agent_identifier',
  ],
  envVar: 'SAS_SCHEMA_PAYMENT_COMPLETED',
}

export const SCHEMA_ESCROW_SETTLED: SasSchemaSpec = {
  name: 'remlo-escrow-settled',
  description: 'Remlo: a Solana escrow was approved by the LLM validator and settled to this subject.',
  layout: new Uint8Array([FIELD_STRING, FIELD_STRING, FIELD_U64, FIELD_BYTES, FIELD_U8, FIELD_I64]),
  fieldNames: [
    'subject_address',
    'escrow_pda',
    'amount_base_units',
    'rubric_hash',
    'validator_confidence',
    'settled_at',
  ],
  envVar: 'SAS_SCHEMA_ESCROW_SETTLED',
}

export const SCHEMA_ESCROW_REFUNDED: SasSchemaSpec = {
  name: 'remlo-escrow-refunded',
  description: 'Remlo: a Solana escrow was rejected (LLM verdict) or expired without delivery and refunded to this subject.',
  layout: new Uint8Array([FIELD_STRING, FIELD_STRING, FIELD_STRING, FIELD_I64, FIELD_U8]),
  fieldNames: [
    'subject_address',
    'escrow_pda',
    'reason',
    'refunded_at',
    'validator_confidence',
  ],
  envVar: 'SAS_SCHEMA_ESCROW_REFUNDED',
}

export const SCHEMA_EMPLOYER_VERIFIED: SasSchemaSpec = {
  name: 'remlo-employer-verified',
  description: 'Remlo: this employer treasury successfully ran their first payroll on Remlo.',
  layout: new Uint8Array([FIELD_STRING, FIELD_STRING, FIELD_STRING, FIELD_I64]),
  fieldNames: [
    'subject_address',
    'employer_id',
    'first_payroll_run_id',
    'verified_at',
  ],
  envVar: 'SAS_SCHEMA_EMPLOYER_VERIFIED',
}

export const ALL_SCHEMAS = [
  SCHEMA_PAYMENT_COMPLETED,
  SCHEMA_ESCROW_SETTLED,
  SCHEMA_ESCROW_REFUNDED,
  SCHEMA_EMPLOYER_VERIFIED,
] as const

// ─── Env reads ───────────────────────────────────────────────────────────────

export function getCredentialAuthorityAddress(): string {
  const v = process.env.SAS_CREDENTIAL_AUTHORITY
  if (!v) throw new Error('SAS_CREDENTIAL_AUTHORITY not set')
  return v
}

export function getSchemaAddress(spec: SasSchemaSpec): string {
  const v = process.env[spec.envVar]
  if (!v) throw new Error(`${spec.envVar} not set`)
  return v
}

// ─── Payload shapes — keyed to schema ────────────────────────────────────────

export interface PaymentCompletedPayload {
  subject_address: string
  employer_id: string
  amount_base_units: bigint
  currency: string
  memo_hash: Uint8Array
  settled_at: bigint
  payroll_run_id: string
  worker_agent_identifier: string
}

export interface EscrowSettledPayload {
  subject_address: string
  escrow_pda: string
  amount_base_units: bigint
  rubric_hash: Uint8Array
  validator_confidence: number
  settled_at: bigint
}

export interface EscrowRefundedPayload {
  subject_address: string
  escrow_pda: string
  reason: 'rejected' | 'expired'
  refunded_at: bigint
  validator_confidence: number
}

export interface EmployerVerifiedPayload {
  subject_address: string
  employer_id: string
  first_payroll_run_id: string
  verified_at: bigint
}

// ─── Enqueue helpers ─────────────────────────────────────────────────────────

/**
 * JSON-safe serialization for the payload column. bigint -> string, Uint8Array
 * -> hex string. The cron worker reverses this when it reads the row.
 */
function serializePayloadForJson(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'bigint') out[k] = v.toString()
    else if (v instanceof Uint8Array) out[k] = Buffer.from(v).toString('hex')
    else out[k] = v
  }
  return out
}

export async function enqueuePaymentCompletedAttestation(args: {
  payload: PaymentCompletedPayload
  source_id: string | null
}): Promise<ReputationWrite | null> {
  return enqueueReputationWrite({
    chain: 'solana',
    subject_address: args.payload.subject_address,
    schema_id: SCHEMA_PAYMENT_COMPLETED.envVar,
    source_type: 'payment_item',
    source_id: args.source_id,
    payload: serializePayloadForJson(args.payload as unknown as Record<string, unknown>),
  })
}

export async function enqueueEscrowSettledAttestation(args: {
  payload: EscrowSettledPayload
  source_id: string | null
}): Promise<ReputationWrite | null> {
  return enqueueReputationWrite({
    chain: 'solana',
    subject_address: args.payload.subject_address,
    schema_id: SCHEMA_ESCROW_SETTLED.envVar,
    source_type: 'escrow',
    source_id: args.source_id,
    payload: serializePayloadForJson(args.payload as unknown as Record<string, unknown>),
  })
}

export async function enqueueEscrowRefundedAttestation(args: {
  payload: EscrowRefundedPayload
  source_id: string | null
}): Promise<ReputationWrite | null> {
  return enqueueReputationWrite({
    chain: 'solana',
    subject_address: args.payload.subject_address,
    schema_id: SCHEMA_ESCROW_REFUNDED.envVar,
    source_type: 'escrow',
    source_id: args.source_id,
    payload: serializePayloadForJson(args.payload as unknown as Record<string, unknown>),
  })
}

export async function enqueueEmployerVerifiedAttestationOnce(args: {
  payload: EmployerVerifiedPayload
  source_id: string | null
}): Promise<ReputationWrite | null> {
  // Only one attestation per employer ever — guard via DB check.
  const existing = await hasEmployerVerifiedAttestation(
    args.payload.subject_address,
    SCHEMA_EMPLOYER_VERIFIED.envVar,
  )
  if (existing) return null
  return enqueueReputationWrite({
    chain: 'solana',
    subject_address: args.payload.subject_address,
    schema_id: SCHEMA_EMPLOYER_VERIFIED.envVar,
    source_type: 'employer',
    source_id: args.source_id,
    payload: serializePayloadForJson(args.payload as unknown as Record<string, unknown>),
  })
}

// ─── Cron-worker write path ──────────────────────────────────────────────────

/**
 * Re-hydrate the JSON-serialized payload back into the typed shape sas-lib
 * expects. Bigints come back from strings; bytes come back from hex.
 */
function deserializePayloadFromJson(
  spec: SasSchemaSpec,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (let i = 0; i < spec.fieldNames.length; i++) {
    const name = spec.fieldNames[i]
    const fieldType = spec.layout[i]
    const v = raw[name]
    if (v === undefined || v === null) {
      out[name] = fieldType === FIELD_STRING ? '' : 0
      continue
    }
    if (fieldType === FIELD_U64 || fieldType === FIELD_I64) {
      out[name] = typeof v === 'bigint' ? v : BigInt(String(v))
    } else if (fieldType === FIELD_BYTES) {
      out[name] =
        v instanceof Uint8Array
          ? v
          : new Uint8Array(Buffer.from(String(v), 'hex'))
    } else if (fieldType === FIELD_U8) {
      out[name] = Number(v)
    } else {
      out[name] = String(v)
    }
  }
  return out
}

export interface SasWriteResult {
  signature: string
  attestationPda: string
  nonceAddress: string
}

/**
 * Cron-worker entry point: takes a single pending reputation_writes row
 * (chain='solana'), builds + signs + broadcasts the SAS attestation tx,
 * returns signature + PDA. Caller updates the row.
 */
export async function processSasReputationWrite(
  row: ReputationWrite,
  privySolanaWalletId: string,
  privySolanaWalletAddress: string,
): Promise<SasWriteResult> {
  const spec = ALL_SCHEMAS.find((s) => s.envVar === row.schema_id)
  if (!spec) throw new Error(`Unknown SAS schema_id: ${row.schema_id}`)

  const credentialAuthority = getCredentialAuthorityAddress()
  const schemaAddress = getSchemaAddress(spec)

  // Random nonce per attestation so a subject can have many attestations per schema.
  const nonceKp = Keypair.generate()
  const nonceAddress = nonceKp.publicKey.toBase58()

  // Fetch the on-chain schema so the SDK can encode the data properly.
  const rpc = createSolanaRpc(SOLANA_RPC_URL)
  const schemaAccount = (await fetchSchema(rpc, publicKeyToAddress(new PublicKey(schemaAddress)))) as { data: Schema }

  const decoded = deserializePayloadFromJson(spec, row.payload)
  const data = serializeAttestationData(schemaAccount.data, decoded)

  const credentialAuthorityAddr = publicKeyToAddress(new PublicKey(credentialAuthority))
  const schemaAddr = publicKeyToAddress(new PublicKey(schemaAddress))
  const nonceAddr = publicKeyToAddress(nonceKp.publicKey)

  const [credentialPda] = await deriveCredentialPda({
    authority: credentialAuthorityAddr,
    name: REMLO_CREDENTIAL_NAME,
  })
  const [attestationPda] = await deriveAttestationPda({
    credential: credentialPda,
    schema: schemaAddr,
    nonce: nonceAddr,
  })

  const payerSigner = createNoopSigner(publicKeyToAddress(new PublicKey(privySolanaWalletAddress)))
  const authoritySigner = createNoopSigner(publicKeyToAddress(new PublicKey(privySolanaWalletAddress)))

  // 365-day expiry by default
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600)

  const ix = getCreateAttestationInstruction({
    payer: payerSigner,
    authority: authoritySigner,
    credential: credentialPda,
    schema: publicKeyToAddress(new PublicKey(schemaAddress)),
    attestation: attestationPda,
    nonce: publicKeyToAddress(nonceKp.publicKey),
    data,
    expiry,
  })

  const v1Ix = v2InstructionToV1(ix)
  const tx = new Transaction().add(v1Ix)
  tx.feePayer = new PublicKey(privySolanaWalletAddress)

  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight

  const signed = (await signSolanaTransaction(privySolanaWalletId, tx)) as Transaction
  const signature = await connection.sendRawTransaction(signed.serialize())
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  )

  return {
    signature,
    attestationPda: attestationPda.toString(),
    nonceAddress,
  }
}

// ─── Read path ───────────────────────────────────────────────────────────────

export interface SolanaReputationSummary {
  subjectAddress: string
  totalPaymentsReceived: number
  totalAmountBaseUnits: bigint
  settledEscrows: number
  refundedEscrows: number
  averageValidatorConfidence: number | null
  firstAttestationAt: string | null
  latestAttestationAt: string | null
  attestations: {
    schema_id: string
    attestation_pda: string | null
    tx_signature: string | null
    written_at: string | null
    payload: Record<string, unknown>
  }[]
}

// ─── 60s TTL cache for hot read-paths (Ship 7 J4) ────────────────────────────
// `postEscrow` now calls aggregateSolanaReputation on every escrow post to
// compute the reputation-gated expiry. Without caching, a paid external caller
// hitting /api/mpp/escrow/post repeatedly re-fetches the same worker's
// reputation row-set. Simple in-memory Map cache, 60s TTL, keyed by wallet
// address. Reasoning: tier assignments don't flip more than once a minute
// under realistic attestation-write cadence. Not memoized across pods — any
// serverless runtime instance has its own copy. Correctness stays fine; we
// never return stale tier more than 60s old.
interface CachedReputation {
  summary: SolanaReputationSummary
  expiresAt: number
}
const REPUTATION_CACHE = new Map<string, CachedReputation>()
const REPUTATION_CACHE_TTL_MS = 60_000

/**
 * DB-backed read: reputation_writes is the source of truth for the dashboard.
 * On-chain SAS reads are slow (getProgramAccounts + memcmp on string fields)
 * and unnecessary when we have an indexed local mirror. The smoke test
 * verifies a sample on-chain to prove correspondence.
 */
export async function aggregateSolanaReputation(
  subjectAddress: string,
): Promise<SolanaReputationSummary> {
  const cached = REPUTATION_CACHE.get(subjectAddress)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.summary
  }
  const summary = await aggregateSolanaReputationUncached(subjectAddress)
  REPUTATION_CACHE.set(subjectAddress, {
    summary,
    expiresAt: Date.now() + REPUTATION_CACHE_TTL_MS,
  })
  // Evict stale entries opportunistically to prevent unbounded growth.
  if (REPUTATION_CACHE.size > 512) {
    const now = Date.now()
    for (const [key, value] of REPUTATION_CACHE.entries()) {
      if (value.expiresAt < now) REPUTATION_CACHE.delete(key)
    }
  }
  return summary
}

async function aggregateSolanaReputationUncached(
  subjectAddress: string,
): Promise<SolanaReputationSummary> {
  const rows = await fetchWrittenReputationWritesForSubject('solana', subjectAddress)

  const payments = rows.filter((r) => r.schema_id === SCHEMA_PAYMENT_COMPLETED.envVar)
  const settledEscrows = rows.filter((r) => r.schema_id === SCHEMA_ESCROW_SETTLED.envVar)
  const refundedEscrows = rows.filter((r) => r.schema_id === SCHEMA_ESCROW_REFUNDED.envVar)

  const totalAmountBaseUnits = payments.reduce((sum, r) => {
    const v = (r.payload as { amount_base_units?: string }).amount_base_units
    return v ? sum + BigInt(v) : sum
  }, 0n)

  const confidences = settledEscrows
    .map((r) => Number((r.payload as { validator_confidence?: number }).validator_confidence ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0)
  const averageValidatorConfidence = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : null

  const writtenTimestamps = rows.map((r) => r.written_at).filter((t): t is string => !!t)
  writtenTimestamps.sort()

  return {
    subjectAddress,
    totalPaymentsReceived: payments.length,
    totalAmountBaseUnits,
    settledEscrows: settledEscrows.length,
    refundedEscrows: refundedEscrows.length,
    averageValidatorConfidence,
    firstAttestationAt: writtenTimestamps[0] ?? null,
    latestAttestationAt: writtenTimestamps[writtenTimestamps.length - 1] ?? null,
    attestations: rows.map((r) => ({
      schema_id: r.schema_id,
      attestation_pda: r.attestation_pda,
      tx_signature: r.tx_signature,
      written_at: r.written_at,
      payload: r.payload,
    })),
  }
}

// ─── Re-exports for setup script ─────────────────────────────────────────────

export {
  deriveCredentialPda,
  deriveSchemaPda,
  deriveAttestationPda,
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
  getCreateAttestationInstruction,
  fetchSchema,
  serializeAttestationData,
  SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
}

// Re-export bridge helpers for the setup script
export { v2InstructionToV1, publicKeyToAddress } from '@/lib/reputation/sas-bridge'
