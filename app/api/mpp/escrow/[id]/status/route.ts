import { mppx } from '@/lib/mpp'
import { createServerClient } from '@/lib/supabase-server'
import { publicEscrowView } from '@/lib/escrow'

/**
 * GET /api/mpp/escrow/[id]/status
 * MPP-16 — $0.01 x402 charge.
 *
 * Public-read endpoint: any x402-paying caller can observe the lifecycle of
 * an escrow by its UUID. Returns sanitized public fields only (no
 * validator_model, no internal hashes, no employer scope).
 */
export const GET = mppx.charge({ amount: '0.01' })(async (req: Request) => {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  // URL pattern: /api/mpp/escrow/{id}/status
  const id = segments[segments.length - 2]
  if (!id) return Response.json({ error: 'escrow id missing from path' }, { status: 400 })

  const supabase = createServerClient()
  const { data: row } = await supabase
    .from('escrows')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!row) return Response.json({ error: 'Escrow not found' }, { status: 404 })
  return Response.json(publicEscrowView(row))
})
