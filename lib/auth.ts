/**
 * lib/auth.ts — server-side auth helpers for API route handlers.
 * Decodes Privy JWT Bearer tokens and resolves the caller's employer/employee record.
 */
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { Database } from '@/lib/database.types'

export type Employer = Database['public']['Tables']['employers']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']

export interface PrivyClaims {
  sub: string
  exp?: number
}

function getAdminUserIds() {
  return (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function isPlatformAdminUserId(userId: string | null | undefined) {
  if (!userId) return false
  return getAdminUserIds().includes(userId)
}

export function decodePrivyToken(token: string): PrivyClaims | null {
  try {
    const [, payload] = token.split('.')
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = JSON.parse(atob(padded)) as { sub?: string; exp?: number }
    if (!decoded.sub) return null
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null
    return { sub: decoded.sub, exp: decoded.exp }
  } catch {
    return null
  }
}

/** Extract Privy claims from the Authorization: Bearer header. */
export function getPrivyClaims(req: NextRequest): PrivyClaims | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return decodePrivyToken(authHeader.slice(7))
}

export async function getCallerAdmin(req: NextRequest): Promise<PrivyClaims | null> {
  const claims = getPrivyClaims(req)
  if (!claims) return null
  if (!isPlatformAdminUserId(claims.sub)) return null
  return claims
}

/** Resolve the employer record for the authenticated caller. */
export async function getCallerEmployer(req: NextRequest): Promise<Employer | null> {
  const claims = getPrivyClaims(req)
  if (!claims) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('employers')
    .select('*')
    .eq('owner_user_id', claims.sub)
    .eq('active', true)
    .maybeSingle()

  return data ?? null
}

/** Resolve the employee record for the authenticated caller. */
export async function getCallerEmployee(req: NextRequest): Promise<Employee | null> {
  const claims = getPrivyClaims(req)
  if (!claims) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', claims.sub)
    .eq('active', true)
    .maybeSingle()

  return data ?? null
}

/** Resolve the employer by ID, verifying the caller is the owner. */
export async function getAuthorizedEmployer(
  req: NextRequest,
  employerId: string
): Promise<Employer | null> {
  const claims = getPrivyClaims(req)
  if (!claims) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('employers')
    .select('*')
    .eq('id', employerId)
    .eq('owner_user_id', claims.sub)
    .eq('active', true)
    .maybeSingle()

  return data ?? null
}

/** Resolve the employee by ID, verifying the caller owns that employee record. */
export async function getAuthorizedEmployee(
  req: NextRequest,
  employeeId: string
): Promise<Employee | null> {
  const claims = getPrivyClaims(req)
  if (!claims) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .eq('user_id', claims.sub)
    .eq('active', true)
    .maybeSingle()

  return data ?? null
}
