import { evaluateYieldOpportunities, type YieldEvaluation } from '@/lib/agent/tools/evaluate-yield'
import { checkTreasuryBalance, type TreasuryStatus } from '@/lib/agent/tools/check-treasury'
import { insertAgentDecision } from '@/lib/queries/agent-decisions'
import { CLAUDE_MODEL, extractTextContent, getAnthropicClient } from '@/lib/claude'

export interface YieldDecision {
  decision_id: string | null
  allocation: { protocol: string; percent: number; estimated_monthly_usd: number }[]
  reasoning: string
  confidence: number
  inputs: {
    yield: YieldEvaluation
    treasury: TreasuryStatus
  }
}

const SYSTEM_PROMPT = `You are Remlo's yield allocation agent. You decide how to allocate idle treasury USDC across Solana DeFi protocols (Kamino, Drift, Lulo) to maximize risk-adjusted returns.

Consider:
- APY rates (higher is better, but verify source reliability)
- TVL (higher = lower risk of liquidity issues)
- Diversification (don't put everything in one protocol)
- Treasury size (smaller treasuries should be more conservative)

Respond with JSON: {
  "allocation": [{"protocol": "...", "percent": N}],
  "reasoning": "...",
  "confidence": 0.0-1.0
}`

export async function runYieldAgent(employerId: string): Promise<YieldDecision> {
  const [yieldEval, treasury] = await Promise.all([
    evaluateYieldOpportunities(),
    checkTreasuryBalance(employerId),
  ])

  const inputs = { yield: yieldEval, treasury }
  const idleFunds = treasury.total_usd

  const anthropic = getAnthropicClient()

  let reasoning: string
  let confidence: number
  let allocation: { protocol: string; percent: number }[]

  if (anthropic) {
    const result = await callClaude(inputs)
    reasoning = result.reasoning
    confidence = result.confidence
    allocation = result.allocation
  } else {
    const result = deterministicFallback(inputs)
    reasoning = result.reasoning
    confidence = result.confidence
    allocation = result.allocation
  }

  const allocationWithEstimates = allocation.map((a) => {
    const rate = yieldEval.rates.find((r) => r.protocol === a.protocol)
    const apyPercent = rate?.apy_percent ?? 0
    const allocated = idleFunds * (a.percent / 100)
    const monthlyYield = (allocated * apyPercent) / 100 / 12
    return { ...a, estimated_monthly_usd: Math.round(monthlyYield * 100) / 100 }
  })

  const decision = await insertAgentDecision({
    employer_id: employerId,
    decision_type: 'yield_allocation',
    inputs: inputs as unknown as Record<string, unknown>,
    reasoning,
    decision: { allocation: allocationWithEstimates } as unknown as Record<string, unknown>,
    confidence,
  })

  return {
    decision_id: decision?.id ?? null,
    allocation: allocationWithEstimates,
    reasoning,
    confidence,
    inputs,
  }
}

async function callClaude(
  inputs: YieldDecision['inputs'],
): Promise<{ reasoning: string; confidence: number; allocation: { protocol: string; percent: number }[] }> {
  const anthropic = getAnthropicClient()
  if (!anthropic) return deterministicFallback(inputs)

  const userMessage = JSON.stringify({
    treasury_balance_usd: inputs.treasury.total_usd,
    tempo_balance: inputs.treasury.tempo_balance,
    solana_balance: inputs.treasury.solana_balance,
    yield_rates: inputs.yield.rates.map((r) => ({
      protocol: r.protocol,
      apy_percent: r.apy_percent,
      tvl_usd: r.tvl_usd,
      source: r.source,
      available: r.available,
    })),
  })

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze these yield opportunities and treasury state. Decide allocation.\n\n${userMessage}`,
        },
      ],
    })

    const text = extractTextContent(response.content)

    const jsonMatch = text.match(/\{[\s\S]*"allocation"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        allocation: { protocol: string; percent: number }[]
        reasoning: string
        confidence: number
      }
      return {
        allocation: parsed.allocation,
        reasoning: parsed.reasoning,
        confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.8)),
      }
    }

    return { ...deterministicFallback(inputs), reasoning: text.slice(0, 2000) }
  } catch {
    return deterministicFallback(inputs)
  }
}

function deterministicFallback(
  inputs: YieldDecision['inputs'],
): { reasoning: string; confidence: number; allocation: { protocol: string; percent: number }[] } {
  const available = inputs.yield.rates.filter((r) => r.available && r.apy_percent > 0)
  const allocation = available.map((r, i) => ({
    protocol: r.protocol,
    percent: i === 0 ? 60 : i === 1 ? 30 : 10,
  }))

  const top = available[0]
  const idleFunds = inputs.treasury.total_usd

  let reasoning = ''
  if (top) {
    const monthlyEst = (idleFunds * top.apy_percent) / 100 / 12
    reasoning = `${top.protocol} is currently offering ${top.apy_percent}% APY`
    if (top.tvl_usd) reasoning += ` with $${(top.tvl_usd / 1e6).toFixed(0)}M TVL`
    reasoning += `, making it the lowest-risk option. `

    if (available.length > 1) {
      reasoning += `${available[1].protocol} offers ${available[1].apy_percent}% but has lower TVL. `
    }

    reasoning += `Recommended: 60% ${allocation[0]?.protocol ?? 'primary'}`
    if (allocation[1]) reasoning += `, 30% ${allocation[1].protocol}`
    if (allocation[2]) reasoning += `, 10% ${allocation[2].protocol} as cash reserve`
    reasoning += `. `
    reasoning += `Estimated monthly yield on $${idleFunds.toFixed(2)} treasury: $${monthlyEst.toFixed(2)}. `
  } else {
    reasoning = 'No yield protocols available. Funds remain idle.'
  }

  reasoning += '[Deterministic fallback — no CLAUDE_API_KEY configured]'

  return { reasoning, confidence: 0.6, allocation }
}
