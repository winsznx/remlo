/**
 * lib/escrow-client.ts
 *
 * Thin wrapper around the remlo_escrow Anchor program. All Anchor-specific
 * concerns live in this file. The service layer (lib/escrow.ts) and route
 * handlers call into EscrowClient — they never import @coral-xyz/anchor or
 * reach into solana/target/.
 *
 * If the program is ever upgraded (Ship 2.3 multi-validator, future Phase 2
 * migrations), this is the single file that changes.
 */
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import remloEscrowIdl from '@/lib/idl/remlo_escrow.json'
import type { RemloEscrow } from '@/lib/idl/remlo_escrow'

const ESCROW_SEED = Buffer.from('escrow')

export type EscrowStatusVariant =
  | { posted: Record<string, never> }
  | { delivered: Record<string, never> }
  | { validated: Record<string, never> }
  | { settled: Record<string, never> }
  | { rejectedRefunded: Record<string, never> }
  | { expiredRefunded: Record<string, never> }

export type VerdictVariant =
  | { pending: Record<string, never> }
  | { approved: Record<string, never> }
  | { rejected: Record<string, never> }

export type RefundReasonVariant =
  | { rejected: Record<string, never> }
  | { expired: Record<string, never> }

export interface EscrowAccount {
  requester: PublicKey
  worker: PublicKey
  validatorAuthority: PublicKey
  mint: PublicKey
  amount: BN
  rubricHash: number[]
  deliverableUriHash: number[]
  deliverableContentHash: number[]
  hasDeliverable: boolean
  createdAt: BN
  expiresAt: BN
  status: EscrowStatusVariant
  verdict: VerdictVariant
  confidenceBps: number
  nonce: BN
  bump: number
}

export interface InitializeEscrowParams {
  requester: PublicKey
  worker: PublicKey
  validatorAuthority: PublicKey
  mint: PublicKey
  nonce: BN
  amountBaseUnits: BN
  rubricHash: number[]
  expiresAt: BN
}

export interface SubmitDeliverableParams {
  worker: PublicKey
  requester: PublicKey
  nonce: BN
  uriHash: number[]
  contentHash: number[]
}

export interface PostVerdictParams {
  validatorAuthority: PublicKey
  requester: PublicKey
  nonce: BN
  verdict: 'approved' | 'rejected'
  confidenceBps: number
}

export interface SettleParams {
  payer: PublicKey
  requester: PublicKey
  nonce: BN
  worker: PublicKey
  mint: PublicKey
}

export interface RefundParams {
  payer: PublicKey
  requester: PublicKey
  nonce: BN
  mint: PublicKey
  reason: 'rejected' | 'expired'
}

/**
 * Read-only provider — the wrapper never signs. Service layer passes
 * unsigned txs to Privy for signature.
 */
function readOnlyProvider(connection: Connection): AnchorProvider {
  const dummyKeypair = Keypair.generate()
  const wallet = new NodeWallet(dummyKeypair)
  return new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
}

