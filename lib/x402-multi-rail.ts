import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server'
import { registerExactSvmScheme } from '@x402/svm/exact/server'
import { registerExactEvmScheme } from '@x402/evm/exact/server'
import type { PaymentRequirements, PaymentPayload, Network } from '@x402/core/types'
import { Mppx, tempo as mppxTempo } from 'mppx/nextjs'
import {
  SOLANA_CAIP2_DEVNET,
  SOLANA_CAIP2_MAINNET,
  SOLANA_USDC_MINT_DEVNET,
  SOLANA_USDC_MINT_MAINNET,
  X402_FACILITATOR_URL,
} from '@/lib/solana-constants'

/**
 * lib/x402-multi-rail.ts
 *
 * Unified payment gateway for HTTP endpoints. Accepts agent payments on:
 *   - Tempo  (eip155:4217)  via mppx (Tempo's embedded facilitator)
 *   - Base   (eip155:8453)  via CDP facilitator (x402 protocol)
 *   - Solana (solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp) via CDP facilitator
 *
 * One 402 response surfaces all three rails: agents (AgentCash, @x402/core
 * SDK, Coinbase Agent Kit, custom code) read `accepts[]` for x402 networks
 * and the `WWW-Authenticate` MPP challenge for Tempo. Wallet picks rail by
 * balance, signs the payload, retries with credentials. Server inspects the
 * incoming auth method and routes to the right verifier.
 *
 * Why this split: no public x402 facilitator supports Tempo as of 2026-05-03,
 * so Tempo verification stays with mppx (which runs its own embedded
 * facilitator). Base + Solana are CDP-supported and go through @x402/core.
 */

const IS_SOLANA_MAINNET = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'mainnet-beta'

const SOLANA_NETWORK: Network = IS_SOLANA_MAINNET
  ? SOLANA_CAIP2_MAINNET
  : SOLANA_CAIP2_DEVNET
const SOLANA_USDC_MINT = IS_SOLANA_MAINNET
  ? SOLANA_USDC_MINT_MAINNET
  : SOLANA_USDC_MINT_DEVNET

const BASE_NETWORK: Network = 'eip155:8453'
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const TEMPO_NETWORK: Network = 'eip155:4217'
const TEMPO_USDC_E = '0x20C000000000000000000000b9537d11c60E8b50'

const REALM = 'www.remlo.xyz'
const X402_VERSION = 2
const DEFAULT_TIMEOUT_SECONDS = 60
const ATOMIC_DECIMALS = 6 // USDC and USDC.e both use 6 decimals on every supported chain

const cdpFacilitator = new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL })
const cdpServer: x402ResourceServer = registerExactEvmScheme(
  registerExactSvmScheme(new x402ResourceServer(cdpFacilitator), {
    networks: [SOLANA_NETWORK],
  }),
  { networks: [BASE_NETWORK] },
)

let cdpInitialized = false
async function ensureCdpInitialized(): Promise<void> {
  if (cdpInitialized) return
  await cdpServer.initialize()
  cdpInitialized = true
}

let tempoMppxInstance: ReturnType<typeof buildTempoMppx> | null = null
function buildTempoMppx() {
  return Mppx.create({
    realm: REALM,
    methods: [
      mppxTempo({
        chainId: 4217,
        currency: TEMPO_USDC_E,
        recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
      }),
    ],
  })
}
function getTempoMppx() {
  if (!tempoMppxInstance) tempoMppxInstance = buildTempoMppx()
  return tempoMppxInstance
}

function isTempoMppAuthorization(authHeader: string | null): boolean {
  if (!authHeader) return false
  const normalized = authHeader.trim().toLowerCase()
  return normalized.startsWith('payment ') || normalized.startsWith('mpp ')
}

