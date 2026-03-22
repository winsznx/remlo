import { NextRequest } from 'next/server'
import { mppx } from '@/lib/mpp'
import { streamVesting } from '@/lib/contracts'

// ~$100k/yr in pathUSD (6 decimals): 100_000 * 1e6 / (365.25 * 24 * 3600) ≈ 3_170_979
const SALARY_PER_SECOND = BigInt(3_170_979)

/**
 * GET /api/mpp/employee/balance/stream
 * MPP-5 — $0.001 per tick (SSE session, manual mode)
 * Streams getAccruedBalance + simulated salary accrual every second.
 * Returns SSE ReadableStream — NOT the simple charge wrapper.
 *
 * Query params: ?address=0x...
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const address = url.searchParams.get('address') as `0x${string}` | null

  return mppx.session({ amount: '0.001', unitType: 'second' })(async () => {
    let baseBalance = BigInt(0)
    if (address?.startsWith('0x')) {
      baseBalance = await streamVesting.read.getAccruedBalance([address]) as bigint
    }

    const startTime = Date.now()
    let tick = 0

    const stream = new ReadableStream({
      start(controller) {
        const interval = setInterval(() => {
          tick++
          const elapsed = BigInt(Math.floor((Date.now() - startTime) / 1000))
          const accrued = baseBalance + elapsed * SALARY_PER_SECOND
          const accruedUsd = (Number(accrued) / 1e6).toFixed(6)

          const data = JSON.stringify({
            tick,
            address: address ?? null,
            accrued_raw: accrued.toString(),
            accrued_usd: accruedUsd,
            salary_per_second_usd: (Number(SALARY_PER_SECOND) / 1e6).toFixed(6),
            timestamp: Date.now(),
          })

          controller.enqueue(`data: ${data}\n\n`)

          if (tick >= 60) {
            clearInterval(interval)
            controller.close()
          }
        }, 1000)

        req.signal?.addEventListener('abort', () => {
          clearInterval(interval)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  })(req)
}
