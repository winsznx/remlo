import { fetchAllYieldRates, type YieldRate } from '@/lib/solana-yield'

export interface YieldEvaluation {
  rates: YieldRate[]
  recommended_allocation: { protocol: string; percent: number }[]
  risk_assessment: string
}

export async function evaluateYieldOpportunities(): Promise<YieldEvaluation> {
  const rates = await fetchAllYieldRates()
  const available = rates.filter((r) => r.available && r.apy_percent > 0)

  if (available.length === 0) {
    return {
      rates,
      recommended_allocation: [],
      risk_assessment: 'No yield protocols are currently available.',
    }
  }

  const allocation = available.map((r, i) => ({
    protocol: r.protocol,
    percent: i === 0 ? 60 : i === 1 ? 30 : 10,
  }))

  const top = available[0]
  const tvlNote = top.tvl_usd
    ? ` with $${(top.tvl_usd / 1e6).toFixed(0)}M TVL`
    : ''

  const risk_assessment =
    `${top.protocol.charAt(0).toUpperCase() + top.protocol.slice(1)} offers best risk-adjusted yield at ${top.apy_percent}% APY${tvlNote}. ` +
    `Allocation weighted toward highest-APY protocol with diversification across ${available.length} source${available.length > 1 ? 's' : ''}.`

  return { rates, recommended_allocation: allocation, risk_assessment }
}
