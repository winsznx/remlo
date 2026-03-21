import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * POST /api/webhooks/tempo
 * Receives Tempo block confirmation events (finalized payroll tx, stream events).
 * Updates payroll_runs and payment_items with confirmed tx hashes and block numbers.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verify webhook signature using shared secret HMAC-SHA256
  const signature = req.headers.get('x-tempo-signature')
  const secret = process.env.TEMPO_WEBHOOK_SECRET
  if (secret && signature) {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(rawBody)
    const expected = `sha256=${hmac.digest('hex')}`
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const event = JSON.parse(rawBody) as TempoWebhookEvent
  await handleTempoEvent(event)

  return NextResponse.json({ received: true })
}

interface TempoWebhookEvent {
  type: string
  tx_hash: string
  block_number: number
  timestamp: number
  data?: Record<string, unknown>
}

async function handleTempoEvent(event: TempoWebhookEvent): Promise<void> {
  const supabase = createServerClient()

  switch (event.type) {
    case 'transaction.confirmed': {
      const settledAt = new Date(event.timestamp * 1000).toISOString()
      const confirmTime = Date.now() - event.timestamp * 1000

      // Update payroll_run with tx_hash + block_number + finalized_at
      const { data: run } = await supabase
        .from('payroll_runs')
        .update({
          status: 'completed',
          tx_hash: event.tx_hash,
          block_number: event.block_number,
          finalized_at: settledAt,
          settlement_time_ms: Math.max(0, Math.round(confirmTime)),
        })
        .eq('tx_hash', event.tx_hash)
        .select('id')
        .single()

      if (run) {
        // Mark all payment items in this run as confirmed
        await supabase
          .from('payment_items')
          .update({ status: 'confirmed', tx_hash: event.tx_hash })
          .eq('payroll_run_id', run.id)
      }
      break
    }

    case 'transaction.failed': {
      await supabase
        .from('payroll_runs')
        .update({ status: 'failed', tx_hash: event.tx_hash })
        .eq('tx_hash', event.tx_hash)

      await supabase
        .from('payment_items')
        .update({ status: 'failed' })
        .eq('tx_hash', event.tx_hash)
      break
    }

    default:
      break
  }
}
