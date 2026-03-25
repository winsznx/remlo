import { NextResponse } from 'next/server'

/**
 * GET /.well-known/x402
 * MPP/x402 payment method discovery endpoint.
 * Advertises that this origin accepts MPP payments via USDC.e on Tempo mainnet.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      accepts: [
        {
          scheme: 'mpp',
          network: 'tempo',
          currency: '0x20C000000000000000000000b9537d11c60E8b50', // USDC.e (Stargate USDC, Tempo mainnet)
          recipient: process.env.REMLO_TREASURY_ADDRESS ?? '0xeFac4A0cC3D54903746e811f6cd45DD7F43A43a5',
        },
      ],
      openapi: '/api/openapi.json',
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
