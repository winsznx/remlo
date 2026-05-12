import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { WaitlistForm } from '@/components/marketing/WaitlistForm'
import { WaitlistConfirmedBanner } from '@/components/marketing/WaitlistConfirmedBanner'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.remlo.xyz').replace(/\/$/, '')

/**
 * /waitlist — direct-link entry point for the launch waitlist.
 *
 * The landing page already hosts the same form in a marketing surround;
 * this page is the version we share in tweets, DMs, and short links —
 * landing on it should make exactly one thing obvious: drop email, get
 * confirmation, done. No nav, no scroll-bait, no other CTAs.
 *
 * Source is tagged separately ('waitlist-page' vs 'landing') so the admin
 * stats panel can attribute signups to the channel that drove them.
 */
export const metadata: Metadata = {
  title: 'Join the Remlo waitlist',
  description:
    'Get early access to Remlo: payroll APIs for AI agents across Tempo MPP and Solana/Base x402, with escrow, reputation, and treasury workflows over HTTP 402.',
  openGraph: {
    title: 'Join the Remlo waitlist',
    description:
      'Get early access to payroll APIs for AI agents across Tempo MPP and Solana/Base x402.',
    url: `${APP_URL}/waitlist`,
    siteName: 'Remlo',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'Join the Remlo waitlist for payroll APIs across Tempo MPP and Solana x402',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join the Remlo waitlist',
    description: 'Get early access to payroll APIs for AI agents across Tempo MPP and Solana/Base x402.',
    images: [`${APP_URL}/twitter-image`],
  },
  alternates: {
    canonical: `${APP_URL}/waitlist`,
  },
}

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] px-6 py-12 sm:py-20">
      <WaitlistConfirmedBanner />
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to remlo.xyz
        </Link>

        <div className="mt-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Mainnet launch
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Be first when Remlo opens to production payroll.
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)] leading-relaxed">
            Tempo + Solana settlement, agent rails, ERC-8004 reputation, Bridge fiat off-ramp — live on testnets today. Drop your email and we&apos;ll let you know the moment your team can move from sandbox to production.
          </p>
        </div>

        <div className="mt-8">
          <WaitlistForm
            source="waitlist-page"
            variant="card"
            heading="Join the launch waitlist"
            description="One confirmation email. We use it to send launch news, early-access invites, and nothing else."
            ctaLabel="Notify me"
          />
        </div>

        <p className="mt-8 text-center text-[11px] leading-snug text-[var(--text-muted)]">
          Already on the list? You&apos;ll get the launch email automatically. To unsubscribe, use the link at the bottom of any Remlo email.
        </p>
      </div>
    </main>
  )
}
