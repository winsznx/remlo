import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ZodRawShape } from 'zod'

import { POST as agentPayPOST } from '@/app/api/mpp/agent/pay/route'
import { POST as agentSessionTreasuryPOST } from '@/app/api/mpp/agent/session/treasury/route'
import { POST as agentsRegisterPOST } from '@/app/api/mpp/agents/register/route'
import { POST as bridgeOfframpPOST } from '@/app/api/mpp/bridge/offramp/route'
import { POST as complianceCheckPOST } from '@/app/api/mpp/compliance/check/route'
import { POST as employeeAdvancePOST } from '@/app/api/mpp/employee/advance/route'
import { GET as employeeHistoryGET } from '@/app/api/mpp/employee/[id]/history/route'
import { GET as escrowStatusGET } from '@/app/api/mpp/escrow/[id]/status/route'
import { POST as escrowDeliverPOST } from '@/app/api/mpp/escrow/deliver/route'
import { POST as escrowPostPOST } from '@/app/api/mpp/escrow/post/route'
import { POST as memoDecodePOST } from '@/app/api/mpp/memo/decode/route'
import { POST as payrollExecutePOST } from '@/app/api/mpp/payroll/execute/route'
import { GET as payslipsGET } from '@/app/api/mpp/payslips/[runId]/[employeeId]/route'
import { POST as treasuryOptimizePOST } from '@/app/api/mpp/treasury/optimize/route'
import { GET as treasuryYieldRatesGET } from '@/app/api/mpp/treasury/yield-rates/route'

import { invokeRoute, toToolResult, type RouteHandler } from './shim'

/**
 * lib/mcp/tools-paid.ts — paid Remlo endpoints exposed as MCP tools.
 *
 * Each tool is a thin shim over an existing `/api/mpp/*` route. The MCP
 * client passes through `X-PAYMENT` (Base/Solana x402) or
 * `Authorization: Payment ...` (Tempo MPP) headers in the tool call envelope;
 * `lib/mcp/shim.ts` forwards them to the route handler so the existing
 * `multiRailRoute` / `mppRoute` payment wrappers see them.
 *
 * If the wrapper returns 402, the shim surfaces the WWW-Authenticate
 * challenge to the MCP client as a structured error so the client's
 * x402/MPP interceptor can pay and retry.
 *
 * Pricing on `_meta.remlo.price` mirrors the OpenAPI spec's
 * `x-payment-info`. MCP clients that surface pricing pre-call (ATXP,
 * Sponge, Cursor with extensions) can render it without paying.
 */

const REMLO_BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.remlo.xyz'

type Rail = 'tempo' | 'base' | 'solana'
const MULTI_RAIL: Rail[] = ['tempo', 'base', 'solana']
const TEMPO_ONLY: Rail[] = ['tempo']

interface PaidToolDef<Args extends ZodRawShape> {
  name: string
  title: string
  description: string
  handler: RouteHandler
  routePath: string
  method: 'GET' | 'POST'
  price: string
  rails: Rail[]
  inputSchema: Args
  /** When the route is dynamic (`[id]/[employeeId]`), pull path params from args. */
  pathParamFields?: readonly string[]
  destructive?: boolean
  idempotent?: boolean
}

function definePaidTool<Args extends ZodRawShape>(def: PaidToolDef<Args>): PaidToolDef<Args> {
  return def
}

