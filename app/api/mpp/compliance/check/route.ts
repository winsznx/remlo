import { mppx } from '@/lib/mpp'
import { tip403Registry } from '@/lib/contracts'
import { insertComplianceEvent } from '@/lib/queries/compliance'

/**
 * POST /api/mpp/compliance/check
 * MPP-2 — $0.05 single charge
 * Checks a wallet address against the TIP-403 compliance registry.
 * Inserts result into compliance_events table.
 *
 * Body: { walletAddress: string, policyId?: number, employerId?: string }
 */
export const POST = mppx.charge({ amount: '0.05' })(async (req: Request) => {
  const body = await req.json() as {
    walletAddress: string
    policyId?: number
    employerId?: string
  }

  const { walletAddress, policyId = 0, employerId } = body

  if (!walletAddress || !walletAddress.startsWith('0x')) {
    return Response.json({ error: 'Invalid walletAddress' }, { status: 400 })
  }

  const authorized = await tip403Registry.read.isAuthorized([
    BigInt(policyId),
    walletAddress as `0x${string}`,
  ]) as boolean

  // Synthetic risk score: 0 = fully authorized, 100 = blocked
  const riskScore = authorized ? 0 : 100
  const result = authorized ? 'CLEAR' : 'BLOCKED'

  await insertComplianceEvent({
    employer_id: employerId ?? null,
    wallet_address: walletAddress,
    event_type: 'mpp_check',
    result,
    risk_score: riskScore,
    description: authorized
      ? `Wallet authorized under policy ${policyId}`
      : `Wallet not authorized under policy ${policyId}`,
    metadata: { policyId, walletAddress, authorized },
  })

  return Response.json({
    wallet_address: walletAddress,
    policy_id: policyId,
    authorized,
    risk_score: riskScore,
    result,
    checked_at: new Date().toISOString(),
  })
})
