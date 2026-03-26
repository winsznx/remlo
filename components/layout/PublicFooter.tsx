import Link from 'next/link'
import { RemloLogo } from '@/components/brand/RemloLogo'

const FOOTER_COLS = [
  {
    label: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    label: 'Developers',
    links: [
      { label: 'API reference', href: 'https://docs.remlo.xyz/docs', external: true },
      { label: 'MPP endpoints', href: 'https://docs.remlo.xyz/docs/mpp-api/overview', external: true },
      { label: 'AgentCash', href: 'https://docs.remlo.xyz/docs/integrations/agentcash', external: true },
      { label: 'GitHub', href: 'https://github.com/winsznx/remlo', external: true },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Press', href: '/press' },
      { label: 'Status', href: '/status' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Cookie Policy', href: '/legal/cookies' },
    ],
  },
]

function FooterLink({
  href,
  label,
  external,
}: {
  href: string
  label: string
  external?: boolean
}) {
  const className = 'text-sm text-white/40 hover:text-white transition-colors'

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}

export function PublicFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 py-16">
      <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center overflow-hidden px-5 sm:px-8 md:top-4 md:px-10 lg:px-14">
        <div
          aria-hidden="true"
          className="select-none whitespace-nowrap text-[30vw] font-semibold uppercase leading-[0.82] tracking-[0.16em] text-white/[0.03] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.82),rgba(0,0,0,0.32),transparent)] md:text-[22vw] md:tracking-[0.2em] lg:text-[18vw]"
        >
          REMLO
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-emerald-400/[0.03] via-transparent to-transparent md:h-40" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <RemloLogo
              className="mb-4"
              markClassName="h-7 w-7"
              labelClassName="text-white text-sm"
            />
            <p className="text-xs text-white/30 leading-relaxed max-w-[180px]">
              Pay faster. Earn more. Settle anywhere.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.label}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
                {col.label}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <p className="text-xs text-white/20">© 2026 Remlo, Inc.</p>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <a
                href="https://tempo.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45 transition-colors hover:border-white/20 hover:text-white/70"
              >
                Built on Tempo
              </a>
              <a
                href="https://stripe.com/bridge"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45 transition-colors hover:border-white/20 hover:text-white/70"
              >
                Stripe Bridge
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/remlo_xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-white/60 transition-colors"
              aria-label="Remlo on X"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com/winsznx/remlo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-white/60 transition-colors"
              aria-label="Remlo on GitHub"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
