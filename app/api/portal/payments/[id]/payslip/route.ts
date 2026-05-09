import * as React from 'react'
import { NextRequest } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { getCallerEmployee } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { Payslip } from '@/pdf/Payslip'
import { TEMPO_EXPLORER_URL } from '@/lib/constants'
import { SOLANA_CLUSTER } from '@/lib/solana-constants'

/**
 * GET /api/portal/payments/[id]/payslip
 *
 * Streams a Payslip PDF for the authenticated employee. Authorization is
 * enforced two ways: (1) Privy bearer must resolve to an employee, and
 * (2) the requested payment_item must belong to that employee. Anything
 * else is a 404 — we don't leak existence of other employees' payments.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function GET(req: NextRequest, ctx: RouteContext) {
  const employee = await getCallerEmployee(req)
  if (!employee) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { id: paymentItemId } = await ctx.params
  const supabase = createServerClient()

  const { data: payment } = await supabase
    .from('payment_items')
    .select(
      `id, amount, memo_decoded, status, tx_hash, chain, solana_signature, payroll_run_id, created_at,
       payroll_run:payroll_runs(id, finalized_at, settlement_time_ms, block_number, chain)`,
    )
    .eq('id', paymentItemId)
    .eq('employee_id', employee.id)
    .maybeSingle()

  if (!payment) {
    return new Response(JSON.stringify({ error: 'Payment not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { data: employer } = await supabase
    .from('employers')
    .select('company_name, owner_user_id')
    .eq('id', employee.employer_id)
    .maybeSingle()

  // Settlement timestamp: prefer the payroll_run's finalized_at (when the
  // batch settled on-chain) over the payment_item's created_at (when the
  // row was inserted, before broadcast).
  const run = Array.isArray(payment.payroll_run)
    ? payment.payroll_run[0]
    : payment.payroll_run
  const settledAtIso = run?.finalized_at ?? payment.created_at

  // Pay period extraction from memo_decoded if present (memo encodes
  // YYYYMMDD-style strings). Fall back to settlement-month label.
  const memo = payment.memo_decoded as { payPeriod?: string } | null
  const periodFromMemo = memo?.payPeriod
  let payPeriodLabel: string
  if (periodFromMemo && periodFromMemo.length === 8) {
    const year = periodFromMemo.slice(0, 4)
    const month = Number.parseInt(periodFromMemo.slice(4, 6), 10) - 1
    payPeriodLabel = `${MONTHS[month] ?? ''} ${year}`.trim()
  } else {
    const d = new Date(settledAtIso)
    payPeriodLabel = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  }

  const chain = payment.chain ?? run?.chain ?? 'tempo'
  const solSig = payment.solana_signature
  const txHash = payment.tx_hash
  let explorerUrl: string | null = null
  if (chain === 'solana' && solSig) {
    explorerUrl = `https://explorer.solana.com/tx/${solSig}?cluster=${SOLANA_CLUSTER}`
  } else if (txHash) {
    explorerUrl = `${TEMPO_EXPLORER_URL}/tx/${txHash}`
  }

  // Fetch employer owner email via Privy if present (best-effort, can be null
  // for older rows). Skipping for now — keeps the doc tight.

  const fullName =
    [employee.first_name, employee.last_name].filter(Boolean).join(' ') ||
    employee.email ||
    'Employee'

  const pdfElement = React.createElement(Payslip, {
    payPeriodLabel,
    settledAtIso,
    amountUsd: Number(payment.amount),
    currency: 'USD',
    employer: {
      companyName: employer?.company_name ?? 'Your employer',
      ownerEmail: null,
    },
    employee: {
      fullName,
      email: employee.email ?? '',
      employeeId: employee.id,
      countryCode: employee.country_code ?? null,
    },
    description: 'Salary payment',
    payment: {
      chain,
      txHash: chain === 'solana' ? (solSig ?? null) : txHash,
      explorerUrl,
      settlementMs: run?.settlement_time_ms ?? null,
      blockNumber: run?.block_number ?? null,
    },
    payrollRunId: payment.payroll_run_id ?? '',
    paymentItemId: payment.id,
  })

  // Cast to the renderer's expected element type — the Payslip function
  // returns a JSX tree rooted at <Document/> but TS narrows the inferred
  // element type to plain ReactElement, which the renderer types reject.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(pdfElement as any)
  // The Node ReadableStream returned by @react-pdf is duck-compatible with
  // Web Streams but TS in this project sees them as different types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Response(stream as any, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="remlo-payslip-${payPeriodLabel.toLowerCase().replace(/\s+/g, '-')}.pdf"`,
      'cache-control': 'private, no-store',
    },
  })
}
