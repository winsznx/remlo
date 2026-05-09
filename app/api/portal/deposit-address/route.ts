import { NextRequest, NextResponse } from 'next/server'
import { getCallerEmployee } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { deriveEmployeeDepositAddress, deriveUserTag } from '@/lib/tempo/virtual-addresses'

/**
 * GET /api/portal/deposit-address
 *
 * Returns the authenticated employee's TIP-1022 deposit address — a
 * virtual address that routes inbound TIP-20 transfers to the employer
 * treasury, with the employee tagged via 6 bytes the chain emits in the
 * intermediate `Transfer` event.
 *
 * Response:
 *   - `address` is null when the employer hasn't registered a master yet
 *     (returns a 200 + reason). UI shows "deposit address not yet
 *     available".
 *   - `userTag` is deterministic from `(employerId, employeeId)` so it's
 *     safe to surface in the response — anyone could derive it given the
 *     two IDs anyway.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const employee = await getCallerEmployee(req)
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: employer } = await supabase
    .from('employers')
    .select('virtual_master_id, virtual_master_address, company_name')
    .eq('id', employee.employer_id)
    .maybeSingle()

  if (!employer?.virtual_master_id) {
    return NextResponse.json({
      available: false,
      reason: 'Your employer has not enabled per-employee deposit addresses yet.',
      address: null,
      userTag: null,
      masterAddress: null,
    })
  }

  const userTag = deriveUserTag(employee.employer_id, employee.id)
  const address = deriveEmployeeDepositAddress({
    masterId: employer.virtual_master_id as `0x${string}`,
    employerId: employee.employer_id,
    employeeId: employee.id,
  })

  return NextResponse.json({
    available: true,
    address,
    userTag,
    masterAddress: employer.virtual_master_address,
    employerName: employer.company_name,
    warning:
      'Only TIP-20 stablecoins are supported. Non-TIP-20 tokens (NFTs, LP positions) sent to this address are unrecoverable.',
  })
}