export class EscrowClient {
  readonly program: Program<RemloEscrow>
  readonly programId: PublicKey
  readonly connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
    this.program = new Program<RemloEscrow>(
      remloEscrowIdl as RemloEscrow,
      readOnlyProvider(connection),
    )
    this.programId = this.program.programId
  }

  /**
   * Matches the Rust seed scheme `[b"escrow", requester.as_ref(), nonce.to_le_bytes()]`
   */
  deriveEscrowPda(requester: PublicKey, nonce: BN): [PublicKey, number] {
    const nonceBuf = Buffer.alloc(8)
    nonceBuf.writeBigUInt64LE(BigInt(nonce.toString()))
    return PublicKey.findProgramAddressSync(
      [ESCROW_SEED, requester.toBuffer(), nonceBuf],
      this.programId,
    )
  }

  async buildInitializeEscrowTx(params: InitializeEscrowParams): Promise<Transaction> {
    const [escrowPda] = this.deriveEscrowPda(params.requester, params.nonce)
    const requesterAta = getAssociatedTokenAddressSync(params.mint, params.requester)
    const vaultAta = getAssociatedTokenAddressSync(params.mint, escrowPda, true)

    const tx = await this.program.methods
      .initializeEscrow({
        nonce: params.nonce,
        amount: params.amountBaseUnits,
        worker: params.worker,
        validatorAuthority: params.validatorAuthority,
        rubricHash: params.rubricHash,
        expiresAt: params.expiresAt,
      })
      .accounts({
        requester: params.requester,
        // escrow PDA resolves automatically from Anchor account resolution
        mint: params.mint,
        requesterAta,
        vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      } as never)
      .transaction()

    tx.feePayer = params.requester
    return tx
  }

  async buildSubmitDeliverableTx(params: SubmitDeliverableParams): Promise<Transaction> {
    const [escrowPda] = this.deriveEscrowPda(params.requester, params.nonce)
    const tx = await this.program.methods
      .submitDeliverable(params.uriHash, params.contentHash)
      .accounts({
        worker: params.worker,
        escrow: escrowPda,
      } as never)
      .transaction()

    tx.feePayer = params.worker
    return tx
  }

  /**
   * Returns just the submit_deliverable instruction — unsigned — for external
   * worker agents that want to sign client-side instead of delegating to
   * Remlo's Privy wallet. Import this, build + sign your own Transaction, then
   * submit via /api/mpp/escrow/deliver-signed.
   */
  async buildSubmitDeliverableInstruction(params: SubmitDeliverableParams) {
    const [escrowPda] = this.deriveEscrowPda(params.requester, params.nonce)
    return this.program.methods
      .submitDeliverable(params.uriHash, params.contentHash)
      .accounts({
        worker: params.worker,
        escrow: escrowPda,
      } as never)
      .instruction()
  }

  async buildPostVerdictTx(params: PostVerdictParams): Promise<Transaction> {
    const verdictArg: VerdictVariant =
      params.verdict === 'approved' ? { approved: {} } : { rejected: {} }
    const [escrowPda] = this.deriveEscrowPda(params.requester, params.nonce)

    const tx = await this.program.methods
      .postVerdict(verdictArg as never, params.confidenceBps)
      .accounts({
        validatorAuthority: params.validatorAuthority,
        escrow: escrowPda,
      } as never)
      .transaction()

    tx.feePayer = params.validatorAuthority
    return tx
  }

  async buildSettleTx(params: SettleParams): Promise<Transaction> {
    const [escrowPda] = this.deriveEscrowPda(params.requester, params.nonce)
    const vaultAta = getAssociatedTokenAddressSync(params.mint, escrowPda, true)
    const workerAta = getAssociatedTokenAddressSync(params.mint, params.worker)

    const tx = await this.program.methods
      .settle()
      .accounts({
        payer: params.payer,
        escrow: escrowPda,
        mint: params.mint,
        vaultAta,
        workerAta,
        worker: params.worker,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      } as never)
      .transaction()

    tx.feePayer = params.payer
    return tx
  }

  async buildRefundTx(params: RefundParams): Promise<Transaction> {
    const reasonArg: RefundReasonVariant =
      params.reason === 'rejected' ? { rejected: {} } : { expired: {} }
    const [escrowPda] = this.deriveEscrowPda(params.requester, params.nonce)
    const vaultAta = getAssociatedTokenAddressSync(params.mint, escrowPda, true)
    const requesterAta = getAssociatedTokenAddressSync(params.mint, params.requester)

    const tx = await this.program.methods
      .refund(reasonArg as never)
      .accounts({
        payer: params.payer,
        escrow: escrowPda,
        mint: params.mint,
        vaultAta,
        requesterAta,
        requester: params.requester,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      } as never)
      .transaction()

    tx.feePayer = params.payer
    return tx
  }

  async fetchEscrowAccount(pda: PublicKey): Promise<EscrowAccount | null> {
    try {
      const account = await this.program.account.escrow.fetch(pda)
      return account as unknown as EscrowAccount
    } catch {
      return null
    }
  }
}

/**
 * Convenience enum-variant helpers for callers that need to branch on the
 * on-chain status/verdict without importing variant types directly.
 */
export function escrowStatusString(s: EscrowStatusVariant): string {
  return Object.keys(s)[0]
}

export function verdictString(v: VerdictVariant): string {
  return Object.keys(v)[0]
}
