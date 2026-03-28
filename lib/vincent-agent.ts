import { ethers } from 'ethers'

// Lit Chipotle REST API — TEE-backed PKP signing without a node client SDK.
// The PKP private key is generated and held inside Lit's distributed TEE network.
// It is never transmitted to callers; only signed outputs leave the enclave.
const LIT_API_URL = 'https://api.dev.litprotocol.com/core/v1'

// The signing Lit Action. Runs inside a Lit TEE. The exact content of this
// string determines the IPFS CID — changing it requires re-running
// scripts/setup-vincent.ts to authorize the new CID in the signing group.
// Authorized CID: QmSAfc7Hh6MPhe3T3fTBVEvryYR6ChaeHf2icins23aET7
const SIGNING_ACTION_CODE =
  'async function main({ pkpId, unsignedTxHex }) { const tx = ethers.utils.parseTransaction(unsignedTxHex); const wallet = new ethers.Wallet(await Lit.Actions.getPrivateKey({ pkpId })); const signedTx = await wallet.signTransaction(tx); return { signedTransaction: signedTx }; }'

export interface UnsignedTempoTx {
  to: `0x${string}`
  value: bigint
  data: `0x${string}`
  chainId: number
  nonce: number
  gasLimit: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

function serializeEip1559(tx: UnsignedTempoTx): string {
  const unsigned: ethers.UnsignedTransaction = {
    to: tx.to,
    value: tx.value,
    data: tx.data,
    chainId: tx.chainId,
    nonce: tx.nonce,
    gasLimit: tx.gasLimit,
    maxFeePerGas: tx.maxFeePerGas,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    type: 2,
  }
  return ethers.utils.serializeTransaction(unsigned)
}

interface LitActionResponse {
  response: { signedTransaction: string }
  has_error: boolean
  logs: string
}

/**
 * Signs an unsigned Tempo L1 transaction via Lit Protocol Chipotle TEE.
 *
 * The PKP private key never leaves the enclave. The signing Lit Action runs
 * inside a Verified TEE, retrieves the key, and returns only the signed tx.
 *
 * @returns Signed transaction hex ready for `publicClient.sendRawTransaction()`
 */
export async function signWithVincent(unsignedTx: UnsignedTempoTx): Promise<`0x${string}`> {
  const usageKey = requireEnv('LIT_USAGE_KEY')
  const pkpAddress = requireEnv('VINCENT_PKP_ETH_ADDRESS')

  const unsignedTxHex = serializeEip1559(unsignedTx)

  const res = await fetch(`${LIT_API_URL}/lit_action`, {
    method: 'POST',
    headers: {
      'X-Api-Key': usageKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: SIGNING_ACTION_CODE,
      js_params: { pkpId: pkpAddress, unsignedTxHex },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Lit action request failed (${res.status}): ${text}`)
  }

  const result = (await res.json()) as LitActionResponse

  if (result.has_error) {
    throw new Error(`Lit action execution failed. Logs: ${result.logs}`)
  }

  return result.response.signedTransaction as `0x${string}`
}
