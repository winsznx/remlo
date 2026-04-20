import { queryPayrollSchedule, type PayrollSchedule } from '@/lib/agent/tools/query-payroll'
import { checkTreasuryBalance, type TreasuryStatus } from '@/lib/agent/tools/check-treasury'
import { evaluateYieldOpportunities, type YieldEvaluation } from '@/lib/agent/tools/evaluate-yield'
import { detectAnomalies, type AnomalyReport, type PayrollPlanItem } from '@/lib/agent/tools/flag-anomaly'
import { insertAgentDecision } from '@/lib/queries/agent-decisions'
import { CLAUDE_MODEL, extractTextContent, getAnthropicClient } from '@/lib/claude'

export interface PayrollPlan {
  payments: {
    employee_id: string
    amount: number
    chain: 'tempo' | 'solana'
    address: string
  }[]
  flagged: AnomalyReport['flagged_items']
  yield_recommendation: YieldEvaluation['recommended_allocation']
  total_amount: number
}

export interface AgentRunResult {
  decision_id: string | null
  plan: PayrollPlan
  reasoning: string
  confidence: number
  inputs: {
    schedule: PayrollSchedule
    treasury: TreasuryStatus
    yield: YieldEvaluation
    anomalies: AnomalyReport
  }
}

const SYSTEM_PROMPT = `You are Remlo's payroll agent. You make decisions about how to execute payroll for employers.
You have access to treasury balances, yield rates, compliance data, and anomaly detection.
For each payroll run, you must:
1. Decide which chain to use for each payment (Tempo or Solana) based on cost and speed
2. Decide whether to rebalance yield first based on current DeFi rates
3. Flag any anomalous payments and explain why
4. Provide a natural language summary of your decisions and reasoning

Always explain WHY you made each decision. Your reasoning is audited.`

export async function runPayrollAgent(employerId: string): Promise<AgentRunResult> {
  const [schedule, treasuryStatus, yieldEval] = await Promise.all([
    queryPayrollSchedule(employerId),
    checkTreasuryBalance(employerId),
    evaluateYieldOpportunities(),
  ])

  const planItems: PayrollPlanItem[] = schedule.due_employees.map((emp) => {
    const prefersSolana = emp.preferred_chain === 'solana' && emp.solana_wallet_address
    return {
      employee_id: emp.employee_id,
      amount: emp.salary_amount,
      chain: prefersSolana ? 'solana' as const : 'tempo' as const,
    }
  })

  const anomalies = await detectAnomalies(employerId, planItems)

  const payments = schedule.due_employees
    .filter((emp) => !anomalies.flagged_items.some(
      (f) => f.employee_id === emp.employee_id && f.severity === 'critical',
    ))
    .map((emp) => {
      const prefersSolana = emp.preferred_chain === 'solana' && emp.solana_wallet_address
      return {
        employee_id: emp.employee_id,
        amount: emp.salary_amount,
        chain: prefersSolana ? 'solana' as const : 'tempo' as const,
        address: prefersSolana ? emp.solana_wallet_address! : (emp.wallet_address ?? ''),
      }
    })

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  const inputs = { schedule, treasury: treasuryStatus, yield: yieldEval, anomalies }

  const anthropic = getAnthropicClient()
  let reasoning: string
  let confidence: number

  if (anthropic) {
    const result = await callClaude(inputs, payments)
    reasoning = result.reasoning
    confidence = result.confidence
  } else {
    const result = deterministicFallback(inputs, payments)
    reasoning = result.reasoning
    confidence = result.confidence
  }

  const plan: PayrollPlan = {
    payments,
    flagged: anomalies.flagged_items,
    yield_recommendation: yieldEval.recommended_allocation,
    total_amount: totalAmount,
  }

  const decision = await insertAgentDecision({
    employer_id: employerId,
    decision_type: 'payroll_execution',
    inputs: inputs as unknown as Record<string, unknown>,
    reasoning,
    decision: plan as unknown as Record<string, unknown>,
    confidence,
  })

  return {
    decision_id: decision?.id ?? null,
    plan,
    reasoning,
    confidence,
    inputs,
  }
}

async function callClaude(
  inputs: AgentRunResult['inputs'],
  payments: PayrollPlan['payments'],
): Promise<{ reasoning: string; confidence: number }> {
  const anthropic = getAnthropicClient()
  if (!anthropic) {
    return deterministicFallback(inputs, payments, 'no Anthropic API key')
  }

  const userMessage = JSON.stringify({
    schedule_summary: {
      due_count: inputs.schedule.due_employees.length,
      total_amount: inputs.schedule.total_amount,
    },
    treasury: {
      tempo_balance: inputs.treasury.tempo_balance,
      solana_balance: inputs.treasury.solana_balance,
      total_usd: inputs.treasury.total_usd,
    },
    yield_rates: inputs.yield.rates.map((r) => ({
      protocol: r.protocol,
      apy: r.apy_percent,
      source: r.source,
    })),
    anomalies: {
      flagged_count: inputs.anomalies.flagged_items.length,
      severity: inputs.anomalies.severity,
      items: inputs.anomalies.flagged_items.map((f) => ({
        employee_id: f.employee_id,
        reason: f.reason,
        severity: f.severity,
      })),
    },
    proposed_payments: {
      count: payments.length,
      by_chain: {
        tempo: payments.filter((p) => p.chain === 'tempo').length,
        solana: payments.filter((p) => p.chain === 'solana').length,
      },
    },
  })

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this payroll data and provide your decision with reasoning:\n\n${userMessage}\n\nRespond with JSON: { "reasoning": "...", "confidence": 0.0-1.0 }`,
        },
      ],
    })

    const text = extractTextContent(response.content)

    const jsonMatch = text.match(/\{[\s\S]*"reasoning"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { reasoning: string; confidence: number }
      return {
        reasoning: parsed.reasoning,
        confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.8)),
      }
    }

    return { reasoning: text.slice(0, 2000), confidence: 0.7 }
  } catch (err) {
    return deterministicFallback(
      inputs,
      payments,
      err instanceof Error ? err.message : 'unknown error',
    )
  }
}

function deterministicFallback(
  inputs: AgentRunResult['inputs'],
  payments: PayrollPlan['payments'],
  errorContext?: string,
): { reasoning: string; confidence: number } {
  const tempoCount = payments.filter((p) => p.chain === 'tempo').length
  const solanaCount = payments.filter((p) => p.chain === 'solana').length
  const total = payments.reduce((sum, p) => sum + p.amount, 0)

  let reasoning = `Payroll plan: ${payments.length} payments totaling $${total.toFixed(2)}. `
  reasoning += `Chain split: ${tempoCount} on Tempo, ${solanaCount} on Solana (based on employee preference). `

  if (inputs.anomalies?.flagged_items?.length > 0) {
    reasoning += `${inputs.anomalies.flagged_items.length} payment(s) flagged for review. `
  }

  if (inputs.treasury?.total_usd !== undefined) {
    reasoning += inputs.treasury.sufficient_for_next_payroll
      ? `Treasury has sufficient funds ($${inputs.treasury.total_usd.toFixed(2)}). `
      : `WARNING: Treasury shortfall of $${inputs.treasury.shortfall?.toFixed(2) ?? '?'}. `
  }

  if (errorContext) {
    reasoning += `[Deterministic fallback — LLM unavailable: ${errorContext}]`
  } else {
    reasoning += '[Deterministic fallback — no CLAUDE_API_KEY configured]'
  }

  return { reasoning, confidence: 0.6 }
}
