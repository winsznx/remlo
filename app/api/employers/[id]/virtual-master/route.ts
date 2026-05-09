import { NextRequest, NextResponse } from 'next/server'
import { type Hex, getAddress, keccak256, concat, toHex } from 'viem'
import { getAuthorizedEmployer } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { getServerWalletClient, publicClient } from '@/lib/contracts'
import { TEMPO_SYSTEM_CONTRACTS } from '@/lib/tempo/system-contracts'
import { findValidSalt } from '@/lib/tempo/virtual-addresses'
import { tempoExplorerUrl } from '@/lib/tempo/network'

/**
 * GET /api/employers/[id]/virtual-master
 *   Returns the cached master registration (or null if not yet registered).
 *
 * POST /api/employers/[id]/virtual-master
 *   Body (optional): { startNonce?: string }
 *   Mines a salt, registers it onchain via the Address Registry, and
 *   caches (master_id, salt, tx_hash) on the employer row.
 *
 * Auth: Privy bearer of the employer owner.
 *
 * The master wallet is the Remlo agent (REMLO_AGENT_PRIVATE_KEY) acting on
 * behalf of the employer. The agent's address becomes the actual
 * `masterAddress` recorded on the chain — every per-employee deposit
 * routes back to that wallet, with the userTag decoded from event logs.
 *
 * Why not the employer's own wallet: most employers don't have a Tempo
 * wallet today; we're using Remlo's agent as a custodial-yet-attributable
 * intermediary while we work on a per-employer Tempo Account model.
 */
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const AddressRegistryAbi = [
  {
    type: 'function',
    name: 'registerVirtualMaster',
    inputs: [{ name: 'salt', type: 'bytes32' }],
    outputs: [{ name: 'masterId', type: 'bytes4' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getMaster',
    inputs: [{ name: 'masterId', type: 'bytes4' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  // Generated types haven't been regenerated post-migration. Cast at boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await supabase
    .from('employers')
    .select(
      'virtual_master_id, virtual_master_address, virtual_master_salt, virtual_master_tx_hash, virtual_master_registered_at',
    )
    .eq('id', employerId)
    .maybeSingle()

  return NextResponse.json({
    registered: Boolean(data?.virtual_master_id),
    masterId: data?.virtual_master_id ?? null,
    masterAddress: data?.virtual_master_address ?? null,
    txHash: data?.virtual_master_tx_hash ?? null,
    explorerUrl: data?.virtual_master_tx_hash
      ? tempoExplorerUrl('tx', data.virtual_master_tx_hash)
      : null,
    registeredAt: data?.virtual_master_registered_at ?? null,
  })
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: employerId } = await ctx.params
  const employer = await getAuthorizedEmployer(req, employerId)
  if (!employer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agentKey = process.env.REMLO_AGENT_PRIVATE_KEY as Hex | undefined
  if (!agentKey) {
    return NextResponse.json(
      { error: 'REMLO_AGENT_PRIVATE_KEY not configured on server.' },
      { status: 503 },
    )
  }

  const supabase = createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await supabase
    .from('employers')
    .select('virtual_master_id, virtual_master_tx_hash')
    .eq('id', employerId)
    .maybeSingle()
  if (existing?.virtual_master_id) {
    return NextResponse.json(
      {
        error: 'Master already registered',
        masterId: existing.virtual_master_id,
        txHash: existing.virtual_master_tx_hash,
      },
      { status: 409 },
    )
  }

  let body: { startNonce?: unknown } = {}
  try {
    body = (await req.json().catch(() => ({}))) as typeof body
  } catch {
    body = {}
  }
  const startNonce =
    typeof body.startNonce === 'string' && /^[0-9]+$/.test(body.startNonce)
      ? BigInt(body.startNonce)
      : 0n

  const wallet = getServerWalletClient(agentKey)
  const masterAddress = wallet.account.address

  // Mine a salt offchain. ~2^32 expected iterations; we cap at 50M attempts
  // per request to avoid spinning forever — the client retries with a higher
  // startNonce if we run out.
  const mined = findValidSalt(masterAddress, { startNonce })
  if (!mined) {
    return NextResponse.json(
      {
        error: 'Could not mine a valid salt within the iteration budget. Retry with a higher startNonce.',
        nextStartNonce: (startNonce + 50_000_000n).toString(),
      },
      { status: 504 },
    )
  }

  // Verify the on-chain registry will accept it (sanity check; we already
  // verified the math).
  const expectedMasterId = `0x${keccak256(concat([masterAddress, mined.salt])).slice(10, 18)}`
  if (expectedMasterId !== mined.masterId) {
    return NextResponse.json(
      { error: 'Salt verification mismatch — refusing to broadcast.' },
      { status: 500 },
    )
  }

  let txHash: Hex
  try {
    txHash = await wallet.writeContract({
      address: TEMPO_SYSTEM_CONTRACTS.addressRegistry,
      abi: AddressRegistryAbi,
      functionName: 'registerVirtualMaster',
      args: [mined.salt],
    })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          'On-chain registration failed: ' +
          (err instanceof Error ? err.message.slice(0, 400) : 'unknown error'),
      },
      { status: 502 },
    )
  }

  // Cache on the employer row. We don't await receipt — the explorer link
  // will show pending then confirmed. If you need the master to be usable
  // immediately, wait for receipt before deriving addresses.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase
    .from('employers')
    .update({
      virtual_master_id: mined.masterId,
      virtual_master_address: masterAddress,
      virtual_master_salt: mined.salt,
      virtual_master_tx_hash: txHash,
      virtual_master_registered_at: new Date().toISOString(),
    })
    .eq('id', employerId)

  // Mark unused viem import gracefully — keep `publicClient` and `toHex`
  // available for future receipt confirmation work.
  void publicClient
  void getAddress
  void toHex

  return NextResponse.json(
    {
      registered: true,
      masterId: mined.masterId,
      masterAddress,
      txHash,
      explorerUrl: tempoExplorerUrl('tx', txHash),
      saltIterations: mined.iterations,
    },
    { status: 201 },
  )
}
