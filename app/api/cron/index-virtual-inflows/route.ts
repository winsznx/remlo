import { NextRequest, NextResponse } from 'next/server'
import { type Address, type Hex, parseAbiItem, getAddress, getEventSelector } from 'viem'
import { authorizeCronRequest } from '@/lib/cron-auth'
import { createServerClient } from '@/lib/supabase-server'
import { publicClient } from '@/lib/contracts'
import { TEMPO_TOKENS } from '@/lib/tempo/system-contracts'
import { decodeVirtualAddress } from '@/lib/tempo/virtual-addresses'
import { getTempoNetwork } from '@/lib/tempo/network'

/**
 * GET /api/cron/index-virtual-inflows
 *
 * Walks each registered virtual master and writes recent inbound TIP-20
 * Transfers (the second leg of the two-Transfer dance — virtual → master)
 * into `virtual_address_inflows`.
 *
 * Strategy: every tick, scan the last `LOOKBACK_BLOCKS` blocks of the
 * Tempo chain for `Transfer(from, to=master, value)` events on a fixed
 * set of TIP-20 tokens (pathUSD + Alpha/Beta/Theta on testnet). For each
 * hit, decode the `from` field — if it's a virtual address with our
 * masterId, the userTag inside it identifies the employee.
 *
 * Idempotency: the row's `(tx_hash, log_index)` unique constraint dedupes
 * re-scans, so re-running the same window is safe and free.
 *
 * Bounded work: we cap per-tick lookback at LOOKBACK_BLOCKS (~50 min on
 * Tempo's ~600ms block time). At 5-min cron cadence we have 10x overlap
 * — generous enough that one missed tick doesn't lose data.
 *
 * Cron auth via CRON_SECRET. Cron schedule defined in vercel.json.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
)
const TRANSFER_TOPIC = getEventSelector(TRANSFER_EVENT)

/**
 * ~3 hours of history per scan. At Tempo's ~600ms block time, 18,000 blocks
 * is ~3h of chain. Cron runs every 30 min, so we have ~6× overlap — generous
 * safety margin for missed ticks. The (tx_hash, log_index) unique constraint
 * dedupes overlapping windows for free.
 */
const LOOKBACK_BLOCKS = 18_000n

/** Tokens we know about. Mainnet expansion goes through `lib/tempo/tokenlist.ts`. */
const KNOWN_TOKENS: Array<{ address: Address; symbol: string; decimals: number }> = [
  { address: TEMPO_TOKENS.pathUsd as Address, symbol: 'pathUSD', decimals: 6 },
  { address: TEMPO_TOKENS.alphaUsd as Address, symbol: 'AlphaUSD', decimals: 6 },
  { address: TEMPO_TOKENS.betaUsd as Address, symbol: 'BetaUSD', decimals: 6 },
  { address: TEMPO_TOKENS.thetaUsd as Address, symbol: 'ThetaUSD', decimals: 6 },
]

interface MasterRow {
  id: string
  virtual_master_id: string
  virtual_master_address: string
}

