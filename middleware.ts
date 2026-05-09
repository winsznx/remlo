import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/jwt'

// ─── Bot / social crawler detection ───────────────────────────────────────────

const BOT_UA_PATTERNS = [
  'Twitterbot',
  'facebookexternalhit',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'WhatsApp',
  'Googlebot',
  'bingbot',
  'Applebot',
  'Pinterestbot',
]

function isBotRequest(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') ?? ''
  return BOT_UA_PATTERNS.some((pattern) => ua.includes(pattern))
}

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
  '/support', // Support form must be reachable when a user can't sign in
  '/agents', // Public discovery directory
]

const PUBLIC_PREFIXES = [
  '/invite/',
  '/api/invite/', // invite token validation must be unauthenticated — employee hasn't logged in yet
  '/kyc/',
  '/legal/',
  '/_next/',
  '/agents/', // /agents/register and any future agent sub-pages — all public
  '/api/agents/', // public agent discovery + lookup (free reads)
  '/api/waitlist/', // waitlist subscribe/confirm/unsubscribe — pre-auth
  '/api/support/', // public support ticket submission — must work pre-auth
  '/api/reputation/', // public reputation queries (free, no auth)
  '/api/x402/', // x402 paid endpoints — payment header is the auth
  '/api/webhooks/', // Bridge + Tempo + Resend webhooks — own signature verification
  '/api/cron/', // Cron handlers do their own timing-safe CRON_SECRET check; Vercel Cron has no cookie
  '/api/openapi.json', // OpenAPI discovery doc must be publicly accessible for MPPscan
  '/.well-known/', // x402 payment discovery
  '/api/mpp/', // MPP endpoints are pay-per-call — payment header is the auth
  '/api/mcp', // MCP server — bearer auth handled inside the route, not at middleware
  '/api/oauth/', // OAuth 2.1 endpoints — DCR, authorize, consent, token. Unauth by design.
  '/oauth/', // OAuth consent UI — Privy session checked client-side
  '/api/demo/', // Demo endpoints are public — used by unauthenticated pitch pages
  '/dev/', // Reference implementations (e.g. Lit signing architecture demo) — publicly shareable
  '/opengraph-image', // OG image must be public for social link previews
  '/twitter-image', // Twitter card image must be public for social link previews
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
  const isAdmin = adminIds.includes(userId)

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

    // Prefer operational role (employer/employee) for routing — an admin who
    // also runs an employer should land on their dashboard. Admin powers are
    // additive and remain enforced separately by isPlatformAdminUserId on
    // API routes; the middleware fix above also lets platform_admin pass
    // through every section.
    if (Array.isArray(employers) && employers.length > 0) return 'employer'
    if (Array.isArray(employees) && employees.length > 0) return 'employee'
    if (isAdmin) return 'platform_admin'
  } catch {
    // Supabase unreachable — fail open so we don't lock users out
    return isAdmin ? 'platform_admin' : null
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

  // Social crawlers / bots must pass through ALL routes without auth redirects
  // so they can fetch OG meta tags for link previews on every URL.
  if (isBotRequest(request)) {
    return NextResponse.next()
  }

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
      const decoded = privyToken ? await verifyPrivyToken(privyToken) : null
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
  // Note: API routes also have their own auth via lib/auth.ts using the
  // Authorization: Bearer header (not cookies). Middleware here is a
  // best-effort cookie-based gate for browser navigations; the route
  // handlers are the actual security boundary.
  const privyToken =
    request.cookies.get('privy-token')?.value ??
    request.cookies.get('privy_token')?.value
  const decoded = privyToken ? await verifyPrivyToken(privyToken) : null

  if (!decoded) {
    // For API routes: let the request through so the route handler can
    // return its own JSON 401 via getPrivyClaims (which reads the
    // Authorization header, not cookies). Redirecting to /login would
    // emit HTML, which API consumers cannot parse.
    if (pathname.startsWith('/api/')) {
      return NextResponse.next()
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Role-gated sections.
  // Platform admins can access every section (operational oversight + can
  // also wear an employer hat). Employer/employee roles are restricted to
  // their own section.
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/admin')
  ) {
    const adminIds = process.env.ADMIN_USER_IDS?.split(',').map((s) => s.trim()) ?? []
    const isAdmin = adminIds.includes(decoded.sub)

    // Admins pass through every section.
    if (isAdmin) return NextResponse.next()

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

    if (pathname.startsWith('/admin')) {
      // Non-admin trying to reach /admin — log + redirect.
      // We use console.warn (not the audit table) here because middleware
      // runs in the edge runtime where the supabase client isn't loaded.
      // A separate cron / log scraper can roll these into the audit log.
      console.warn('[admin-access] denied', {
        userId: decoded.sub,
        path: pathname,
        ip:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          request.headers.get('x-real-ip') ??
          null,
        role,
      })
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
