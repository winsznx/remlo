import type { NextRequest } from 'next/server'
import { mppx } from '@/lib/mpp'
import { multiRailCharge, type MultiRailChargeOptions } from '@/lib/x402-multi-rail'

/**
 * lib/mpp-route.ts — payment-gated route factories.
 *
 * THIS IS THE ONLY WAY paid endpoints should be authored. The factories
 * absorb the full Next route signature (req + optional ctx with params) and
 * route everything through the payment wrapper FIRST. There is structurally
 * nowhere for an author to insert pre-charge code — query validation, body
 * parsing, auth checks, anything — before the 402 challenge has had a chance
 * to fire.
 *
 * Why this exists: an earlier balance/stream handler validated `employeeId`
 * via Response.json({ status: 400 }) BEFORE the mppx.session wrapper, which
 * meant a discovery probe (no params, no payment) got a 400 instead of a
 * 402+WWW-Authenticate. That broke economic discoverability — agents
 * couldn't learn the price without already knowing the URL contract. The
 * structural fix is to make the wrapper unavoidably outermost.
 *
 * Usage:
 *   export const POST = multiRailRoute({
 *     amount: '0.05',
 *     description: 'Agent-to-agent payment',
 *     handler: async ({ req, params }) => {
 *       // req is the Request the wrapper passed through after charge
 *       // params is whatever the dynamic route declared (or {} for static)
 *       ...
 *       return Response.json({ ok: true })
 *     },
 *   })
 *
 * For Tempo-only state mutations (treasury writes, fiat off-ramp), use
 * `mppRoute`. For SSE/long-running sessions, use `mppSessionRoute`.
 */

export interface RouteContext<P> {
  /**
   * The Request after the payment wrapper has already processed it.
   * For multi-rail, `X-PAYMENT` (Base/Solana) or `Authorization: Payment ...`
   * / legacy `mpp ...` (Tempo) was verified before this handler ran.
   */
  req: Request
  /** Resolved Next.js dynamic route params, or `{}` if the route is static. */
  params: P
}

export type RouteHandler<P> = (ctx: RouteContext<P>) => Promise<Response>

/**
 * Next.js App Router always passes a context object as the second arg to
 * route handlers. For static routes the `params` Promise resolves to an
 * empty object; for dynamic routes it resolves to the path-param record.
 */
type NextRouteCtx<P> = { params: Promise<P> }

async function resolveParams<P>(ctx: NextRouteCtx<P>): Promise<P> {
  if (!ctx?.params) return {} as P
  return ctx.params
}

/**
 * Multi-rail (Tempo + Base + Solana) paid route. Use for read endpoints,
 * agent-to-agent flows, and anything that doesn't move funds out of an
 * employer's Tempo treasury.
 */
export function multiRailRoute<P = Record<string, never>>(options: {
  amount: string
  description?: string
  rails?: MultiRailChargeOptions['rails']
  handler: RouteHandler<P>
}): (req: NextRequest, ctx: NextRouteCtx<P>) => Promise<Response> {
  return async (req, ctx) => {
    return multiRailCharge({
      amount: options.amount,
      description: options.description,
      rails: options.rails,
    })(async (innerReq: Request) => {
      const params = await resolveParams<P>(ctx)
      return options.handler({ req: innerReq, params })
    })(req)
  }
}

/**
 * Tempo-only paid route via mppx.charge. Use for state mutations that touch
 * Tempo treasury balances — payroll execution, fiat off-ramp, treasury
 * rebalance. Charging in another currency for a Tempo state mutation
 * creates a settlement asymmetry, so these endpoints stay single-rail.
 */
export function mppRoute<P = Record<string, never>>(options: {
  amount: string
  handler: RouteHandler<P>
}): (req: NextRequest, ctx: NextRouteCtx<P>) => Promise<Response> {
  return async (req, ctx) => {
    return mppx.charge({ amount: options.amount })(async (innerReq: Request) => {
      const params = await resolveParams<P>(ctx)
      return options.handler({ req: innerReq, params })
    })(req)
  }
}

/**
 * Long-running mppx session — billed per unit (e.g. per second) with a
 * locked reserve. Used for SSE streams where the agent pays incrementally
 * for as long as the connection stays open.
 */
export function mppSessionRoute<P = Record<string, never>>(options: {
  amount: string
  unitType: 'second'
  handler: RouteHandler<P>
}): (req: NextRequest, ctx: NextRouteCtx<P>) => Promise<Response> {
  return async (req, ctx) => {
    return mppx
      .session({ amount: options.amount, unitType: options.unitType })(async (innerReq: Request) => {
        const params = await resolveParams<P>(ctx)
        return options.handler({ req: innerReq, params })
      })(req)
  }
}
