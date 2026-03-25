import { NextResponse } from 'next/server'

/**
 * GET /.well-known/x402
 * MPP/x402 payment method discovery endpoint.
 * Advertises that this origin accepts MPP payments via PathUSD on Tempo L1.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      accepts: [
        {
          scheme: 'mpp',
          network: 'tempo',
          currency: '0x20C0000000000000000000000000000000000000', // pathUSD
          recipient: process.env.REMLO_TREASURY_ADDRESS ?? '0xeFac4A0cC3D54903746e811f6cd45DD7F43A43a5',
        },
      ],
      openapi: '/openapi.json',
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
