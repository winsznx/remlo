import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerFreeTools } from './tools-free'
import { registerPaidTools } from './tools-paid'

export const REMLO_MCP_NAME = 'remlo'
export const REMLO_MCP_VERSION = '1.0.0'

/**
 * Build a fresh `McpServer` per request. The server is stateless — no
 * sessions, no per-request memory — so spinning a new instance per call
 * is cheap and avoids cross-request leaks. The transport binds to it
 * for one request and is discarded afterward.
 *
 * If we later need stateful sessions (sustained MPP charging, sub-agent
 * memory, etc.) we can pass through a shared `sessionId` from the
 * Streamable HTTP layer; for the Phase 1+2 surface this is unnecessary.
 */
export function buildRemloMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: REMLO_MCP_NAME,
      version: REMLO_MCP_VERSION,
    },
    {
      instructions: [
        'Remlo is a stablecoin payroll + agent payment rail on Tempo, Base, and Solana.',
        '',
        'This MCP server exposes Remlo\'s OpenAPI surface as tools. Read tools (`remlo_agents_directory`, `remlo_agents_profile`, `remlo_reputation_get`, `remlo_openapi_spec`) are free. All other tools are paid via x402 (Base/Solana) or MPP (Tempo) — the price is in `_meta.remlo.price`.',
        '',
        'For paid tools, the client should attach an `X-PAYMENT` header (Base/Solana) or `Authorization: Payment ...` header (Tempo MPP) at the HTTP transport layer when calling. If absent, the tool returns a structured 402 challenge in `isError: true` content the client can read to negotiate payment.',
        '',
        'Tools that mutate employer state (`remlo_agent_pay`, `remlo_payroll_execute`, etc.) additionally require Tier 1 (HMAC) or Tier 2 (ERC-8004 / SAS Solana) identity headers — see `remlo_openapi_spec` and the Authentication doc at https://www.remlo.xyz/docs/mpp-api/authentication.',
      ].join('\n'),
    },
  )

  registerFreeTools(server)
  registerPaidTools(server)

  return server
}
