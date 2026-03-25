import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Remlo Payroll API',
    version: '1.0.0',
    description:
      'Enterprise payroll infrastructure as MPP-native API endpoints. AI agents trigger compliant batch payments, compliance screening, yield queries, and salary streaming via HTTP 402.',
    'x-guidance':
      'Remlo exposes payroll operations as pay-per-use HTTP 402 endpoints. Start by querying yield rates (GET /api/mpp/treasury/yield-rates, $0.01) to check treasury state. Use POST /api/mpp/agent/session/treasury ($0.02/action) for multi-action treasury management via session. Execute payroll via POST /api/mpp/payroll/execute ($1.00). All endpoints use PathUSD on Tempo L1. No API keys required beyond MPP payment credential.',
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
  paths: {
    '/api/mpp/treasury/yield-rates': {
      get: {
        summary: 'Get current treasury yield rates',
        description: 'Returns current APY and allocation breakdown for the Remlo treasury.',
        operationId: 'getTreasuryYieldRates',
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Optional token address filter (defaults to pathUSD)',
          },
        ],
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.01',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '1.00',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.50',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.05',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.001',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.02',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.01',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.05',
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
        description: 'Converts PathUSD balance to fiat and initiates a bank transfer via the Bridge protocol.',
        operationId: 'bridgeOfframp',
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.25',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.10',
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
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.50',
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
    '/api/mpp/agent/session/treasury': {
      post: {
        summary: 'Multi-action treasury session',
        description: 'Perform treasury management actions (balance, yield, rebalance, headcount) in a single session. Designed for AI agent workflows requiring multiple treasury reads/writes.',
        operationId: 'agentSessionTreasury',
        'x-payment-info': {
          protocols: ['mpp'],
          pricingMode: 'fixed',
          price: '0.02',
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
