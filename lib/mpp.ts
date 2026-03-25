import { Mppx, tempo } from 'mppx/nextjs'

/**
 * lib/mpp.ts — single-charge mppx server instance (Tempo rail only).
 * Used for all 12 MPP endpoints by default.
 * Import `mppx` and call `mppx.charge({ amount: '0.01' })` in route handlers.
 */
export const mppx = Mppx.create({
  realm: 'www.remlo.xyz',
  methods: [
    tempo({
      chainId: 4217, // Tempo mainnet — indexed by MPPscan
      currency: '0x20C000000000000000000000b9537d11c60E8b50', // USDC.e (Stargate USDC)
      recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
    }),
  ],
})
