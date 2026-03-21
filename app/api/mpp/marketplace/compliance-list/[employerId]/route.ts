import { NextRequest } from 'next/server'
import { mppx } from '@/lib/mpp'
import { getComplianceEventsByEmployerId } from '@/lib/queries/compliance'

/**
 * GET /api/mpp/marketplace/compliance-list/[employerId]
 * MPP-7f — $0.50 single charge
 * Returns full compliance event history for an employer.
 * Useful for auditors, marketplace buyers, and compliance officers.
 *
 * Query params: ?limit=100
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employerId: string }> }
) {
  const { employerId } = await params
  const url = new URL(req.url)
  const limit = Math.min(500, parseInt(url.searchParams.get('limit') ?? '100', 10))

  return mppx.charge({ amount: '0.50' })(async () => {
    const events = await getComplianceEventsByEmployerId(employerId, limit)

    const summary = {
      total: events.length,
      clear: events.filter((e) => e.result === 'CLEAR').length,
      blocked: events.filter((e) => e.result === 'BLOCKED').length,
      mpp_checks: events.filter((e) => e.event_type === 'mpp_check').length,
      kyc_events: events.filter((e) => e.event_type?.startsWith('kyc_')).length,
    }

    return Response.json({
      employer_id: employerId,
      summary,
      events,
      retrieved_at: new Date().toISOString(),
    })
  })(req)
}
