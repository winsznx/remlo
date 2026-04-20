import { mppx } from '@/lib/mpp'
import { deliverSignedTransaction, publicEscrowView } from '@/lib/escrow'

/**
 * POST /api/mpp/escrow/deliver-signed
 * Ship 2.3 — $0.02 x402 charge.
 *
 * For worker agents that manage their own Solana keys rather than delegating
 * to Remlo's Privy wallet. The client signs a submit_deliverable instruction
 * offline, base64-encodes the Transaction, and submits via this endpoint.
 *
 * The server verifies (in lib/escrow.ts::deliverSignedTransaction):
 *   1. The signed tx contains a submit_deliverable instruction on the
 *      remlo_escrow program.
 *   2. The fee payer (first signer) matches escrow.worker_wallet_address.
 *   3. The uri_hash in the signed instruction equals sha256(deliverable_uri)
 *      from the body — prevents signing one hash and claiming another.
 *   4. The X-Agent-Identifier header matches worker_agent_identifier.
 */
export const POST = mppx.charge({ amount: '0.02' })(async (req: Request) => {
  const agentIdentifier = req.headers.get('x-agent-identifier')?.trim()
  if (!agentIdentifier) {
    return Response.json(
      { error: 'Missing X-Agent-Identifier header', code: 'AGENT_NOT_AUTHORIZED' },
      { status: 401 },
    )
  }

  let body: {
    escrow_id?: string
    deliverable_uri?: string
    signed_transaction?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.escrow_id || !body.deliverable_uri || !body.signed_transaction) {
    return Response.json(
      { error: 'escrow_id, deliverable_uri, signed_transaction are required' },
      { status: 400 },
    )
  }

  try {
    const row = await deliverSignedTransaction({
      escrowId: body.escrow_id,
      deliverableUri: body.deliverable_uri,
      signedTransactionBase64: body.signed_transaction,
      submittingAgentIdentifier: agentIdentifier,
    })
    return Response.json({
      ...publicEscrowView(row),
      message:
        'Worker-signed deliverable broadcast. Validation runs asynchronously; poll the status endpoint for the verdict.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    const lower = msg.toLowerCase()
    const status = lower.includes('not found')
      ? 404
      : lower.includes('does not match') ||
          lower.includes('expired') ||
          lower.includes('fee payer')
        ? 403
        : lower.includes('broadcast') || lower.includes('confirm')
          ? 502
          : 400
    return Response.json({ error: msg }, { status })
  }
})
