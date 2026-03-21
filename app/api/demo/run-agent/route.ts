import { NextRequest } from 'next/server'

interface AgentLine {
  type: 'system' | 'request' | 'response' | 'payment' | 'error'
  text: string
  delay: number
}

const DEMO_SEQUENCE: AgentLine[] = [
  { type: 'system',   text: 'Remlo Agent v1.0 — connecting to Tempo Moderato…',           delay: 0    },
  { type: 'system',   text: 'MPP session opened · maxDeposit: $5.00 · channel: 0xabc…ef12', delay: 400  },
  { type: 'request',  text: 'GET /api/mpp/treasury/yield-rates',                            delay: 900  },
  { type: 'payment',  text: 'Payment: $0.01 · receipt: 0x7f3a…2c81',                        delay: 1300 },
  { type: 'response', text: '200 OK · apy_percent: 3.70% · sources: [usdb, aave]',           delay: 1700 },
  { type: 'request',  text: 'POST /api/mpp/agent/session/treasury · action: balance',        delay: 2200 },
  { type: 'payment',  text: 'Payment: $0.02 · receipt: 0x1d2b…9f44',                        delay: 2600 },
  { type: 'response', text: '200 OK · available: $47,250.00 · locked: $12,750.00',           delay: 3000 },
  { type: 'request',  text: 'POST /api/mpp/compliance/check × 5 employees',                  delay: 3500 },
  { type: 'payment',  text: 'Payment: $0.25 · 5 × $0.05 · all CLEAR',                       delay: 4200 },
  { type: 'response', text: '200 OK · all employees AUTHORIZED via TIP-403 policy #1',       delay: 4600 },
  { type: 'request',  text: 'POST /api/mpp/payroll/execute · payrollRunId: run-abc123',      delay: 5100 },
  { type: 'payment',  text: 'Payment: $1.00 · receipt: 0x9e7f…3b12',                        delay: 5900 },
  { type: 'response', text: '200 OK · tx: 0xdeadbeef… · 28 employees paid in 0.41s',        delay: 6300 },
  { type: 'system',   text: 'Session closed · spent: $1.33 · returned: $3.67 unspent',      delay: 7000 },
]

/**
 * POST /api/demo/run-agent
 * Streams the demo agent sequence as SSE events.
 * Each event: { type, text, timestamp }
 */
export async function POST(req: NextRequest) {
  const startMs = Date.now()

  const stream = new ReadableStream({
    start(controller) {
      const timers: ReturnType<typeof setTimeout>[] = []

      DEMO_SEQUENCE.forEach((line) => {
        const t = setTimeout(() => {
          const payload = JSON.stringify({
            type: line.type,
            text: line.text,
            timestamp: new Date(startMs + line.delay).toLocaleTimeString('en-US', { hour12: false }),
          })
          controller.enqueue(`data: ${payload}\n\n`)
        }, line.delay)
        timers.push(t)
      })

      // Close stream after last event
      const closeTimer = setTimeout(() => {
        controller.close()
      }, DEMO_SEQUENCE[DEMO_SEQUENCE.length - 1].delay + 500)
      timers.push(closeTimer)

      req.signal?.addEventListener('abort', () => {
        timers.forEach(clearTimeout)
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
}
