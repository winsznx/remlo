import { createServerClient } from '@/lib/supabase-server'
import { bridgeRequest } from '@/lib/bridge'
import type { Database } from '@/lib/database.types'

type EmployeeRow = Database['public']['Tables']['employees']['Row']

export interface CreateEmployeeInviteInput {
  employerId: string
  companyName: string
  email: string
  appUrl?: string
  firstName?: string
  lastName?: string
  jobTitle?: string
  department?: string
  countryCode?: string
  salaryAmount?: number
  salaryCurrency?: string
  payFrequency?: string
}

export interface CreateEmployeeInviteResult {
  employeeId: string
  inviteUrl: string
  kycUrl: string | null
  bridgeCustomerId: string | null
  emailSent: boolean
  existing: boolean
}

interface KycLink {
  url: string
}

interface BridgeCustomer {
  id: string
}

function getAppUrl(appUrlOverride?: string) {
  return (appUrlOverride ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://remlo.xyz').replace(/\/$/, '')
}

export function getEmployeeInviteUrl(employeeId: string, appUrlOverride?: string) {
  return `${getAppUrl(appUrlOverride)}/invite/${employeeId}`
}

export async function ensureEmployeeKycLink(
  employee: Pick<EmployeeRow, 'id' | 'email' | 'first_name' | 'last_name' | 'bridge_customer_id'>,
  appUrlOverride?: string
): Promise<{ kycUrl: string; customerId: string } | null> {
  if (!process.env.BRIDGE_API_KEY) {
    return null
  }

  const supabase = createServerClient()
  const redirectUri = `${getAppUrl(appUrlOverride)}/kyc/${employee.id}?status=complete`

  if (employee.bridge_customer_id) {
    const link = await bridgeRequest<KycLink>('/kyc_links', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: employee.bridge_customer_id,
        type: 'individual',
        redirect_uri: redirectUri,
      }),
      headers: { 'Idempotency-Key': `kyc-${employee.id}-${Date.now()}` },
    })

    return { kycUrl: link.url, customerId: employee.bridge_customer_id }
  }

  const customer = await bridgeRequest<BridgeCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      type: 'individual',
      email: employee.email,
      first_name: employee.first_name ?? undefined,
      last_name: employee.last_name ?? undefined,
    }),
    headers: { 'Idempotency-Key': `customer-${employee.id}` },
  })

  await supabase
    .from('employees')
    .update({ bridge_customer_id: customer.id })
    .eq('id', employee.id)

  const link = await bridgeRequest<KycLink>('/kyc_links', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customer.id,
      type: 'individual',
      redirect_uri: redirectUri,
    }),
    headers: { 'Idempotency-Key': `kyc-${employee.id}` },
  })

  return { kycUrl: link.url, customerId: customer.id }
}

export async function sendEmployeeInviteEmail(opts: {
  to: string
  firstName?: string
  companyName: string
  employeeId: string
  appUrl?: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  const inviteUrl = getEmployeeInviteUrl(opts.employeeId, opts.appUrl)
  const firstName = opts.firstName || 'there'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Remlo <no-reply@remlo.app>',
        to: opts.to,
        subject: `${opts.companyName} invited you to Remlo`,
        html: [
          `<p>Hi ${firstName},</p>`,
          `<p>${opts.companyName} uses Remlo to pay their team. Click the link below to set up your account and receive your salary directly to your digital wallet.</p>`,
          `<p><a href="${inviteUrl}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Accept invite</a></p>`,
          `<p style="color:#94A3B8;font-size:12px;">This link is unique to you. Do not share it.</p>`,
        ].join(''),
      }),
    })

    return res.ok
  } catch {
    return false
  }
}

export async function createEmployeeInvite(
  input: CreateEmployeeInviteInput
): Promise<CreateEmployeeInviteResult> {
  const supabase = createServerClient()
  const normalizedEmail = input.email.trim().toLowerCase()

  const { data: existing, error: existingError } = await supabase
    .from('employees')
    .select('id, email, first_name, last_name, bridge_customer_id')
    .eq('employer_id', input.employerId)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing) {
    let kycUrl: string | null = null
    let bridgeCustomerId = existing.bridge_customer_id

    try {
      const kyc = await ensureEmployeeKycLink(existing, input.appUrl)
      kycUrl = kyc?.kycUrl ?? null
      bridgeCustomerId = kyc?.customerId ?? bridgeCustomerId
    } catch {
      kycUrl = null
    }

    return {
      employeeId: existing.id,
      inviteUrl: getEmployeeInviteUrl(existing.id, input.appUrl),
      kycUrl,
      bridgeCustomerId,
      emailSent: false,
      existing: true,
    }
  }

  const { data: created, error: createError } = await supabase
    .from('employees')
    .insert({
      employer_id: input.employerId,
      email: normalizedEmail,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      job_title: input.jobTitle ?? null,
      department: input.department ?? null,
      country_code: input.countryCode ?? null,
      salary_amount: input.salaryAmount ?? null,
      salary_currency: input.salaryCurrency ?? 'USD',
      pay_frequency: input.payFrequency ?? 'monthly',
      kyc_status: 'pending',
      active: true,
      invited_at: new Date().toISOString(),
    })
    .select('id, email, first_name, last_name, bridge_customer_id')
    .single()

  if (createError || !created) {
    throw new Error(createError?.message ?? 'Failed to create employee')
  }

  let kycUrl: string | null = null
  let bridgeCustomerId = created.bridge_customer_id

  try {
    const kyc = await ensureEmployeeKycLink(created, input.appUrl)
    kycUrl = kyc?.kycUrl ?? null
    bridgeCustomerId = kyc?.customerId ?? bridgeCustomerId
  } catch {
    kycUrl = null
  }

  const emailSent = await sendEmployeeInviteEmail({
    to: normalizedEmail,
    firstName: input.firstName,
    companyName: input.companyName,
    employeeId: created.id,
    appUrl: input.appUrl,
  })

  return {
    employeeId: created.id,
    inviteUrl: getEmployeeInviteUrl(created.id, input.appUrl),
    kycUrl,
    bridgeCustomerId,
    emailSent,
    existing: false,
  }
}
