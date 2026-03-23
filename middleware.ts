import { NextRequest, NextResponse } from 'next/server'

// ─── Public path classification ───────────────────────────────────────────────

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/pricing',
  '/docs',
  '/blog',
  '/about',
  '/careers',
  '/changelog',
  '/contact',
  '/press',
  '/status',
]

const PUBLIC_PREFIXES = [
  '/invite/',
  '/kyc/',
  '/legal/',
  '/_next/',
  '/api/webhooks/', // Bridge + Tempo webhooks must be unauthenticated
]

function isPublic(pathname: string): boolean {
  return (
    pathname === '/' ||
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    /\.(ico|png|svg|jpg|jpeg|css|js|woff2?)$/.test(pathname)
  )
}

// Auth-flow routes: no auth required, but redirect out if already confirmed logged in
const AUTH_ROUTES = ['/login', '/register']

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((p) => pathname === p)
}

// ─── JWT decode (edge-safe, no crypto verify) ─────────────────────────────────

/**
 * Decode Privy JWT payload without signature verification.
 * Edge runtime cannot run the full crypto verify — verification
 * happens in individual API routes that need security guarantees.
 * Here we only need the user DID for role-based routing.
 */
function decodePrivyToken(token: string): { sub: string } | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = JSON.parse(atob(padded)) as { sub?: string; exp?: number }
    if (!decoded.sub) return null
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null
    return { sub: decoded.sub }
  } catch {
    return null
  }
}

// ─── Role resolution ──────────────────────────────────────────────────────────

type Role = 'employer' | 'employee' | 'platform_admin' | null

/**
 * Determine user role via Supabase REST API (no client library —
 * avoids edge runtime compatibility issues with supabase-js).
 */
async function getUserRole(userId: string): Promise<Role> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) return null

  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map((s) => s.trim()) ?? []
  if (adminIds.includes(userId)) return 'platform_admin'

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: 'application/json',
  }

  try {
    const [employerRes, employeeRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/employers?owner_user_id=eq.${encodeURIComponent(userId)}&active=eq.true&select=id&limit=1`,
        { headers }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/employees?user_id=eq.${encodeURIComponent(userId)}&active=eq.true&select=id&limit=1`,
        { headers }
      ),
    ])

    const [employers, employees] = await Promise.all([
      employerRes.ok ? (employerRes.json() as Promise<unknown[]>) : Promise.resolve([]),
      employeeRes.ok ? (employeeRes.json() as Promise<unknown[]>) : Promise.resolve([]),
    ])

    if (Array.isArray(employers) && employers.length > 0) return 'employer'
    if (Array.isArray(employees) && employees.length > 0) return 'employee'
  } catch {
    // Supabase unreachable — fail open so we don't lock users out
    return null
  }

  return null
}

function roleHome(role: Role): string {
  switch (role) {
    case 'employer':
      return '/dashboard'
    case 'employee':
      return '/portal'
    case 'platform_admin':
      return '/admin'
    default:
      // Authenticated but no role means the user never completed registration.
      // Send to /register (a public path) so they can create their account.
      // Never send to /login — that creates an infinite loop because the login
      // page immediately pushes back to /dashboard on authenticated=true.
      return '/register'
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass all public paths through immediately — no auth check whatsoever.
  // This MUST be first. Includes /login, /register, /_next/, /api/webhooks/, etc.
  if (isPublic(pathname)) {
    // Special case: if this is an auth route (/login, /register) and the user
    // has a confirmed valid session with a resolved role, redirect them to their
    // home rather than showing the login page again. Only redirect when role is
    // non-null to avoid /login → /login loops for unregistered/new users.
    if (isAuthRoute(pathname)) {
      const privyToken =
        request.cookies.get('privy-token')?.value ??
        request.cookies.get('privy_token')?.value
      const decoded = privyToken ? decodePrivyToken(privyToken) : null
      if (decoded) {
        const role = await getUserRole(decoded.sub)
        if (role) {
          const homeUrl = request.nextUrl.clone()
          homeUrl.pathname = roleHome(role)
          return NextResponse.redirect(homeUrl)
        }
      }
    }
    return NextResponse.next()
  }

  // All remaining paths are protected. Resolve authentication.
  const privyToken =
    request.cookies.get('privy-token')?.value ??
    request.cookies.get('privy_token')?.value
  const decoded = privyToken ? decodePrivyToken(privyToken) : null

  if (!decoded) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Role-gated sections
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/admin')
  ) {
    const role = await getUserRole(decoded.sub)

    if (pathname.startsWith('/dashboard') && role !== 'employer') {
      const redirect = request.nextUrl.clone()
      redirect.pathname = roleHome(role)
      return NextResponse.redirect(redirect)
    }

    if (pathname.startsWith('/portal') && role !== 'employee') {
      const redirect = request.nextUrl.clone()
      redirect.pathname = roleHome(role)
      return NextResponse.redirect(redirect)
    }

    if (pathname.startsWith('/admin') && role !== 'platform_admin') {
      const redirect = request.nextUrl.clone()
      redirect.pathname = roleHome(role)
      return NextResponse.redirect(redirect)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * The isPublic() function above provides the authoritative public-path
     * list — the matcher just prevents middleware from running on raw static
     * asset paths that Next.js handles internally before middleware fires.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
