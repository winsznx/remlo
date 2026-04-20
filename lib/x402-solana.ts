import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server'
import { registerExactSvmScheme } from '@x402/svm/exact/server'
import {
  SOLANA_CAIP2_DEVNET,
  SOLANA_CAIP2_MAINNET,
  X402_FACILITATOR_URL,
} from '@/lib/solana-constants'

// TODO: Wire x402 Solana payment gating into Next.js route handlers once
// @x402/core ships an HTTP adapter for the App Router (or we build a thin
// wrapper around x402ResourceServer). For now this file exports a configured
// server instance and a no-op middleware placeholder.

const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'mainnet-beta'
  ? SOLANA_CAIP2_MAINNET
  : SOLANA_CAIP2_DEVNET

/**
 * x402 resource server with the Exact SVM scheme registered.
 * Use `server.createPaymentRequirements(...)` to build 402 challenges
 * and `server.verifyPayment(...)` to validate incoming x-payment headers.
 */
export const x402SolanaServer: x402ResourceServer = registerExactSvmScheme(
  new x402ResourceServer(
    new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL }),
  ),
  { networks: [SOLANA_NETWORK] },
)

export interface X402SolanaChargeOptions {
  amount: string
  description?: string
}

/**
 * Placeholder middleware for Next.js App Router routes.
 *
 * TODO: Implement the full x402 challenge/verify cycle:
 * 1. Check for x-payment header
 * 2. If absent, return 402 with payment requirements from x402SolanaServer
 * 3. If present, verify via facilitator and proceed to handler
 *
 * For now, this passes through to the handler unconditionally so endpoints
 * can be built and tested without blocking on the payment flow.
 */
export function x402SolanaCharge(_options: X402SolanaChargeOptions) {
  return function (handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
    return handler
  }
}
