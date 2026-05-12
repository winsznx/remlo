import { NextRequest } from 'next/server'
import type { CallToolResult, RequestInfo } from '@modelcontextprotocol/sdk/types.js'

/**
 * lib/mcp/shim.ts — JSON-RPC ↔ HTTP shim helpers for MCP tools.
 *
 * The MCP server's job is NOT to reimplement Remlo's handler logic.
 * Each MCP tool is a thin wrapper that:
 *
 *   1. Constructs a Web `Request` carrying the tool's inputs as body and
 *      forwarding payment + identity headers from the incoming MCP envelope.
 *   2. Dynamically imports the matching Next.js route handler module.
 *   3. Invokes the handler with the constructed Request, lets the existing
 *      `multiRailRoute` / `mppRoute` wrapper enforce payment, and returns
 *      the upstream response as MCP content.
 *
 * This way the MCP front door and the REST front door share one body of
 * code. If a paid handler changes its pricing or adds a validation rule,
 * MCP picks it up automatically.
 */

/** Headers we forward from an MCP request envelope to the inner route handler. */
const FORWARDED_HEADER_NAMES = [
  'x-payment',
  'authorization',
  'x-agent-identifier',
  'x-agent-timestamp',
  'x-agent-signature',
  'x-agent-nonce',
  'cookie',
  'idempotency-key',
] as const

/**
 * Next.js App Router route handler shape. The handlers we shim each have
 * their own concrete params type (`{id: string}`, `{runId, employeeId}`,
 * `{}`, etc.) and TypeScript's contravariant parameter checking won't
 * unify them under a single generic. We accept that and use a permissive
 * `any` for the params Promise — every tool registration is responsible
 * for constructing path params that match what the underlying route
 * actually expects, and that contract is enforced by the tool's input
 * schema and the per-tool `pathParamFields` declaration.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteHandler = (req: NextRequest, ctx: { params: Promise<any> }) => Promise<Response>

export interface InvokeRouteOptions {
  /** The route module's exported HTTP method handler (e.g. `POST` or `GET`). */
  handler: RouteHandler
  /** HTTP method, used to choose body vs query string serialization. */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** Full URL (e.g. `https://www.remlo.xyz/api/mpp/agent/pay`) used by the wrapper. */
  url: string
  /** Tool arguments — sent as JSON body for POST/PUT, or merged into URL search for GET. */
  args?: Record<string, unknown>
  /** Dynamic route params (`/api/mpp/escrow/[id]/status` → `{ id: '...' }`). */
  pathParams?: Record<string, string>
  /** Inbound MCP request info, carrying payment + identity headers. */
  requestInfo?: RequestInfo
}

/**
 * Construct a Web Request that mirrors what the wrapped route handler expects.
 *
 * The route's payment wrapper (multiRailCharge / mppx.charge) reads
 * `X-PAYMENT` or Tempo MPP `Authorization: Payment ...` off the request to
 * verify settlement.
 * If the MCP client hasn't paid yet, those headers are absent → the wrapper
 * returns 402 with the challenge in `WWW-Authenticate`. The shim surfaces
 * the 402 to the MCP client so it can pay and retry.
 */
function buildInnerRequest(opts: InvokeRouteOptions): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' })

  if (opts.requestInfo?.headers) {
    for (const name of FORWARDED_HEADER_NAMES) {
      const raw = opts.requestInfo.headers[name]
      if (typeof raw === 'string' && raw.length > 0) {
        headers.set(name, raw)
      } else if (Array.isArray(raw) && raw.length > 0) {
        headers.set(name, raw.join(', '))
      }
    }
  }

  let url = opts.url
  let body: string | undefined

  if (opts.method === 'GET' || opts.method === 'DELETE') {
    if (opts.args && Object.keys(opts.args).length > 0) {
      const u = new URL(url)
      for (const [key, value] of Object.entries(opts.args)) {
        if (value !== undefined && value !== null) {
          u.searchParams.set(key, String(value))
        }
      }
      url = u.toString()
    }
  } else {
    body = JSON.stringify(opts.args ?? {})
  }

  return new NextRequest(url, { method: opts.method, headers, body })
}

/**
 * Result envelope used by all paid tool shims. We always wrap the upstream
 * response into a single `text` content block. If the upstream returned 402,
 * we throw a structured Error so the MCP client interceptor can read the
 * challenge and retry with payment.
 */
export interface RouteShimResult {
  status: number
  /** Parsed JSON body if the upstream returned application/json, else raw text. */
  body: unknown
  /** Headers we want the MCP client to see (WWW-Authenticate, Payment-Receipt, etc.). */
  headers: Record<string, string>
}

/**
 * Headers we surface back to the MCP client so it can negotiate payment
 * or read settlement receipts.
 */
const RELAYED_RESPONSE_HEADER_NAMES = [
  'www-authenticate',
  'payment-receipt',
  'payment-response',
  'x-tx-hash',
  'x-explorer-url',
  'x-cache',
] as const

export async function invokeRoute(opts: InvokeRouteOptions): Promise<RouteShimResult> {
  const innerReq = buildInnerRequest(opts)
  const ctx = { params: Promise.resolve(opts.pathParams ?? {}) }
  const res = await opts.handler(innerReq, ctx)

  const relayed: Record<string, string> = {}
  for (const name of RELAYED_RESPONSE_HEADER_NAMES) {
    const v = res.headers.get(name)
    if (v) relayed[name] = v
  }

  let body: unknown
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    try {
      body = await res.json()
    } catch {
      body = null
    }
  } else {
    body = await res.text()
  }

  return { status: res.status, body, headers: relayed }
}

/**
 * Render a `RouteShimResult` as an MCP `CallToolResult`. A 200/2xx becomes
 * a single text content block carrying the JSON body. Anything else is
 * surfaced as an MCP error so the client can react (retry on 402, abort on
 * 4xx, etc.).
 */
export function toToolResult(result: RouteShimResult): CallToolResult {
  if (result.status >= 200 && result.status < 300) {
    return {
      content: [
        {
          type: 'text',
          text: typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2),
        },
      ],
      structuredContent: result.body && typeof result.body === 'object'
        ? (result.body as { [key: string]: unknown })
        : undefined,
    }
  }

  // 402 Payment Required is the most common non-2xx for paid tools. We surface
  // the challenge in a way that MCP clients (and humans) can read directly.
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            status: result.status,
            ...(result.headers['www-authenticate'] && {
              wwwAuthenticate: result.headers['www-authenticate'],
            }),
            body: result.body,
          },
          null,
          2,
        ),
      },
    ],
  }
}
