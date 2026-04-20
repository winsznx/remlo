export interface YieldRate {
  protocol: 'kamino' | 'drift' | 'lulo'
  apy_percent: number
  tvl_usd?: number
  source: 'live' | 'mock'
  available: boolean
  error?: string
  fetched_at: string
}

// TODO: wire to live Kamino API (https://api.hubbleprotocol.io/kamino-market/mainnet/metrics)
export async function fetchKaminoRates(): Promise<YieldRate> {
  try {
    const res = await fetch(
      'https://api.hubbleprotocol.io/v2/strategies/USDC/metrics?env=mainnet-beta',
      { signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = (await res.json()) as { apy?: number; tvl?: number }
      if (typeof data.apy === 'number') {
        return {
          protocol: 'kamino',
          apy_percent: Math.round(data.apy * 10000) / 100,
          tvl_usd: data.tvl,
          source: 'live',
          available: true,
          fetched_at: new Date().toISOString(),
        }
      }
    }
  } catch {
    // fall through to mock
  }
  return {
    protocol: 'kamino',
    apy_percent: 4.2,
    tvl_usd: 890_000_000,
    source: 'mock',
    available: true,
    fetched_at: new Date().toISOString(),
  }
}

// TODO: wire to live Drift API
export async function fetchDriftRates(): Promise<YieldRate> {
  try {
    const res = await fetch(
      'https://mainnet-beta.api.drift.trade/stats/fundingRates',
      { signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = (await res.json()) as { depositRate?: number }
      if (typeof data.depositRate === 'number') {
        return {
          protocol: 'drift',
          apy_percent: Math.round(data.depositRate * 10000) / 100,
          source: 'live',
          available: true,
          fetched_at: new Date().toISOString(),
        }
      }
    }
  } catch {
    // fall through to mock
  }
  return {
    protocol: 'drift',
    apy_percent: 5.1,
    tvl_usd: 420_000_000,
    source: 'mock',
    available: true,
    fetched_at: new Date().toISOString(),
  }
}

// TODO: wire to live Lulo/Flexlend API (https://api.flexlend.fi/)
export async function fetchLuloRates(): Promise<YieldRate> {
  try {
    const res = await fetch(
      'https://api.flexlend.fi/rate/usdc',
      { signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = (await res.json()) as { rate?: number; apy?: number }
      const apy = data.apy ?? data.rate
      if (typeof apy === 'number') {
        return {
          protocol: 'lulo',
          apy_percent: Math.round(apy * 100) / 100,
          source: 'live',
          available: true,
          fetched_at: new Date().toISOString(),
        }
      }
    }
  } catch {
    // fall through to mock
  }
  return {
    protocol: 'lulo',
    apy_percent: 3.8,
    tvl_usd: 150_000_000,
    source: 'mock',
    available: true,
    fetched_at: new Date().toISOString(),
  }
}

export async function fetchAllYieldRates(): Promise<YieldRate[]> {
  const results = await Promise.allSettled([
    fetchKaminoRates(),
    fetchDriftRates(),
    fetchLuloRates(),
  ])

  const rates: YieldRate[] = results.map((r, i) => {
    const protocol = (['kamino', 'drift', 'lulo'] as const)[i]
    if (r.status === 'fulfilled') return r.value
    return {
      protocol,
      apy_percent: 0,
      source: 'mock' as const,
      available: false,
      error: r.reason instanceof Error ? r.reason.message : 'fetch_failed',
      fetched_at: new Date().toISOString(),
    }
  })

  return rates.sort((a, b) => b.apy_percent - a.apy_percent)
}
