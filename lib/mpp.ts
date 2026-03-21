import { Mppx, tempo } from 'mppx/nextjs'

/**
 * lib/mpp.ts — single-charge mppx server instance (Tempo rail only).
 * Used for all 12 MPP endpoints by default.
 * Import `mppx` and call `mppx.charge({ amount: '0.01' })` in route handlers.
 */
export const mppx = Mppx.create({
  methods: [
    tempo({
      currency: '0x20C0000000000000000000000000000000000000', // pathUSD
      recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
    }),
  ],
})
