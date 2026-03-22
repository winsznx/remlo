import { Mppx, tempo, stripe } from 'mppx/nextjs'

/**
 * lib/mpp-multirail.ts — dual-rail mppx (Tempo + Stripe SPT).
 * Used only on endpoints explicitly listed in Phase 6 (T-MPP-7 onwards)
 * where Stripe fallback is required.
 * Import `mppxMultiRail` instead of `mppx` in those specific route handlers.
 */
export const mppxMultiRail = Mppx.create({
  methods: [
    tempo({
      currency: '0x20C0000000000000000000000000000000000000', // pathUSD
      recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
    }),
    stripe.charge({
      networkId: 'internal',
      paymentMethodTypes: ['card', 'link'],
      secretKey: process.env.STRIPE_SECRET_KEY!,
    }),
  ],
  secretKey: process.env.MPP_SECRET_KEY!,
})
