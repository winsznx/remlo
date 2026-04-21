import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Remlo Payroll API',
    version: '1.0.0',
    description:
      'Enterprise payroll infrastructure as MPP-native API endpoints. AI agents trigger compliant batch payments, compliance screening, yield queries, and salary streaming via HTTP 402.',
    'x-guidance':
      'Remlo exposes payroll operations as pay-per-use HTTP 402 endpoints. Start by querying yield rates (GET /api/mpp/treasury/yield-rates, $0.01) to check treasury state. Use POST /api/mpp/agent/session/treasury ($0.02/action) for multi-action treasury management. Execute payroll via POST /api/mpp/payroll/execute ($1.00). All endpoints use USDC.e (Stargate USDC, 0x20C000000000000000000000b9537d11c60E8b50) on Tempo mainnet (chainId 4217). No API keys required beyond MPP payment credential. Remlo produces on-chain reputation as a byproduct of payment work: settled Solana payments write SAS attestations, and completed Tempo payroll + escrow participation write ERC-8004 feedback. See GET /api/reputation/{address} (free, no auth) to query reputation for any subject.',
  },
  'x-discovery': {
    ownershipProofs: [
      {
        type: 'dns',
        value: 'remlo.xyz',
      },
    ],
  },
  servers: [{ url: 'https://remlo.xyz' }],
  tags: [
    { name: 'Treasury', description: 'Yield rates, optimization, and treasury management' },
    { name: 'Payroll', description: 'Payroll execution and payslip retrieval' },
    { name: 'Employee', description: 'Employee salary streams, advances, and history' },
    { name: 'Compliance', description: 'Wallet compliance screening and cleared-list queries' },
    { name: 'Agent', description: 'AI agent workflows — multi-action treasury and memo decoding' },
    { name: 'Bridge', description: 'Fiat off-ramp via Bridge protocol' },
    { name: 'Reputation', description: 'Cross-chain reputation aggregation (SAS on Solana + ERC-8004 on Tempo)' },
    { name: 'Streams', description: 'Solana payroll streaming (Ship 4 stub; real Streamflow integration in Ship 5)' },
  ],
  paths: {
    '/api/x402/streams': {
      post: {
        tags: ['Streams'],
        summary: 'Create a Solana payroll stream ($0.05, stub)',
        operationId: 'createX402Stream',
        'x-guidance':
          "Ship 4 STUB — returns a mock SolanaStreamHandle with provider='streamflow'. The handle shape is the permanent contract; production implementation in Ship 5 will wire this through the Streamflow Protocol SDK (@streamflow/stream) on Solana devnet + mainnet with no breaking changes to callers. Alternative under evaluation: a native Anchor program for cross-chain parity with Tempo StreamVesting.sol. x402 gating is real now ($0.05 USDC.e) to let us validate demand before committing to the full build.",
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.050000' },
          protocols: [{ x402: {} }],
          authMode: 'x402',
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recipientAddress', 'amountUsdc', 'durationSeconds', 'cancelAuthority'],
                properties: {
                  recipientAddress: { type: 'string', description: 'Solana base58 pubkey' },
                  amountUsdc: { type: 'number', description: 'Total USDC to stream' },
                  durationSeconds: { type: 'number', description: 'Stream window in seconds' },
                  cliffSeconds: { type: 'number', description: 'Optional cliff before any funds vest' },
                  cancelAuthority: {
                    type: 'string',
                    enum: ['sender', 'recipient', 'both'],
                    description: 'Who can cancel the stream early',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Mock SolanaStreamHandle with stub=true flag',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    streamId: { type: 'string' },
                    provider: { type: 'string', enum: ['streamflow', 'native'] },
                    startedAt: { type: 'integer', description: 'Unix seconds' },
                    estimatedEndAt: { type: 'integer', description: 'Unix seconds' },
                    claimedUsdc: { type: 'number' },
                    remainingUsdc: { type: 'number' },
                    stub: { type: 'boolean' },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error on request body' },
          '402': { description: 'Payment Required' },
          '503': { description: 'Solana agent wallet not configured on server' },
        },
      },
    },
    '/api/reputation/{address}': {
      get: {
        tags: ['Reputation'],
        summary: 'Read cross-chain reputation for any subject (free, no auth)',
        operationId: 'getReputation',
        security: [],
        'x-guidance':
          "Read-only reputation aggregator. Queries SAS attestations on Solana and ERC-8004 Reputation Registry feedback on Tempo for a given subject. No payment required — reputation data is public by design. Accepts either a Solana base58 pubkey (44 chars) or a numeric ERC-8004 Tempo agent ID. Returns unified summary (totalPayments, totalValueMoved, agentFeedbackScore, workerAttestationCount) plus per-chain detail. For write-side reputation, see /api/mpp/* endpoints — every settled payment or escrow automatically writes a reputation artifact.",
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Solana base58 pubkey OR numeric ERC-8004 agent ID',
          },
        ],
        responses: {
          '200': {
            description: 'Reputation summary for the subject',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    subject: {
                      type: 'object',
                      properties: {
                        solana: { type: 'string' },
                        tempo_agent_id: { type: 'string' },
                      },
                    },
                    solana: { type: 'object', nullable: true },
                    tempo: { type: 'object', nullable: true },
                    unified: {
                      type: 'object',
                      properties: {
                        totalPayments: { type: 'integer' },
                        totalValueMovedBaseUnits: { type: 'string' },
                        agentFeedbackScore: { type: 'number', nullable: true },
                        agentFeedbackCount: { type: 'integer' },
                        workerAttestationCount: { type: 'integer' },
                        firstActivityAt: { type: 'string', format: 'date-time', nullable: true },
                        latestActivityAt: { type: 'string', format: 'date-time', nullable: true },
                      },
                    },
                    last_updated: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Address must be Solana base58 or numeric agent ID' },
        },
      },
    },
    '/api/mpp/treasury/yield-rates': {
      get: {
        summary: 'Get current treasury yield rates',
        description: 'Returns current APY and allocation breakdown for the Remlo treasury.',
        operationId: 'getTreasuryYieldRates',
        tags: ['Treasury'],
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Optional token address filter (defaults to pathUSD)',
          },
        ],
requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'No body — use the `token` query parameter to filter.',
                properties: {
                  token: { type: 'string', description: 'Optional token address' },
                },
              },
            },
          },
        },
                'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.010000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        responses: {
          '200': {
            description: 'Current yield rates and allocation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    apy_bps: { type: 'number', description: 'APY in basis points' },
                    apy_percent: { type: 'number', description: 'APY as percentage' },
                    sources: { type: 'array', items: { type: 'string' } },
                    allocation: { type: 'array', items: { type: 'number' } },
                    timestamp: { type: 'number' },
                  },
                  required: ['apy_bps', 'apy_percent', 'sources', 'allocation', 'timestamp'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/payroll/execute': {
      post: {
        summary: 'Execute a payroll run on-chain',
        description: 'Triggers batch payroll execution for a prepared payroll run. Agent wallet signs the on-chain transaction.',
        operationId: 'executePayroll',
        tags: ['Payroll'],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '1.000000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  payrollRunId: { type: 'string', description: 'UUID of the payroll run to execute' },
                },
                required: ['payrollRunId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Payroll executed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    tx_hash: { type: 'string' },
                    payroll_run_id: { type: 'string' },
                    recipient_count: { type: 'number' },
                    employer_admin_wallet: { type: 'string' },
                    employer_account_id: { type: 'string' },
                  },
                  required: ['success', 'tx_hash', 'payroll_run_id', 'recipient_count'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/employee/advance': {
      post: {
        summary: 'Claim accrued salary advance',
        description: 'Allows an employee to claim their currently accrued salary stream balance as an on-demand advance.',
        operationId: 'claimSalaryAdvance',
        tags: ['Employee'],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.500000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  employeeAddress: { type: 'string', description: '0x-prefixed EVM wallet address of the employee' },
                },
                required: ['employeeAddress'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Advance claimed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    employee_address: { type: 'string' },
                    tx_hash: { type: 'string' },
                    claimed_at: { type: 'string', format: 'date-time' },
                  },
                  required: ['success', 'employee_address', 'tx_hash', 'claimed_at'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/compliance/check': {
      post: {
        summary: 'Run compliance screening on a wallet',
        description: 'Screens a wallet address against configured compliance policies (OFAC, custom blocklists).',
        operationId: 'checkCompliance',
        tags: ['Compliance'],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.050000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  walletAddress: { type: 'string', description: '0x-prefixed EVM wallet address to screen' },
                  policyId: { type: 'number', description: 'Optional policy ID (defaults to global policy)' },
                  employerId: { type: 'string', description: 'Optional employer UUID for employer-scoped policies' },
                },
                required: ['walletAddress'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Compliance check result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    wallet_address: { type: 'string' },
                    policy_id: { type: 'number' },
                    authorized: { type: 'boolean' },
                    risk_score: { type: 'number' },
                    result: { type: 'string', enum: ['CLEAR', 'BLOCKED'] },
                    checked_at: { type: 'string', format: 'date-time' },
                  },
                  required: ['wallet_address', 'policy_id', 'authorized', 'risk_score', 'result', 'checked_at'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/employee/balance/stream': {
      get: {
        summary: 'Stream real-time accruing salary balance',
        description: 'Server-Sent Events stream of an employee\'s real-time accruing salary balance, ticking every second.',
        operationId: 'streamEmployeeBalance',
        tags: ['Employee'],
requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'No body — use `employeeId` and `streamId` query parameters.',
                properties: {
                  employeeId: { type: 'string', description: 'Employee UUID' },
                  streamId: { type: 'string', description: 'Stream contract ID' },
                },
              },
            },
          },
        },
                'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.001000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        parameters: [
          {
            name: 'employeeId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Employee UUID',
          },
          {
            name: 'address',
            in: 'query',
            schema: { type: 'string' },
            description: '0x-prefixed EVM wallet address (legacy fallback)',
          },
        ],
        responses: {
          '200': {
            description: 'SSE stream of balance ticks',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'object',
                  description: 'One JSON object per tick',
                  properties: {
                    tick: { type: 'number' },
                    employeeId: { type: 'string', nullable: true },
                    address: { type: 'string', nullable: true },
                    balance: { type: 'string' },
                    balanceUsd: { type: 'string' },
                    accrued_raw: { type: 'string' },
                    accrued_usd: { type: 'string' },
                    salary_per_second_usd: { type: 'string' },
                    timestamp: { type: 'number' },
                  },
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/payslips/{runId}/{employeeId}': {
      get: {
        summary: 'Fetch a specific payslip',
        description: 'Retrieves the payslip for an employee in a specific payroll run.',
        operationId: 'getPayslip',
        tags: ['Payroll'],
requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'No body — runId and employeeId come from the URL path.',
                properties: {
                  runId: { type: 'string', description: 'Payroll run UUID (path)' },
                  employeeId: { type: 'string', description: 'Employee UUID (path)' },
                },
              },
            },
          },
        },
                'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.020000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        parameters: [
          {
            name: 'runId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Payroll run UUID',
          },
          {
            name: 'employeeId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Employee UUID',
          },
        ],
        responses: {
          '200': {
            description: 'Payslip data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payslip: {
                      type: 'object',
                      properties: {
                        run_id: { type: 'string' },
                        employee_id: { type: 'string' },
                        amount_usd: { type: 'number' },
                        status: { type: 'string' },
                        tx_hash: { type: 'string', nullable: true },
                        memo: { type: 'object', nullable: true },
                        finalized_at: { type: 'string', format: 'date-time', nullable: true },
                        block_number: { type: 'number', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                  required: ['payslip'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/memo/decode': {
      post: {
        summary: 'Decode a 32-byte payroll memo',
        description: 'Decodes a 0x-prefixed 32-byte hex memo into structured payroll fields.',
        operationId: 'decodeMemo',
        tags: ['Agent'],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.010000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  memo: {
                    type: 'string',
                    pattern: '^0x[0-9a-fA-F]{64}$',
                    description: '0x-prefixed 32-byte hex memo (66 chars total)',
                  },
                },
                required: ['memo'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Decoded memo fields',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    memo: { type: 'string' },
                    fields: { type: 'object', nullable: true },
                  },
                  required: ['memo'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/employee/{id}/history': {
      get: {
        summary: 'Get employee payment history',
        description: 'Returns paginated payment history for an employee.',
        operationId: 'getEmployeeHistory',
        tags: ['Employee'],
requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'No body — `id` is a path parameter; `limit` and `cursor` are query parameters.',
                properties: {
                  id: { type: 'string', description: 'Employee UUID (path)' },
                  limit: { type: 'integer', description: 'Optional page size' },
                  cursor: { type: 'string', description: 'Optional pagination cursor' },
                },
              },
            },
          },
        },
                'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.050000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Employee UUID',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 50, maximum: 100 },
            description: 'Number of records to return (max 100)',
          },
        ],
        responses: {
          '200': {
            description: 'Employee payment history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    employee_id: { type: 'string' },
                    payments: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          amount_usd: { type: 'number' },
                          status: { type: 'string' },
                          tx_hash: { type: 'string', nullable: true },
                          memo: { type: 'object', nullable: true },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    count: { type: 'number' },
                  },
                  required: ['employee_id', 'payments', 'count'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/bridge/offramp': {
      post: {
        summary: 'Initiate fiat off-ramp transfer',
        description: 'Converts USDC.e balance to fiat and initiates a bank transfer via the Bridge protocol.',
        operationId: 'bridgeOfframp',
        tags: ['Bridge'],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.250000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  employeeId: { type: 'string', description: 'Employee UUID' },
                  amount: { type: 'string', description: 'USD amount to off-ramp (e.g. "100.00")' },
                  destinationType: {
                    type: 'string',
                    enum: ['ach', 'sepa', 'spei', 'pix'],
                    description: 'Bank transfer rail',
                  },
                  bankAccountId: { type: 'string', description: 'Bridge-registered bank account ID' },
                },
                required: ['employeeId', 'amount', 'destinationType', 'bankAccountId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Off-ramp transfer initiated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    transfer_id: { type: 'string' },
                    status: { type: 'string' },
                    amount: { type: 'string' },
                    destination_type: { type: 'string', enum: ['ach', 'sepa', 'spei', 'pix'] },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                  required: ['success', 'transfer_id', 'status', 'amount', 'destination_type', 'created_at'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/treasury/optimize': {
      post: {
        summary: 'Get AI-powered treasury optimization recommendations',
        description: 'Analyzes current treasury state and returns rebalancing recommendations to maximize yield.',
        operationId: 'optimizeTreasury',
        tags: ['Treasury'],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.100000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  employerId: { type: 'string', description: 'Employer UUID' },
                  question: { type: 'string', description: 'Optional natural-language question about the treasury' },
                },
                required: ['employerId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Treasury optimization analysis',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    employerId: { type: 'string' },
                    employerAdminWallet: { type: 'string' },
                    employerAccountId: { type: 'string' },
                    question: { type: 'string', nullable: true },
                    summary: {
                      type: 'object',
                      properties: {
                        available_usd: { type: 'string' },
                        locked_usd: { type: 'string' },
                        total_usd: { type: 'string' },
                        current_apy_percent: { type: 'number' },
                        accrued_yield_usd: { type: 'string' },
                      },
                    },
                    suggestion: { type: 'string' },
                    recommendations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          text: { type: 'string' },
                          impact: { type: 'string', enum: ['high', 'medium'] },
                        },
                      },
                    },
                    current_allocation: { type: 'array', items: { type: 'number' } },
                    recommended_allocation: { type: 'array', items: { type: 'number' } },
                    projected_annual_yield_usd: { type: 'string' },
                    analyzedAt: { type: 'string', format: 'date-time' },
                  },
                  required: ['employerId', 'summary', 'suggestion', 'recommendations', 'analyzedAt'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/marketplace/compliance-list/{employerId}': {
      get: {
        summary: 'Fetch employer compliance-cleared wallet list',
        description: 'Returns the list of compliance-cleared wallet addresses for an employer, suitable for marketplace use.',
        operationId: 'getComplianceList',
        tags: ['Compliance'],
requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'No body — employerId is a path parameter.',
                properties: {
                  employerId: { type: 'string', description: 'Employer UUID (path)' },
                },
              },
            },
          },
        },
                'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.500000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        parameters: [
          {
            name: 'employerId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Employer UUID',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'number', default: 100, maximum: 500 },
            description: 'Maximum number of wallet entries to return',
          },
        ],
        responses: {
          '200': {
            description: 'Compliance-cleared wallet list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    providerId: { type: 'string' },
                    clearedWallets: { type: 'number' },
                    list: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          walletAddress: { type: 'string' },
                          checkedAt: { type: 'string', format: 'date-time' },
                          employeeId: { type: 'string', nullable: true },
                          eventType: { type: 'string' },
                        },
                      },
                    },
                    lastUpdated: { type: 'string', format: 'date-time', nullable: true },
                  },
                  required: ['providerId', 'clearedWallets', 'list'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/mpp/escrow/post': {
      post: {
        summary: 'Post an agent-to-agent escrow with Claude-judge settlement',
        description: 'Creates a three-party escrow: requester locks USDC, worker submits a deliverable, Claude judge decides against rubric_prompt. Funds custodied on-chain by the remlo_escrow Anchor program PDA — not by Remlo. Settlement and refund are permissionless after the verdict is posted. Max 100 USDC per escrow, 1h-7d expiry, max 2000-char rubric.',
        operationId: 'escrowPost',
        tags: ['Agent'],
        parameters: [
          {
            name: 'X-Agent-Identifier',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Pre-registered agent identity authorized for this employer.',
          },
        ],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.100000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        'x-guidance': 'Post an escrow that will be auto-validated by a Claude judge against your rubric_prompt. Approved verdicts release funds to worker_wallet_address via a permissionless Solana instruction; rejected verdicts or expiry refund to the employer. Funds custodied during the escrow period by the remlo_escrow Anchor program at 2CY3JQfkXpyTT8QBiHfKnashxGJ37ctDvqcgi7ggWiAA (Solana devnet). Settled escrows write a SAS reputation attestation (remlo-escrow-settled) to the worker subject; rejected or expired refunds write remlo-escrow-refunded to the requester. Both attestations are written asynchronously by /api/cron/process-reputation-writes. Expiry duration is reputation-scaled: unknown workers (no SAS attestations) receive the full requested duration; trusted workers with 20+ attestations receive a shorter expiry floor. Check the response applied_expiry_hours and worker_reputation_tier fields to see the duration actually used.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  employer_id: { type: 'string', description: 'Remlo employer UUID' },
                  worker_wallet_address: { type: 'string', description: 'Solana address of the worker who will receive funds on approved verdict' },
                  worker_agent_identifier: { type: 'string', description: 'Agent identity of the worker — must match X-Agent-Identifier when they call /deliver' },
                  amount_usdc: { type: 'string', description: 'USDC amount as decimal string (e.g. "10.00"), max 100.00' },
                  rubric_prompt: { type: 'string', description: 'Validation criteria for Claude to evaluate the deliverable against. Max 2000 chars.' },
                  expiry_hours: { type: 'number', description: 'Hours until escrow auto-refunds if no verdict. Default 24, max 168 (7 days).' },
                },
                required: ['employer_id', 'worker_wallet_address', 'worker_agent_identifier', 'amount_usdc', 'rubric_prompt'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Escrow created on-chain',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    escrow_id: { type: 'string' },
                    escrow_pda: { type: 'string' },
                    status: { type: 'string', enum: ['posted'] },
                    expires_at: { type: 'string', format: 'date-time' },
                    initialize_signature: { type: 'string' },
                    solana_explorer_urls: { type: 'object' },
                    applied_expiry_hours: { type: 'number', description: 'Hours actually applied (reputation-scaled from requested).' },
                    requested_expiry_hours: { type: 'number', description: 'Hours the caller requested.' },
                    worker_reputation_tier: { type: 'string', enum: ['unknown', 'new', 'established', 'trusted'], description: 'Worker SAS reputation tier at escrow-post time.' },
                    worker_attestation_count: { type: 'number', description: 'Number of prior SAS attestations driving the tier.' },
                  },
                },
              },
            },
          },
          '401': { description: 'Missing X-Agent-Identifier header' },
          '402': { description: 'Payment Required' },
          '403': { description: 'Agent not authorized for this employer, or amount over per-tx cap' },
        },
      },
    },
    '/api/mpp/escrow/deliver': {
      post: {
        summary: 'Submit a deliverable URI for an escrow',
        description: 'The submitting agent must match worker_agent_identifier recorded at post time. Validation and settlement broadcast asynchronously — poll /status for the final verdict.',
        operationId: 'escrowDeliver',
        tags: ['Agent'],
        parameters: [
          {
            name: 'X-Agent-Identifier',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Must equal worker_agent_identifier of the target escrow.',
          },
        ],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.020000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        'x-guidance': 'Submit a deliverable URI. Remlo fetches the content (10s timeout, 100KB max), computes SHA-256, records the hash on-chain, and invokes the Claude judge against the rubric. Settlement or refund broadcasts automatically within ~30s of validator decision. The caller polls /api/mpp/escrow/{id}/status to observe the final state.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  escrow_id: { type: 'string' },
                  deliverable_uri: { type: 'string', description: 'HTTPS URL, IPFS link, or inline data: URI' },
                },
                required: ['escrow_id', 'deliverable_uri'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Deliverable submitted; validation running async' },
          '401': { description: 'Missing X-Agent-Identifier' },
          '402': { description: 'Payment Required' },
          '403': { description: 'Submitting agent does not match worker_agent_identifier, or escrow expired' },
          '404': { description: 'Escrow not found' },
        },
      },
    },
    '/api/mpp/escrow/deliver-signed': {
      post: {
        summary: 'Submit a worker-signed deliverable (external-key agents)',
        description: 'For worker agents that manage their own Solana keys instead of delegating to Remlo Privy. Client signs the submit_deliverable instruction offline; Remlo verifies signature + uri_hash match, then broadcasts and runs validator+settle.',
        operationId: 'escrowDeliverSigned',
        tags: ['Agent'],
        parameters: [
          {
            name: 'X-Agent-Identifier',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Must equal worker_agent_identifier of the target escrow.',
          },
        ],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.020000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        'x-guidance': 'Build a submit_deliverable instruction via lib/escrow-client.ts::buildSubmitDeliverableInstruction, wrap in a Transaction, sign client-side with the worker keypair, base64-encode the serialized tx, submit here. The uri_hash in the signed instruction must match sha256(deliverable_uri) exactly — the server verifies this before broadcasting. Fee payer on the signed tx MUST be the worker pubkey.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  escrow_id: { type: 'string' },
                  deliverable_uri: { type: 'string', description: 'HTTPS URL, IPFS link, or inline data: URI' },
                  signed_transaction: { type: 'string', description: 'Base64-encoded fully-signed Solana Transaction' },
                },
                required: ['escrow_id', 'deliverable_uri', 'signed_transaction'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Worker-signed deliverable broadcast; validation running async' },
          '400': { description: 'Invalid tx, uri_hash mismatch, or missing fields' },
          '401': { description: 'Missing X-Agent-Identifier' },
          '402': { description: 'Payment Required' },
          '403': { description: 'Fee payer mismatch, agent mismatch, or escrow expired' },
          '404': { description: 'Escrow not found' },
          '502': { description: 'Broadcast or confirmation failed' },
        },
      },
    },
    '/api/mpp/escrow/{id}/status': {
      get: {
        summary: 'Read escrow lifecycle status',
        description: 'Public read access to any x402-paying caller. Returns public-facing fields only — no validator model, no internal hashes, no employer scope.',
        operationId: 'escrowStatus',
        tags: ['Agent'],
requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'No body — escrow id is a path parameter.',
                properties: {
                  id: { type: 'string', description: 'Escrow UUID (path)' },
                },
              },
            },
          },
        },
                'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.010000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        'x-guidance': 'Check escrow state and any on-chain signatures. No X-Agent-Identifier required — this is a public read path for any caller observing the escrow.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Escrow UUID' },
        ],
        responses: {
          '200': {
            description: 'Current escrow state',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    escrow_id: { type: 'string' },
                    status: { type: 'string', enum: ['posted', 'delivered', 'validating', 'settled', 'rejected_refunded', 'expired_refunded'] },
                    amount_usdc: { type: 'string' },
                    worker_wallet_address: { type: 'string' },
                    rubric_prompt: { type: 'string' },
                    deliverable_uri: { type: 'string', nullable: true },
                    validator_verdict: { type: 'string', enum: ['approved', 'rejected'], nullable: true },
                    validator_confidence: { type: 'integer', nullable: true },
                    validator_reasoning: { type: 'string', nullable: true },
                    expires_at: { type: 'string', format: 'date-time' },
                    signatures: { type: 'object' },
                    solana_explorer_urls: { type: 'object' },
                  },
                },
              },
            },
          },
          '402': { description: 'Payment Required' },
          '404': { description: 'Escrow not found' },
        },
      },
    },
    '/api/mpp/agent/pay': {
      post: {
        summary: 'Agent-to-agent direct payment',
        description: 'Sends USDC from a Remlo employer treasury to a recipient wallet. Designed for autonomous agents paying other autonomous agents: pay $0.05 via x402, specify recipient and amount, receive on-chain tx hash. The caller must identify itself via the X-Agent-Identifier header; that identifier must be pre-registered by the employer at /dashboard/settings/agents with per-transaction and per-day spend caps. Calls that exceed caps or use an unregistered identifier are rejected with 403 (AGENT_NOT_AUTHORIZED, PER_TX_CAP_EXCEEDED, PER_DAY_CAP_EXCEEDED) — the $0.05 x402 fee is still charged. Successful calls write ERC-8004 Reputation Registry feedback to the Remlo Payroll Agent on-chain identity; the reputation record is publicly queryable at /api/reputation/{agentId}.',
        operationId: 'agentPay',
        tags: ['Agent'],
        parameters: [
          {
            name: 'X-Agent-Identifier',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Pre-registered agent identity (EVM address, AgentCard URI, or opaque token). Must match an active employer_agent_authorizations row for the employer.',
          },
        ],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.050000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  employer_id: { type: 'string', description: 'Remlo employer UUID whose treasury funds the transfer' },
                  recipient_wallet: { type: 'string', description: '0x-prefixed EVM address of the recipient agent or human' },
                  amount: { type: 'string', description: 'USDC amount as decimal string (e.g. "12.50")' },
                  reference: { type: 'string', description: 'Optional free-text reference for audit trail', nullable: true },
                },
                required: ['employer_id', 'recipient_wallet', 'amount'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Payment broadcast on-chain',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    tx_hash: { type: 'string' },
                    recipient: { type: 'string' },
                    amount: { type: 'string' },
                    employer_id: { type: 'string' },
                    employer_account_id: { type: 'string' },
                    reference: { type: 'string', nullable: true },
                    explorer_url: { type: 'string' },
                    memo: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                  required: ['success', 'tx_hash', 'recipient', 'amount', 'explorer_url'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': { schema: { type: 'string' }, description: 'MPP payment challenge' },
            },
          },
          '422': {
            description: 'Insufficient treasury balance',
          },
        },
      },
    },
    '/api/mpp/agent/session/treasury': {
      post: {
        summary: 'Multi-action treasury management',
        description: 'Perform treasury management actions (balance, yield, rebalance, headcount) per call. Designed for AI agent workflows requiring treasury reads/writes.',
        operationId: 'agentSessionTreasury',
        tags: ['Agent'],
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.020000' },
          protocols: [{ x402: {} }, { mpp: { method: '', intent: '', currency: '' } }],
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['balance', 'yield', 'rebalance', 'headcount'],
                    description: 'Treasury action to perform',
                  },
                  employerId: { type: 'string', description: 'Employer UUID' },
                  allocation: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'Target allocation percentages (for rebalance action)',
                  },
                  params: {
                    type: 'object',
                    properties: {
                      targetAllocation: { type: 'array', items: { type: 'number' } },
                    },
                    description: 'Additional action parameters',
                  },
                },
                required: ['action', 'employerId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Action result (shape depends on action)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['balance', 'yield', 'rebalance', 'headcount'] },
                    result: {
                      type: 'object',
                      description: 'Action-specific result payload',
                    },
                    timestamp: { type: 'number' },
                  },
                  required: ['action', 'result', 'timestamp'],
                },
              },
            },
          },
          '402': {
            description: 'Payment Required',
            headers: {
              'WWW-Authenticate': {
                schema: { type: 'string' },
                description: 'MPP payment challenge',
              },
            },
          },
        },
      },
    },
    '/api/x402/payroll/execute': {
      post: {
        summary: 'Execute an agent-planned payroll decision on-chain',
        description: 'Authenticated via Privy JWT (identity-only, zero-dollar auth). Broadcasts any Tempo payments via REMLO_AGENT_PRIVATE_KEY (legacy transitional path) and any Solana payments via a Privy server wallet with policy enforcement. Mixed-chain decisions return both tempo_tx_hash and solana_signatures. Per-item policy rejections are surfaced in solana_policy_rejections without failing the entire run — the affected payment_items rows are marked status=policy_rejected with the rejection reason.',
        operationId: 'x402ExecutePayroll',
        tags: ['Agent'],
        'x-guidance': 'Solana broadcasts are policy-gated through Privy server wallets. Transactions whose amounts exceed the per-tx cap or whose instructions target non-whitelisted programs return a 200 with payment_items[].status = \'policy_rejected\' rather than failing the entire run. Check solana_policy_rejections in the response.',
        'x-payment-info': {
          price: { mode: 'fixed', currency: 'USD', amount: '0.000000' },
          protocols: [{ x402: {} }],
          authMode: 'identity',
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  employer_id: { type: 'string', description: 'Employer UUID' },
                  decision_id: { type: 'string', description: 'agent_decisions row UUID to execute' },
                },
                required: ['employer_id', 'decision_id'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Decision executed (partial or full). Check error fields + policy_rejections to see what actually broadcast.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payroll_run_id: { type: 'string' },
                    decision_id: { type: 'string' },
                    tempo_tx_hash: { type: 'string', nullable: true },
                    tempo_broadcast_error: { type: 'string', nullable: true },
                    tempo_explorer_url: { type: 'string', nullable: true },
                    solana_signatures: { type: 'array', items: { type: 'string' } },
                    solana_broadcast_error: { type: 'string', nullable: true },
                    solana_policy_rejections: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          employee_id: { type: 'string' },
                          reason: { type: 'string', description: 'Privy policy rejection reason' },
                        },
                      },
                    },
                    solana_explorer_urls: { type: 'array', items: { type: 'string' } },
                    total_amount: { type: 'number' },
                    employee_count: { type: 'integer' },
                  },
                  required: ['payroll_run_id', 'decision_id', 'solana_signatures'],
                },
              },
            },
          },
        },
      },
    },
  },
} as const

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
