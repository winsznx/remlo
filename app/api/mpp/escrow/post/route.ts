import { mppx } from '@/lib/mpp'
import { postEscrow, publicEscrowView } from '@/lib/escrow'

/**
 * POST /api/mpp/escrow/post
 * MPP-14 — $0.10 x402 charge.
 *
 * Posts an escrow that will be auto-validated by Claude. Funds custodied by
 * the remlo_escrow Anchor program PDA during the escrow period.
 */
export const POST = mppx.charge({ amount: '0.10' })(async (req: Request) => {
  const agentIdentifier = req.headers.get('x-agent-identifier')?.trim()
  if (!agentIdentifier) {
    return Response.json(
      { error: 'Missing X-Agent-Identifier header', code: 'AGENT_NOT_AUTHORIZED' },
      { status: 401 },
    )
  }

  const body = (await req.json()) as {
    employer_id?: string
    worker_wallet_address?: string
    worker_agent_identifier?: string
    amount_usdc?: string
    rubric_prompt?: string
    expiry_hours?: number
  }

  const required: (keyof typeof body)[] = [
    'employer_id',
    'worker_wallet_address',
    'worker_agent_identifier',
    'amount_usdc',
    'rubric_prompt',
  ]
  for (const key of required) {
    if (!body[key]) return Response.json({ error: `${key} is required` }, { status: 400 })
  }

  try {
    const row = await postEscrow({
      employerId: body.employer_id!,
      requesterAgentIdentifier: agentIdentifier,
      workerAgentIdentifier: body.worker_agent_identifier!,
      workerWalletAddress: body.worker_wallet_address!,
      amountUsdc: body.amount_usdc!,
      rubricPrompt: body.rubric_prompt!,
      expiryHours: body.expiry_hours,
    })
    return Response.json({
      ...publicEscrowView(row),
      // Include the initialize signature explicitly for discoverability
      initialize_signature: row.initialize_signature,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    const status = msg.toLowerCase().includes('authoriz') ? 403
      : msg.toLowerCase().includes('not configured') ? 503
      : 400
    return Response.json({ error: msg }, { status })
  }
})
