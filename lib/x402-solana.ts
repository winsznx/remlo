import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server'
import { registerExactSvmScheme } from '@x402/svm/exact/server'
import type { PaymentRequirements, PaymentPayload, Network } from '@x402/core/types'
import {
  SOLANA_CAIP2_DEVNET,
  SOLANA_CAIP2_MAINNET,
  SOLANA_USDC_DECIMALS,
  SOLANA_USDC_MINT_DEVNET,
  SOLANA_USDC_MINT_MAINNET,
  X402_FACILITATOR_URL,
} from '@/lib/solana-constants'

const IS_MAINNET = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'mainnet-beta'

const SOLANA_NETWORK: Network = IS_MAINNET ? SOLANA_CAIP2_MAINNET : SOLANA_CAIP2_DEVNET
const SOLANA_USDC_MINT = IS_MAINNET ? SOLANA_USDC_MINT_MAINNET : SOLANA_USDC_MINT_DEVNET

const X402_VERSION = 2
const DEFAULT_TIMEOUT_SECONDS = 60

/**
 * x402 resource server with the Exact SVM scheme registered.
 * The CDP facilitator at X402_FACILITATOR_URL handles signature verification
 * and settlement broadcasting on Solana — we don't run validators ourselves.
 */
export const x402SolanaServer: x402ResourceServer = registerExactSvmScheme(
  new x402ResourceServer(
    new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL }),
  ),
  { networks: [SOLANA_NETWORK] },
)

let initialized = false
async function ensureInitialized(): Promise<void> {
  if (initialized) return
  // Fetches supported schemes from the facilitator. Cached for the process lifetime.
  // Throws on facilitator unreachable; caller surfaces as 503 to client.
  await x402SolanaServer.initialize()
  initialized = true
}

export interface X402SolanaChargeOptions {
  /** Price in USD (decimal string, e.g., '0.01' for one cent). */
  amount: string
  description?: string
  /**
   * Override the recipient wallet. Defaults to SOLANA_FEE_RECIPIENT_ADDRESS env.
   * MUST be an EOA holding an SPL-USDC token account on the active cluster.
   */
  recipient?: string
}

function dollarsToAtomicUsdc(amount: string): string {
  const decimal = Number.parseFloat(amount)
  if (!Number.isFinite(decimal) || decimal < 0) {
    throw new Error(`Invalid x402 charge amount: ${amount}`)
  }
  const atomic = Math.round(decimal * 10 ** SOLANA_USDC_DECIMALS)
  return atomic.toString()
}

function buildPaymentRequirements(
  options: X402SolanaChargeOptions,
  resourceUrl: string,
): PaymentRequirements {
  const recipient = options.recipient ?? process.env.SOLANA_FEE_RECIPIENT_ADDRESS
  if (!recipient) {
    throw new Error(
      'SOLANA_FEE_RECIPIENT_ADDRESS env not set — required for x402 Solana charge',
    )
  }
  return {
    scheme: 'exact',
    network: SOLANA_NETWORK,
    asset: SOLANA_USDC_MINT,
    amount: dollarsToAtomicUsdc(options.amount),
    payTo: recipient,
    maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    extra: {
      ...(options.description ? { description: options.description } : {}),
      resource: resourceUrl,
    },
  }
}

interface UnpaidResult {
  paid: false
  response: Response
}

interface PaidResult {
  paid: true
  payload: PaymentPayload
  requirements: PaymentRequirements
}

async function verifyOrChallenge(
  req: Request,
  options: X402SolanaChargeOptions,
): Promise<UnpaidResult | PaidResult> {
  let requirements: PaymentRequirements
  try {
    await ensureInitialized()
    requirements = buildPaymentRequirements(options, req.url)
  } catch (err) {
    console.error('[x402-solana] init/build requirements failed', err)
    return {
      paid: false,
      response: new Response(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'x402 Solana charge unavailable',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      ),
    }
  }

  const xPayment = req.headers.get('X-PAYMENT')
  if (!xPayment) {
    return { paid: false, response: build402(req, requirements) }
  }

  let payload: PaymentPayload
  try {
    const decoded = Buffer.from(xPayment, 'base64').toString('utf-8')
    payload = JSON.parse(decoded) as PaymentPayload
  } catch (err) {
    console.warn('[x402-solana] X-PAYMENT decode failed', err)
    return { paid: false, response: build402(req, requirements, 'Malformed X-PAYMENT header') }
  }

  try {
    const verifyResult = await x402SolanaServer.verifyPayment(payload, requirements)
    if (!verifyResult.isValid) {
      return {
        paid: false,
        response: build402(
          req,
          requirements,
          verifyResult.invalidMessage ?? verifyResult.invalidReason ?? 'Payment invalid',
        ),
      }
    }
  } catch (err) {
    console.error('[x402-solana] verify threw', err)
    return { paid: false, response: build402(req, requirements, 'Payment verification error') }
  }

  return { paid: true, payload, requirements }
}

function build402(req: Request, requirements: PaymentRequirements, error?: string): Response {
  const body = {
    x402Version: X402_VERSION,
    ...(error ? { error } : {}),
    resource: { url: req.url },
    accepts: [requirements],
  }
  return new Response(JSON.stringify(body), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Wrap a Next.js route handler with x402 Solana payment enforcement.
 *
 * Flow:
 *   1. Read X-PAYMENT header.
 *   2. Absent or malformed → return 402 with PaymentRequirements (Solana SVM Exact).
 *   3. Present → verify via the CDP facilitator. Invalid → 402 with reason.
 *   4. Valid → run the wrapped handler.
 *   5. After handler returns, settle the payment (broadcast via facilitator) out-of-band.
 *      Settlement failure is logged but does not tear down the response that already
 *      went out. Clients that need settle confirmation poll the facilitator directly.
 *
 * Usage:
 *   export const POST = x402SolanaCharge({ amount: '0.05', description: 'Compliance check' })(handler)
 */
export function x402SolanaCharge(options: X402SolanaChargeOptions) {
  return function (
    handler: (req: Request) => Promise<Response>,
  ): (req: Request) => Promise<Response> {
    return async (req: Request) => {
      const result = await verifyOrChallenge(req, options)
      if (!result.paid) return result.response

      const response = await handler(req)

      // Fire-and-forget settlement. Don't block the response on facilitator round-trip.
      void (async () => {
        try {
          const settleResult = await x402SolanaServer.settlePayment(
            result.payload,
            result.requirements,
          )
          if (!settleResult.success) {
            console.error('[x402-solana] settlement failed', {
              reason: settleResult.errorReason,
              message: settleResult.errorMessage,
              payer: settleResult.payer,
            })
          }
        } catch (err) {
          console.error('[x402-solana] settlement threw', err)
        }
      })()

      return response
    }
  }
}
