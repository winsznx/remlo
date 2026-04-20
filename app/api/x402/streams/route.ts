import { PublicKey } from '@solana/web3.js'
import { mppx } from '@/lib/mpp'
import {
  createSolanaPayrollStream,
  type SolanaStreamConfig,
} from '@/lib/solana-streams'
import { getRemloAgentWallets } from '@/lib/privy-server'

/**
 * POST /api/x402/streams
 * MPP — $0.05 single charge
 *
 * Creates a Solana payroll stream (Ship 4 stub — returns mock handle).
 *
 * Request body (JSON): SolanaStreamConfig
 *   {
 *     "recipientAddress": "<Solana pubkey>",
 *     "amountUsdc": number,
 *     "durationSeconds": number,
 *     "cliffSeconds"?: number,
 *     "cancelAuthority": "sender" | "recipient" | "both"
 *   }
 *
 * Returns: SolanaStreamHandle with provider='streamflow' (mock).
 *
 * Production implementation (Ship 5): wires through Streamflow Protocol SDK
 * on devnet/mainnet, funds the stream from the Privy Solana server wallet,
 * and returns the real on-chain streamId. The interface shape here is the
 * permanent contract — no breaking changes when the stub swaps to real.
 */
export const POST = mppx.charge({ amount: '0.05' })(async (req: Request) => {
  let body: SolanaStreamConfig
  try {
    body = (await req.json()) as SolanaStreamConfig
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Shape validation
  if (!body.recipientAddress) {
    return Response.json({ error: 'recipientAddress required' }, { status: 400 })
  }
  try {
    new PublicKey(body.recipientAddress)
  } catch {
    return Response.json(
      { error: 'recipientAddress is not a valid Solana pubkey' },
      { status: 400 },
    )
  }
  if (!Number.isFinite(body.amountUsdc) || body.amountUsdc <= 0) {
    return Response.json({ error: 'amountUsdc must be > 0' }, { status: 400 })
  }
  if (!Number.isFinite(body.durationSeconds) || body.durationSeconds <= 0) {
    return Response.json({ error: 'durationSeconds must be > 0' }, { status: 400 })
  }
  if (!['sender', 'recipient', 'both'].includes(body.cancelAuthority)) {
    return Response.json(
      { error: "cancelAuthority must be one of 'sender' | 'recipient' | 'both'" },
      { status: 400 },
    )
  }

  const { solanaWallet } = getRemloAgentWallets()
  if (!solanaWallet) {
    return Response.json(
      { error: 'Solana agent wallet not configured on server' },
      { status: 503 },
    )
  }

  try {
    const handle = await createSolanaPayrollStream(body, solanaWallet.id)
    return Response.json({
      ...handle,
      stream_provider: handle.provider,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'stream creation failed'
    // Surface stream-not-configured vs policy rejections vs runtime errors
    // distinctly so callers can react.
    if (/policy|denied|not allowed|whitelist/i.test(message)) {
      return Response.json(
        { error: 'stream_policy_rejected', message },
        { status: 403 },
      )
    }
    return Response.json(
      { error: 'stream_creation_failed', message },
      { status: 500 },
    )
  }
})
