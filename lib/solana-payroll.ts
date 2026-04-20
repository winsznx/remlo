import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  SOLANA_RPC_URL,
  SOLANA_USDC_MINT_DEVNET,
  SOLANA_USDC_MINT_MAINNET,
  SOLANA_USDC_DECIMALS,
} from '@/lib/solana-constants'

const RECIPIENTS_PER_TX = 8 // accommodates memo instructions within 1232-byte tx limit
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

export interface PayrollRecipient {
  address: string
  amount: number
  memo?: string
}

function getUsdcMint(cluster: 'devnet' | 'mainnet-beta'): PublicKey {
  return new PublicKey(
    cluster === 'mainnet-beta' ? SOLANA_USDC_MINT_MAINNET : SOLANA_USDC_MINT_DEVNET,
  )
}

function buildMemoInstruction(memo: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, 'utf8'),
  })
}

/**
 * Estimates the number of Solana transactions needed for a batch payroll.
 * Each tx fits 8 recipients due to the 1232-byte transaction size limit
 * (reduced from 10 to accommodate Memo Program instructions).
 */
export function estimateBatchCount(recipientCount: number): number {
  return Math.ceil(recipientCount / RECIPIENTS_PER_TX)
}

/**
 * Builds batch USDC transfer transactions for Solana payroll.
 *
 * Does NOT sign the transactions — returns unsigned Transaction objects.
 * The caller is responsible for signing via Privy server wallets (new paths)
 * or another signer (legacy/reference paths).
 *
 * Each transaction:
 *   - Creates ATAs for recipients that don't have one (idempotent)
 *   - Adds SPL token transfer instructions
 *   - Adds Memo Program instructions (for on-chain compliance anchor) when
 *     `recipient.memo` is set
 *   - Groups up to 8 recipients per tx to stay within the 1232-byte limit
 */
export async function buildBatchUsdcTransfer(
  recipients: PayrollRecipient[],
  payerPublicKey: PublicKey,
  cluster: 'devnet' | 'mainnet-beta' = 'devnet',
): Promise<Transaction[]> {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const usdcMint = getUsdcMint(cluster)

  const payerAta = getAssociatedTokenAddressSync(usdcMint, payerPublicKey)

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

  const chunks: PayrollRecipient[][] = []
  for (let i = 0; i < recipients.length; i += RECIPIENTS_PER_TX) {
    chunks.push(recipients.slice(i, i + RECIPIENTS_PER_TX))
  }

  const transactions: Transaction[] = []

  for (const chunk of chunks) {
    const tx = new Transaction()
    tx.recentBlockhash = blockhash
    tx.lastValidBlockHeight = lastValidBlockHeight
    tx.feePayer = payerPublicKey

    for (const recipient of chunk) {
      const recipientPubkey = new PublicKey(recipient.address)
      const recipientAta = getAssociatedTokenAddressSync(usdcMint, recipientPubkey)
      const amountLamports = BigInt(Math.round(recipient.amount * 10 ** SOLANA_USDC_DECIMALS))

      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          payerPublicKey,
          recipientAta,
          recipientPubkey,
          usdcMint,
        ),
      )

      tx.add(
        createTransferInstruction(
          payerAta,
          recipientAta,
          payerPublicKey,
          amountLamports,
          [],
          TOKEN_PROGRAM_ID,
        ),
      )

      if (recipient.memo && recipient.memo.length > 0) {
        tx.add(buildMemoInstruction(recipient.memo, payerPublicKey))
      }
    }

    transactions.push(tx)
  }

  return transactions
}

/**
 * Serializes an unsigned Transaction for Privy server wallet signing.
 * Privy's Solana SDK accepts web3.js Transaction objects directly, but this
 * helper exists for cases where a base64 payload is needed (e.g. passing
 * across an RPC boundary).
 */
export function serializeTransactionForPrivy(tx: Transaction): string {
  return tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString('base64')
}
