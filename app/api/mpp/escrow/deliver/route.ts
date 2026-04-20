import { mppx } from '@/lib/mpp'
import { submitDeliverable, publicEscrowView } from '@/lib/escrow'

/**
 * POST /api/mpp/escrow/deliver
 * MPP-15 — $0.02 x402 charge.
 *
 * Submits a deliverable URI for an existing escrow. The submitting agent
 * must match worker_agent_identifier recorded at post time. Validation +
 * settlement runs async — caller polls /status to see the final verdict.
 */
export const POST = mppx.charge({ amount: '0.02' })(async (req: Request) => {
  const agentIdentifier = req.headers.get('x-agent-identifier')?.trim()
  if (!agentIdentifier) {
    return Response.json(
      { error: 'Missing X-Agent-Identifier header', code: 'AGENT_NOT_AUTHORIZED' },
      { status: 401 },
    )
  }

  const body = (await req.json()) as { escrow_id?: string; deliverable_uri?: string }
  if (!body.escrow_id || !body.deliverable_uri) {
    return Response.json(
      { error: 'escrow_id and deliverable_uri are required' },
      { status: 400 },
    )
  }

  try {
    const row = await submitDeliverable(body.escrow_id, body.deliverable_uri, agentIdentifier)
    return Response.json({
      ...publicEscrowView(row),
      message: 'Deliverable submitted. Validation runs asynchronously; poll the status endpoint for the verdict.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    const status = msg.toLowerCase().includes('not found') ? 404
      : msg.toLowerCase().includes('does not match') || msg.toLowerCase().includes('expired') ? 403
      : 400
    return Response.json({ error: msg }, { status })
  }
})
