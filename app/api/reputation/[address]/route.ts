import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { getCrossChainReputation } from '@/lib/reputation'

/**
 * GET /api/reputation/{address}
 *
 * Public, no auth, no x402 charge. Accepts:
 *   - Solana base58 address (32 bytes → 43-44 chars)
 *   - ERC-8004 Tempo agent ID (numeric string)
 *   - Tempo EVM address (0x-prefixed 40 hex chars), treated as opaque subject
 *     and mapped to nothing on-chain today (returns empty tempo reputation)
 *
 * Returns the aggregated cross-chain reputation summary. External protocols
 * query this to read Remlo-issued reputation without needing their own SAS
 * or ERC-8004 client.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
): Promise<NextResponse> {
  const { address } = await params
  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }

  const input: { solanaAddress?: string; tempoAgentId?: string } = {}

  // Numeric string → Tempo agent ID
  if (/^\d+$/.test(address)) {
    input.tempoAgentId = address
  } else {
    // Otherwise try Solana base58
    try {
      new PublicKey(address)
      input.solanaAddress = address
    } catch {
      return NextResponse.json(
        {
          error:
            'address must be a Solana base58 pubkey or a numeric ERC-8004 agent ID',
        },
        { status: 400 },
      )
    }
  }

  const result = await getCrossChainReputation(input)

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=30',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
