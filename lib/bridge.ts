/**
 * lib/bridge.ts — Bridge API client wrapper.
 * All Bridge calls must go through this module. Never call Bridge directly from components.
 * Base URL switches between production and sandbox based on NODE_ENV.
 */

const BRIDGE_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api.bridge.xyz/v0'
    : 'https://api.sandbox.bridge.xyz/v0'

export async function bridgeRequest<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BRIDGE_BASE}${path}`, {
    ...options,
    headers: {
      'Api-Key': process.env.BRIDGE_API_KEY!,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bridge API ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Employer KYB ──────────────────────────────────────────────────────────────

export interface BridgeCustomer {
  id: string
  type: 'individual' | 'business'
  status: string
  email: string
}

export async function createEmployerCustomer(opts: {
  companyName: string
  email: string
  idempotencyKey: string
}): Promise<BridgeCustomer> {
  return bridgeRequest<BridgeCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({ type: 'business', company_name: opts.companyName, email: opts.email }),
    headers: { 'Idempotency-Key': opts.idempotencyKey },
  })
}

// ── Virtual Account (deposit) ─────────────────────────────────────────────────

export interface BridgeVirtualAccount {
  id: string
  account_number: string
  routing_number: string
  bank_name: string
  swift_bic?: string
}

export async function createVirtualAccount(opts: {
  customerId: string
  currency: string
  idempotencyKey: string
}): Promise<BridgeVirtualAccount> {
  return bridgeRequest<BridgeVirtualAccount>(
    `/customers/${opts.customerId}/virtual_accounts`,
    {
      method: 'POST',
      body: JSON.stringify({ currency: opts.currency, destination: 'usdb' }),
      headers: { 'Idempotency-Key': opts.idempotencyKey },
    }
  )
}

// ── Visa Card issuance ────────────────────────────────────────────────────────

export interface BridgeCardAccount {
  id: string
  card_number_last4: string
  expiration_month: number
  expiration_year: number
  status: string
}

export async function issueCard(opts: {
  customerId: string
  idempotencyKey: string
}): Promise<BridgeCardAccount> {
  return bridgeRequest<BridgeCardAccount>(
    `/customers/${opts.customerId}/card_accounts`,
    {
      method: 'POST',
      body: JSON.stringify({ card_type: 'prepaid_debit', currency: 'usd' }),
      headers: { 'Idempotency-Key': opts.idempotencyKey },
    }
  )
}

// ── Off-ramp transfer ─────────────────────────────────────────────────────────

export interface BridgeTransfer {
  id: string
  status: string
  amount: string
  currency: string
  created_at: string
}

export async function createOffRampTransfer(opts: {
  customerId: string
  amount: string
  currency: string
  destinationType: 'ach' | 'sepa' | 'spei' | 'pix'
  bankAccountId: string
  idempotencyKey: string
}): Promise<BridgeTransfer> {
  return bridgeRequest<BridgeTransfer>('/transfers', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: opts.customerId,
      amount: opts.amount,
      currency: opts.currency,
      source: { payment_rail: 'bridge_wallet' },
      destination: {
        payment_rail: opts.destinationType,
        bank_account_id: opts.bankAccountId,
      },
    }),
    headers: { 'Idempotency-Key': opts.idempotencyKey },
  })
}
