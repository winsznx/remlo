import { NextResponse } from 'next/server'
import { createPublicClient, http, defineChain } from 'viem'
import { ethers } from 'ethers'
import { signWithVincent } from '@/lib/vincent-agent'

const tempoModerato = defineChain({
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
})

/**
 * POST /api/demo/lit-sign
 * Signs a 0-value self-send via Lit Protocol Chipotle TEE and broadcasts it to Tempo Moderato.
 * Returns proof: recovered signer matches PKP wallet address, plus live tx hash.
 *
 * Public endpoint — no auth required. PKP wallet holds no real funds (testnet only).
 */
export async function POST() {
  const pkpAddress = process.env.VINCENT_PKP_ETH_ADDRESS as `0x${string}` | undefined
  const usageKey = process.env.LIT_USAGE_KEY

  if (!pkpAddress || !usageKey) {
    return NextResponse.json(
      { error: 'Lit credentials not configured on this server.' },
      { status: 503 }
    )
  }

  const publicClient = createPublicClient({ chain: tempoModerato, transport: http() })

  const [nonce, gasPrice] = await Promise.all([
    publicClient.getTransactionCount({ address: pkpAddress }),
    publicClient.getGasPrice(),
  ])

  const unsignedTx = {
    to: pkpAddress,
    value: 0n,
    data: '0x' as `0x${string}`,
    chainId: 42431,
    nonce,
    gasLimit: 300000n,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: gasPrice / 2n,
  }

  const start = Date.now()
  const signedTx = await signWithVincent(unsignedTx)
  const signingMs = Date.now() - start

  const parsed = ethers.utils.parseTransaction(signedTx)

  const txHash = await publicClient.sendRawTransaction({
    serializedTransaction: signedTx,
  })

  return NextResponse.json({
    pkp_wallet: pkpAddress,
    signer_recovered: parsed.from,
    address_match: parsed.from?.toLowerCase() === pkpAddress.toLowerCase(),
    tx_hash: txHash,
    explorer_url: `https://explore.moderato.tempo.xyz/tx/${txHash}`,
    signing_network: 'Lit Chipotle (api.dev.litprotocol.com)',
    action_cid: 'QmSAfc7Hh6MPhe3T3fTBVEvryYR6ChaeHf2icins23aET7',
    chain: 'Tempo Moderato (chainId 42431)',
    signing_ms: signingMs,
  })
}