const PAID_TOOLS = [
  definePaidTool({
    name: 'remlo_treasury_yield_rates',
    title: 'Yield rates across treasury venues',
    description:
      "Return current USD-denominated yield rates for supported on-chain treasury venues (Aave, Morpho, MarginFi, etc.) plus Remlo's recommended allocation. Multi-rail $0.01.",
    handler: treasuryYieldRatesGET,
    routePath: '/api/mpp/treasury/yield-rates',
    method: 'GET',
    price: '0.01',
    rails: MULTI_RAIL,
    inputSchema: {},
    idempotent: true,
  }),
  definePaidTool({
    name: 'remlo_payslip_get',
    title: 'Fetch a single payslip',
    description:
      'Return a payslip for one (run, employee) pair. Requires Tier 1 / Tier 2 caller identity. Multi-rail $0.02.',
    handler: payslipsGET,
    routePath: '/api/mpp/payslips',
    method: 'GET',
    price: '0.02',
    rails: MULTI_RAIL,
    inputSchema: {
      runId: z.string().uuid().describe('Payroll run ID'),
      employeeId: z.string().uuid().describe('Employee ID'),
    },
    pathParamFields: ['runId', 'employeeId'],
    idempotent: true,
  }),
  definePaidTool({
    name: 'remlo_payment_history',
    title: 'Employee payment history',
    description:
      'Return payment history for one employee (paid runs, advances, escrow deliveries). Requires Tier 1 / Tier 2 caller identity. Multi-rail $0.05.',
    handler: employeeHistoryGET,
    routePath: '/api/mpp/employee',
    method: 'GET',
    price: '0.05',
    rails: MULTI_RAIL,
    inputSchema: {
      id: z.string().uuid().describe('Employee ID'),
      limit: z.number().int().min(1).max(200).optional(),
      cursor: z.string().optional(),
    },
    pathParamFields: ['id'],
    idempotent: true,
  }),
  definePaidTool({
    name: 'remlo_compliance_check',
    title: 'Wallet compliance screening',
    description:
      'Screen a wallet address against OFAC and other sanctions lists. Returns risk classification + cleared-list eligibility. Multi-rail $0.05.',
    handler: complianceCheckPOST,
    routePath: '/api/mpp/compliance/check',
    method: 'POST',
    price: '0.05',
    rails: MULTI_RAIL,
    inputSchema: {
      wallet_address: z.string().min(1).describe('Wallet to screen'),
      employer_id: z.string().uuid().optional().describe('Optional: associate the check with an employer'),
    },
    idempotent: true,
  }),
  definePaidTool({
    name: 'remlo_memo_decode',
    title: 'Decode a Remlo payment memo',
    description:
      'Decode a Remlo payroll memo (32-byte tag) into employer ID, employee ID, pay period, and cost center. Multi-rail $0.01.',
    handler: memoDecodePOST,
    routePath: '/api/mpp/memo/decode',
    method: 'POST',
    price: '0.01',
    rails: MULTI_RAIL,
    inputSchema: {
      memo: z.string().min(1).describe('0x-prefixed 32-byte memo tag from a Remlo payment'),
    },
    idempotent: true,
  }),
  definePaidTool({
    name: 'remlo_escrow_post',
    title: 'Post a Remlo escrow',
    description:
      'Post a new milestone escrow on Remlo. The poster funds the escrow, names a counterparty, and sets a deadline. Multi-rail $0.10.',
    handler: escrowPostPOST,
    routePath: '/api/mpp/escrow/post',
    method: 'POST',
    price: '0.10',
    rails: MULTI_RAIL,
    inputSchema: {
      employer_id: z.string().uuid(),
      counterparty_wallet: z.string().min(1),
      amount: z.string().describe('USDC amount as decimal string'),
      deadline_unix: z.number().int().describe('Unix epoch (seconds) by which escrow auto-cancels if not delivered'),
      metadata: z.record(z.string(), z.unknown()).optional(),
    },
  }),
  definePaidTool({
    name: 'remlo_escrow_deliver',
    title: 'Deliver against a Remlo escrow',
    description:
      'Mark an escrow as delivered. Triggers vote window if disputed. Multi-rail $0.02.',
    handler: escrowDeliverPOST,
    routePath: '/api/mpp/escrow/deliver',
    method: 'POST',
    price: '0.02',
    rails: MULTI_RAIL,
    inputSchema: {
      escrow_id: z.string().uuid(),
      proof_uri: z.string().optional().describe('Optional URI pointing to delivery proof (PDF, transaction hash, etc.)'),
    },
  }),
  definePaidTool({
    name: 'remlo_escrow_status',
    title: 'Read escrow status',
    description:
      'Return the current state of an escrow (posted / delivered / disputed / settled / refunded). Multi-rail $0.01.',
    handler: escrowStatusGET,
    routePath: '/api/mpp/escrow',
    method: 'GET',
    price: '0.01',
    rails: MULTI_RAIL,
    inputSchema: {
      id: z.string().uuid().describe('Escrow ID'),
    },
    pathParamFields: ['id'],
    idempotent: true,
  }),
  definePaidTool({
    name: 'remlo_agent_pay',
    title: 'Agent-to-agent USDC payment',
    description:
      "Execute a one-shot USDC payment from an employer's Tempo treasury to an arbitrary recipient. Caller must hold a valid Tier 1 (HMAC) or Tier 2 (ERC-8004 / SAS Solana) employer authorization. Multi-rail $0.05.",
    handler: agentPayPOST,
    routePath: '/api/mpp/agent/pay',
    method: 'POST',
    price: '0.05',
    rails: MULTI_RAIL,
    inputSchema: {
      employer_id: z.string().uuid(),
      recipient_wallet: z.string().min(1).describe('0x EVM address (Tempo)'),
      amount: z.string().describe('USDC amount as decimal string'),
      reference: z.string().optional().describe('Free-form note attached to the payment'),
    },
    destructive: true,
  }),
  definePaidTool({
    name: 'remlo_agent_register',
    title: 'Register an agent in the Remlo directory',
    description:
      "Publish an agent's profile to the Remlo directory (one-click authorizable from any employer's dashboard). Anchored on-chain via ERC-8004 IdentityRegistry on Tempo, or via Solana Attestation Service for Solana-native agents. Multi-rail $0.10.",
    handler: agentsRegisterPOST,
    routePath: '/api/mpp/agents/register',
    method: 'POST',
    price: '0.10',
    rails: MULTI_RAIL,
    inputSchema: {
      agent_id: z.string().optional().describe('ERC-8004 token ID (decimal). Required for Tempo-anchored agents.'),
      owner_address: z.string().optional().describe('EOA that owns the ERC-8004 token. Required for Tempo-anchored agents.'),
      solana_pubkey: z.string().optional().describe('Solana base58 pubkey. Required for SAS-anchored agents.'),
      timestamp_ms: z.string().describe('Unix milliseconds when the proof was signed'),
      signature: z.string().describe('ECDSA (Tempo) or Ed25519 (Solana) signature of the canonical message'),
      display_name: z.string().min(1).max(80),
      description: z.string().max(500).optional(),
      endpoint: z.string().url().optional(),
      capabilities: z.array(z.string()).max(12).optional(),
      contact_url: z.string().optional(),
    },
  }),
  definePaidTool({
    name: 'remlo_treasury_optimize',
    title: 'Plan a treasury rebalance',
    description:
      'Compute (and optionally execute) a treasury rebalance across yield venues based on current rates and risk constraints. Tempo-only $0.10.',
    handler: treasuryOptimizePOST,
    routePath: '/api/mpp/treasury/optimize',
    method: 'POST',
    price: '0.10',
    rails: TEMPO_ONLY,
    inputSchema: {
      employer_id: z.string().uuid(),
      execute: z.boolean().optional().describe('If true, broadcast the rebalance txs. If false (default), return plan only.'),
      max_slippage_bps: z.number().int().optional(),
    },
    destructive: true,
  }),
  definePaidTool({
    name: 'remlo_treasury_session',
    title: 'Open a treasury read session (SSE)',
    description:
      'Open a long-lived MPP session for sustained treasury reads. Per-second billing via mppx.session. Tempo-only $0.02.',
    handler: agentSessionTreasuryPOST,
    routePath: '/api/mpp/agent/session/treasury',
    method: 'POST',
    price: '0.02',
    rails: TEMPO_ONLY,
    inputSchema: {
      employer_id: z.string().uuid(),
      duration_seconds: z.number().int().min(1).max(3600).optional(),
    },
  }),
  definePaidTool({
    name: 'remlo_payroll_execute',
    title: 'Execute a payroll run',
    description:
      "Execute a planned payroll run against the employer's Tempo treasury. Caller must hold employer (Privy) or employer-authorized agent (Tier 1/2) identity. Tempo-only $1.00.",
    handler: payrollExecutePOST,
    routePath: '/api/mpp/payroll/execute',
    method: 'POST',
    price: '1.00',
    rails: TEMPO_ONLY,
    inputSchema: {
      employer_id: z.string().uuid(),
      run_id: z.string().uuid().describe('Payroll run ID to execute'),
      idempotency_key: z.string().optional(),
    },
    destructive: true,
  }),
  definePaidTool({
    name: 'remlo_employee_advance',
    title: 'Issue an employee advance',
    description:
      "Issue an early-wage advance to an employee from the employer's Tempo treasury. Tempo-only $0.50.",
    handler: employeeAdvancePOST,
    routePath: '/api/mpp/employee/advance',
    method: 'POST',
    price: '0.50',
    rails: TEMPO_ONLY,
    inputSchema: {
      employer_id: z.string().uuid(),
      employee_id: z.string().uuid(),
      amount: z.string().describe('USDC amount as decimal string'),
      reason: z.string().optional(),
    },
    destructive: true,
  }),
  definePaidTool({
    name: 'remlo_bridge_offramp',
    title: 'Off-ramp USDC to fiat via Bridge',
    description:
      "Initiate a fiat off-ramp from the employer's Tempo treasury to a linked external bank account (ACH/SEPA/Wire). Tempo-only $0.25.",
    handler: bridgeOfframpPOST,
    routePath: '/api/mpp/bridge/offramp',
    method: 'POST',
    price: '0.25',
    rails: TEMPO_ONLY,
    inputSchema: {
      employer_id: z.string().uuid(),
      employee_id: z.string().uuid(),
      external_account_id: z.string().describe('Bridge external account ID for the destination bank'),
      amount: z.string().describe('USDC amount as decimal string'),
    },
    destructive: true,
  }),
] as const

