import { Mppx, tempo } from 'mppx/server'
import { stripe } from 'mppx/stripe/server'

/**
 * lib/mpp-multirail.ts — dual-rail mppx (Tempo + Stripe SPT).
 * Used only on endpoints explicitly listed in Phase 6 (T-MPP-7 onwards)
 * where Stripe fallback is required.
 * Import `mppxMultiRail` instead of `mppx` in those specific route handlers.
 */
export const mppxMultiRail = Mppx.create({
  realm: 'www.remlo.xyz',
  methods: [
    tempo({
      chainId: 4217, // Tempo mainnet
      currency: '0x20C000000000000000000000b9537d11c60E8b50', // USDC.e (Stargate USDC)
      recipient: process.env.REMLO_TREASURY_ADDRESS as `0x${string}`,
    }),
    stripe({
      networkId: 'internal',
      paymentMethodTypes: ['card', 'link'],
      secretKey: process.env.STRIPE_SECRET_KEY!,
    }),
  ],
  secretKey: process.env.MPP_SECRET_KEY!,
})
