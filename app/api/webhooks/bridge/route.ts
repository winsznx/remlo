import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * POST /api/webhooks/bridge
 * Receives Bridge webhook events and updates Supabase accordingly.
 * Signature verified using RSA-256 with BRIDGE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // ── Verify RSA signature from Bridge ─────────────────────────────────────
  const signature = req.headers.get('bridge-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const secret = process.env.BRIDGE_WEBHOOK_SECRET
  if (secret) {
    try {
      const isValid = verifyBridgeSignature(rawBody, signature, secret)
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }
  }

  const event = JSON.parse(rawBody) as BridgeWebhookEvent
  await handleBridgeEvent(event)

  return NextResponse.json({ received: true })
}

function verifyBridgeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(payload)
    verify.end()
    return verify.verify(secret, signature, 'base64')
  } catch {
    // Fallback to HMAC if secret is not an RSA key (sandbox/test environments)
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expected = hmac.digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  }
}

interface BridgeWebhookEvent {
  type: string
  data: Record<string, unknown>
  created_at: string
}

async function handleBridgeEvent(event: BridgeWebhookEvent): Promise<void> {
  const supabase = createServerClient()

  switch (event.type) {
    case 'transfer.state_changed': {
      const transfer = event.data as {
        id: string
        status: string
        customer_id?: string
        amount?: string
      }
      // Update payment_items tx status if we track this transfer
      await supabase
        .from('payment_items')
        .update({ status: mapTransferStatus(transfer.status) })
        .eq('tx_hash', transfer.id)
      break
    }

    case 'kyc.status_updated': {
      const kyc = event.data as {
        customer_id: string
        status: 'approved' | 'rejected' | 'pending' | 'expired'
        rejection_reasons?: string[]
      }

      const newStatus = mapKycStatus(kyc.status)
      const updates: Record<string, unknown> = { kyc_status: newStatus }
      if (newStatus === 'approved') {
        updates.kyc_verified_at = new Date().toISOString()
      }

      const { data: employee } = await supabase
        .from('employees')
        .update(updates)
        .eq('bridge_customer_id', kyc.customer_id)
        .select('id, employer_id')
        .single()

      if (employee) {
        await supabase.from('compliance_events').insert({
          employer_id: employee.employer_id,
          employee_id: employee.id,
          event_type: 'kyc_' + kyc.status,
          result: newStatus === 'approved' ? 'CLEAR' : 'BLOCKED',
          description: kyc.rejection_reasons?.join('; ') ?? null,
          metadata: { kyc_customer_id: kyc.customer_id, status: kyc.status },
        })
      }
      break
    }

    case 'card.transaction': {
      // Card transactions are surfaced in the employee portal via Bridge API directly.
      // No Supabase persistence needed at this time.
      break
    }

    default:
      // Unknown event types are silently accepted to avoid rejecting future events
      break
  }
}

function mapTransferStatus(bridgeStatus: string): string {
  const map: Record<string, string> = {
    pending: 'pending',
    processing: 'pending',
    completed: 'confirmed',
    failed: 'failed',
    cancelled: 'failed',
  }
  return map[bridgeStatus] ?? 'pending'
}

function mapKycStatus(bridgeStatus: string): string {
  const map: Record<string, string> = {
    approved: 'approved',
    rejected: 'rejected',
    pending: 'pending',
    under_review: 'pending',
    expired: 'expired',
  }
  return map[bridgeStatus] ?? 'pending'
}
