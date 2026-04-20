/**
 * lib/solana-signer-adapter.ts
 *
 * Minimal Privy-backed `SignerWalletAdapter` implementation for SDKs that
 * expect the wallet-adapter interface (Streamflow, Meteora, etc). The Privy
 * server wallet holds the key — we expose only the surface the SDK actually
 * calls at runtime: `publicKey`, `signTransaction`, `signAllTransactions`.
 *
 * The full `SignerWalletAdapter` interface from `@solana/wallet-adapter-base`
 * is much wider (connect/disconnect lifecycle, event emitter, ready state,
 * etc.), but headless SDKs don't touch those. We verified Streamflow 11.4.0
 * at ship time only references `.publicKey` and `.signAllTransactions` on
 * the invoker — see @streamflow/stream/dist/esm/solana/index.js:611 and
 * surrounding usages.
 *
 * We cast to `SignerWalletAdapter` at the SDK boundary; the type-level gap
 * is intentional and documented here rather than in every call site.
 */
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { signSolanaTransaction } from '@/lib/privy-server'

export interface PrivySignerAdapter {
  publicKey: PublicKey
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>
}

export function createPrivySignerAdapter(
  walletId: string,
  walletAddress: string,
): PrivySignerAdapter {
  const publicKey = new PublicKey(walletAddress)

  return {
    publicKey,
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      return (await signSolanaTransaction(walletId, tx)) as T
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
      // Privy's SDK signs one tx per round-trip; sequential is safer than
      // Promise.all when nonce-adjacent transactions share blockhash. The
      // SDK that consumes this interface is responsible for per-tx blockhash.
      const signed: T[] = []
      for (const tx of txs) {
        signed.push((await signSolanaTransaction(walletId, tx)) as T)
      }
      return signed
    },
  }
}