export function registerPaidTools(server: McpServer): void {
  for (const tool of PAID_TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          readOnlyHint: tool.method === 'GET' && !tool.destructive,
          destructiveHint: tool.destructive ?? false,
          idempotentHint: tool.idempotent ?? false,
          openWorldHint: true,
        },
        _meta: {
          remlo: {
            price: { currency: 'USD', amount: tool.price },
            rails: tool.rails,
            protocol: tool.rails.length > 1 ? 'mpp+x402' : 'mpp',
            routePath: tool.routePath,
          },
        },
      },
      async (rawArgs: unknown, extra: { requestInfo?: import('@modelcontextprotocol/sdk/types.js').RequestInfo }) => {
        const args = (rawArgs ?? {}) as Record<string, unknown>
        const pathParams: Record<string, string> = {}
        const bodyOrQueryArgs: Record<string, unknown> = { ...args }

        if (tool.pathParamFields) {
          for (const field of tool.pathParamFields) {
            const value = args[field]
            if (typeof value === 'string') {
              pathParams[field] = value
              delete bodyOrQueryArgs[field]
            }
          }
        }

        let url = `${REMLO_BASE}${tool.routePath}`
        if (tool.pathParamFields) {
          for (const field of tool.pathParamFields) {
            const value = pathParams[field]
            if (value) url += `/${encodeURIComponent(value)}`
          }
        }

        const result = await invokeRoute({
          handler: tool.handler,
          method: tool.method,
          url,
          args: bodyOrQueryArgs,
          pathParams,
          requestInfo: extra.requestInfo,
        })
        return toToolResult(result)
      },
    )
  }
}
