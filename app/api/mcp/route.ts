import type { NextRequest } from 'next/server'

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

import { authenticateMcpRequest } from '@/lib/mcp/auth'
import { buildRemloMcpServer } from '@/lib/mcp/server'

/**
 * app/api/mcp/route.ts — Remlo MCP server entry point.
 *
 * Implements the MCP Streamable HTTP transport spec. One handler instance
 * per request, no shared session state. The MCP server is built fresh
 * each call, registers all tools, binds to a per-request transport, and
 * returns the transport's response.
 *
 * Transport modes:
 *
 *   POST /api/mcp     — JSON-RPC request from client. May return JSON or SSE.
 *   GET  /api/mcp     — SSE stream for server-initiated notifications.
 *                       Stateless mode: open a one-shot stream that closes
 *                       when the server has nothing more to send.
 *   DELETE /api/mcp   — Stateful mode only (we don't use this). 405.
 *
 * Auth: see `lib/mcp/auth.ts`. Bearer required in production
 * (`MCP_AUTH_MODE=oauth`); public mode skips validation.
 *
 * Per-tool payment: enforced inside the underlying `/api/mpp/*` handlers
 * via `multiRailRoute` / `mppRoute`. The MCP shim forwards `X-PAYMENT`
 * and Tempo MPP `Authorization: Payment ...` headers from the MCP envelope.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleMcp(req: Request): Promise<Response> {
  const auth = await authenticateMcpRequest(req)
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status, headers: auth.headers })
  }

  const server = buildRemloMcpServer()

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // Stateless mode: respond with a single JSON envelope. SSE streaming is
    // available when the client explicitly negotiates it, but the default
    // one-shot path is simpler for ATXP / Sponge / Cursor clients.
    enableJsonResponse: true,
  })

  await server.connect(transport)

  try {
    return await transport.handleRequest(req)
  } finally {
    void server.close()
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  return handleMcp(req)
}

export async function GET(req: NextRequest): Promise<Response> {
  return handleMcp(req)
}

export async function DELETE(): Promise<Response> {
  return Response.json(
    {
      error: 'Stateful sessions are not supported on this MCP server',
      code: 'STATELESS_ONLY',
    },
    { status: 405 },
  )
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, GET, DELETE, OPTIONS',
      'access-control-allow-headers':
        'authorization, content-type, mcp-protocol-version, mcp-session-id, x-payment, x-agent-identifier, x-agent-timestamp, x-agent-signature, x-agent-nonce, idempotency-key',
      'access-control-max-age': '86400',
    },
  })
}