function withPaymentCachePolicy(response: Response): Response {
  const headers = new Headers(response.headers)

  if (response.status === 402) {
    headers.set('Cache-Control', 'no-store')
  } else if (headers.has('Payment-Receipt')) {
    headers.set('Cache-Control', headers.get('Cache-Control') ?? 'private, no-store')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export interface MultiRailChargeOptions {
  /** Price in USD (decimal string, e.g., '0.05'). Same amount applies on every rail. */
  amount: string
  description?: string
  /**
   * Restrict to a subset of rails. Defaults to ['tempo', 'base', 'solana'].
   * Use this to disable rails per endpoint (e.g., Solana-only for stream creation).
   */
  rails?: Array<'tempo' | 'base' | 'solana'>
}

function dollarsToAtomic(amount: string): string {
  const decimal = Number.parseFloat(amount)
  if (!Number.isFinite(decimal) || decimal < 0) {
    throw new Error(`Invalid charge amount: ${amount}`)
  }
  return Math.round(decimal * 10 ** ATOMIC_DECIMALS).toString()
}

function buildBaseRequirements(opts: MultiRailChargeOptions, resourceUrl: string): PaymentRequirements {
  const recipient = process.env.BASE_FEE_RECIPIENT_ADDRESS
  if (!recipient) {
    throw new Error('BASE_FEE_RECIPIENT_ADDRESS env not set')
  }
  return {
    scheme: 'exact',
    network: BASE_NETWORK,
    asset: BASE_USDC,
    amount: dollarsToAtomic(opts.amount),
    payTo: recipient,
    maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    extra: {
      ...(opts.description ? { description: opts.description } : {}),
      resource: resourceUrl,
    },
  }
}

function buildSolanaRequirements(opts: MultiRailChargeOptions, resourceUrl: string): PaymentRequirements {
  const recipient = process.env.SOLANA_FEE_RECIPIENT_ADDRESS
  if (!recipient) {
    throw new Error('SOLANA_FEE_RECIPIENT_ADDRESS env not set')
  }
  return {
    scheme: 'exact',
    network: SOLANA_NETWORK,
    asset: SOLANA_USDC_MINT,
    amount: dollarsToAtomic(opts.amount),
    payTo: recipient,
    maxTimeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    extra: {
      ...(opts.description ? { description: opts.description } : {}),
      resource: resourceUrl,
    },
  }
}

function decodeXPayment(header: string): PaymentPayload | null {
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8')
    return JSON.parse(decoded) as PaymentPayload
  } catch {
    return null
  }
}

interface BuildChallengeOptions {
  request: Request
  options: MultiRailChargeOptions
  error?: string
}

/**
 * Generate the Tempo `WWW-Authenticate: Payment ...` header by delegating to
 * mppx. The header carries a signed challenge id and a base64-encoded
 * PaymentRequest token that mppx will verify on retry, so we cannot replicate
 * the format by hand.
 *
 * Returns null if the Tempo rail is disabled or mppx fails to produce a 402.
 */
async function generateTempoChallengeHeader(
  request: Request,
  options: MultiRailChargeOptions,
): Promise<string | null> {
  if (!process.env.REMLO_TREASURY_ADDRESS) return null
  try {
    // Calling mppx with a noop handler against a fresh request returns its
    // 402 challenge Response. We extract the WWW-Authenticate header and
    // discard the body. The Request is cloned so the original body stays
    // readable for downstream handlers if any.
    const probe = new Request(request.url, {
      method: request.method,
      headers: request.headers,
    })
    const noopHandler = async () => new Response('', { status: 200 })
    const wrapped = getTempoMppx().tempo.charge({ amount: options.amount })(noopHandler)
    const result = await wrapped(probe)
    if (result.status !== 402) return null
    return result.headers.get('WWW-Authenticate')
  } catch (err) {
    console.warn('[multi-rail] mppx challenge generation failed', err)
    return null
  }
}

async function buildUnifiedChallenge({ request, options, error }: BuildChallengeOptions): Promise<Response> {
  const rails = new Set(options.rails ?? ['tempo', 'base', 'solana'])
  const accepts: PaymentRequirements[] = []
  if (rails.has('base')) {
    try {
      accepts.push(buildBaseRequirements(options, request.url))
    } catch (err) {
      console.warn('[multi-rail] Base requirements skipped', err)
    }
  }
  if (rails.has('solana')) {
    try {
      accepts.push(buildSolanaRequirements(options, request.url))
    } catch (err) {
      console.warn('[multi-rail] Solana requirements skipped', err)
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  }
  if (rails.has('tempo')) {
    const tempoHeader = await generateTempoChallengeHeader(request, options)
    if (tempoHeader) headers['WWW-Authenticate'] = tempoHeader
  }

  const body = {
    x402Version: X402_VERSION,
    ...(error ? { error } : {}),
    resource: { url: request.url },
    accepts,
  }
  return new Response(JSON.stringify(body), { status: 402, headers })
}

interface CdpRailMatch {
  rail: 'base' | 'solana'
  requirements: PaymentRequirements
}

function matchCdpRail(
  payload: PaymentPayload,
  options: MultiRailChargeOptions,
  resourceUrl: string,
): CdpRailMatch | null {
  const network = payload.accepted?.network
  if (!network) return null
  const rails = new Set(options.rails ?? ['tempo', 'base', 'solana'])

  if (rails.has('base') && network.toLowerCase() === BASE_NETWORK.toLowerCase()) {
    try {
      return { rail: 'base', requirements: buildBaseRequirements(options, resourceUrl) }
    } catch {
      return null
    }
  }
  if (rails.has('solana') && network.toLowerCase() === SOLANA_NETWORK.toLowerCase()) {
    try {
      return { rail: 'solana', requirements: buildSolanaRequirements(options, resourceUrl) }
    } catch {
      return null
    }
  }
  return null
}

/**
 * Wrap a Next.js route handler with multi-rail x402 / mpp payment enforcement.
 *
 * Detection precedence:
 *   1. `Authorization: Payment ...` or legacy `mpp ...` header → Tempo (mppx).
 *   2. `X-PAYMENT` header → x402 (Base or Solana, dispatched by `accepted.network`).
 *   3. Neither → return 402 with all enabled rails listed.
 *
 * Settlement is fire-and-forget so handler latency isn't tail-extended by the
 * facilitator round trip. Settlement failures are logged.
 */
export function multiRailCharge(options: MultiRailChargeOptions) {
  return function (
    handler: (req: Request) => Promise<Response>,
  ): (req: Request) => Promise<Response> {
    return async (req: Request) => {
      const enabledRails = new Set(options.rails ?? ['tempo', 'base', 'solana'])

      const authHeader = req.headers.get('Authorization')
      const isMppAuth = isTempoMppAuthorization(authHeader)

      // Tempo via mppx (mpp protocol). The Next.js mppx variant takes the handler
      // closure and returns a Next-compatible wrapped handler that emits a Tempo-only
      // 402 if credentials are missing/invalid, or attaches a Payment-Receipt header
      // and returns the handler's response on success.
      if (isMppAuth && enabledRails.has('tempo')) {
        try {
          const wrapped = getTempoMppx().tempo.charge({ amount: options.amount })(handler)
          return withPaymentCachePolicy(await wrapped(req))
        } catch (err) {
          console.error('[multi-rail] mppx Tempo charge threw', err)
          return await buildUnifiedChallenge({
            request: req,
            options,
            error: 'Tempo charge failed',
          })
        }
      }

      // x402 protocol (Base or Solana).
      const xPayment = req.headers.get('X-PAYMENT')
      if (xPayment) {
        const payload = decodeXPayment(xPayment)
        if (!payload) {
          return await buildUnifiedChallenge({
            request: req,
            options,
            error: 'Malformed X-PAYMENT header',
          })
        }
        const match = matchCdpRail(payload, options, req.url)
        if (!match) {
          return await buildUnifiedChallenge({
            request: req,
            options,
            error: `Unsupported payment network: ${payload.accepted?.network ?? 'unknown'}`,
          })
        }

        try {
          await ensureCdpInitialized()
        } catch (err) {
          console.error('[multi-rail] CDP facilitator init failed', err)
          return new Response(
            JSON.stringify({ error: 'Payment facilitator unavailable' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
          )
        }

        try {
          const verify = await cdpServer.verifyPayment(payload, match.requirements)
          if (!verify.isValid) {
            return await buildUnifiedChallenge({
              request: req,
              options,
              error: verify.invalidMessage ?? verify.invalidReason ?? 'Payment invalid',
            })
          }
        } catch (err) {
          console.error('[multi-rail] verifyPayment threw', { rail: match.rail, err })
          return await buildUnifiedChallenge({
            request: req,
            options,
            error: 'Payment verification error',
          })
        }

        const response = await handler(req)

        // Fire-and-forget settle. Don't tail-extend handler latency.
        void (async () => {
          try {
            const settle = await cdpServer.settlePayment(payload, match.requirements)
            if (!settle.success) {
              console.error('[multi-rail] settle failed', {
                rail: match.rail,
                reason: settle.errorReason,
                message: settle.errorMessage,
              })
            }
          } catch (err) {
            console.error('[multi-rail] settle threw', { rail: match.rail, err })
          }
        })()

        return response
      }

      // No payment headers — return unified 402 challenge.
      return await buildUnifiedChallenge({ request: req, options })
    }
  }
}

// ─── Re-exports for callers that need to confirm a network is actually a rail we know about ─────

export const SUPPORTED_RAILS = {
  tempo: { network: TEMPO_NETWORK, asset: TEMPO_USDC_E },
  base: { network: BASE_NETWORK, asset: BASE_USDC },
  solana: { network: SOLANA_NETWORK, asset: SOLANA_USDC_MINT },
} as const
