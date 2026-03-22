import { mppx } from '@/lib/mpp'
import { decodeMemo } from '@/lib/memo'

/**
 * POST /api/mpp/memo/decode
 * MPP-7 — $0.01 single charge
 * Decodes a 32-byte ISO 20022 TIP-20 memo hex string.
 *
 * Body: { memo: string } — 0x-prefixed 32-byte hex
 */
export const POST = mppx.charge({ amount: '0.01' })(async (req: Request) => {
  const { memo } = await req.json() as { memo: string }

  if (!memo || !memo.startsWith('0x') || memo.length !== 66) {
    return Response.json({ error: 'Invalid memo: must be 0x-prefixed 32-byte hex (66 chars)' }, { status: 400 })
  }

  const fields = decodeMemo(memo as `0x${string}`)
  if (!fields) {
    return Response.json({ error: 'Failed to decode memo: unrecognized format' }, { status: 422 })
  }

  return Response.json({ memo, fields })
})
