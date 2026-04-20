import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployer } from '@/lib/auth'
import {
  getTempoReputationFailureSummary,
  retryTempoReputationWrite,
} from '@/lib/queries/reputation-writes'

/**
 * GET /api/reputation/tempo-failures
 * Returns a summary of pending + failed Tempo reputation writes so the
 * dashboard strip can surface outstanding issues. Employer-authed, not
 * employer-scoped — any authenticated employer sees the same platform-wide
 * signer health signal (it affects every employer equally).
 */
export async function GET(req: NextRequest) {
  const employer = await getCallerEmployer(req)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const summary = await getTempoReputationFailureSummary(50)
  return NextResponse.json(summary)
}

/**
 * POST /api/reputation/tempo-failures
 * Body: { id: string } — retries a single failed write by resetting its status.
 * The next cron tick picks it up.
 */
export async function POST(req: NextRequest) {
  const employer = await getCallerEmployer(req)
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await retryTempoReputationWrite(body.id)
  return NextResponse.json({ ok: true, id: body.id })
}