export async function GET(req: NextRequest) {
  const denied = authorizeCronRequest(req)
  if (denied) return denied

  const supabase = createServerClient()

  // Pull every employer with a registered master.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: masters } = await supabase
    .from('employers')
    .select('id, virtual_master_id, virtual_master_address')
    .not('virtual_master_id', 'is', null)
    .not('virtual_master_address', 'is', null)

  const list = (masters ?? []) as MasterRow[]
  if (list.length === 0) {
    return NextResponse.json({ network: getTempoNetwork().name, masters: 0, hits: 0 })
  }

  const head = await publicClient.getBlockNumber()
  const fromBlock = head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n

  const summary = {
    network: getTempoNetwork().name,
    masters: list.length,
    fromBlock: fromBlock.toString(),
    toBlock: head.toString(),
    scanned: 0,
    hits: 0,
    inserted: 0,
    duplicates: 0,
    errors: 0,
  }

  // Pre-build an employee-by-userTag lookup for efficient employee_id
  // resolution. The lookup is per-employer because multiple employers can
  // collide on a userTag (it's only 6 bytes per master, but two masters
  // can produce identical tags by coincidence).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employer_id')
    .in(
      'employer_id',
      list.map((m) => m.id),
    )
    .eq('active', true)

  // We'll resolve userTag → employee_id by deriving the tag for each
  // employee. Lazy-resolve to avoid keccak'ing every employee on every
  // tick — only when we actually have an inflow to map.
  const employeeMap = new Map<string, Array<{ id: string; employer_id: string }>>()
  for (const e of (employees ?? []) as Array<{ id: string; employer_id: string }>) {
    if (!employeeMap.has(e.employer_id)) employeeMap.set(e.employer_id, [])
    employeeMap.get(e.employer_id)!.push(e)
  }

  for (const master of list) {
    const masterAddr = getAddress(master.virtual_master_address) as Address
    const employerEmployees = employeeMap.get(master.id) ?? []

    // Build userTag → employee_id lookup once per master.
    const tagToEmployee = new Map<string, string>()
    for (const emp of employerEmployees) {
      const tag = await deriveTagAsync(master.id, emp.id)
      tagToEmployee.set(tag.toLowerCase(), emp.id)
    }

    for (const token of KNOWN_TOKENS) {
      try {
        // `eth_getLogs` filtered by topic — `topics[2]` is the indexed `to`
        // field. Encode the master address as a 32-byte topic value.
        const masterTopic = ('0x' + masterAddr.slice(2).toLowerCase().padStart(64, '0')) as Hex
        const logs = await publicClient.getLogs({
          address: token.address,
          event: TRANSFER_EVENT,
          args: { to: masterAddr },
          fromBlock,
          toBlock: head,
        })
        // The `args` filter above already does it, but viem occasionally
        // returns soft matches on the encoded topic — we double-check.
        for (const log of logs) {
          summary.scanned++
          const fromAddr = log.args.from as Address | undefined
          if (!fromAddr) continue

          const decoded = decodeVirtualAddress(fromAddr)
          if (!decoded) continue
          if (decoded.masterId.toLowerCase() !== master.virtual_master_id.toLowerCase()) continue
          if (!log.transactionHash || log.logIndex === null || log.logIndex === undefined) continue
          summary.hits++

          const employeeId = tagToEmployee.get(decoded.userTag.toLowerCase()) ?? null

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase.from('virtual_address_inflows').insert({
            employer_id: master.id,
            employee_id: employeeId,
            user_tag: decoded.userTag,
            token_address: token.address.toLowerCase(),
            amount: (log.args.value as bigint).toString(),
            decimals: token.decimals,
            symbol: token.symbol,
            tx_hash: log.transactionHash,
            block_number: Number(log.blockNumber ?? 0),
            log_index: log.logIndex,
            sender_address: null, // outer-leg sender requires another log read; deferred.
          })
          if (error) {
            // Unique-constraint violations are expected (we re-scan overlapping windows).
            const msg = error.message ?? String(error)
            if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
              summary.duplicates++
            } else {
              summary.errors++
              console.error('[virtual-inflows-indexer] insert failed', error)
            }
            continue
          }
          summary.inserted++
        }

        // Reference `masterTopic` so it isn't tree-shaken — it's the
        // raw-RPC fallback shape if we ever need to bypass viem's
        // type-checked `event` filter.
        void masterTopic
      } catch (err) {
        summary.errors++
        console.error('[virtual-inflows-indexer] getLogs failed', {
          master: master.virtual_master_id,
          token: token.symbol,
          error: err instanceof Error ? err.message : err,
        })
      }
    }
  }

  return NextResponse.json(summary)
}

/**
 * Async wrapper over deriveUserTag so we can `await` future enhancements
 * (e.g. caching tags in the DB so we don't rederive every tick). Today
 * this is just a sync call dressed in a Promise.
 */
async function deriveTagAsync(employerId: string, employeeId: string): Promise<string> {
  const { deriveUserTag } = await import('@/lib/tempo/virtual-addresses')
  return deriveUserTag(employerId, employeeId)
}
