import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { IBM_Plex_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { PrivyClientProvider } from '@/components/providers/PrivyClientProvider'
import { QueryClientProvider } from '@/components/providers/QueryClientProvider'
import { CookieConsentProvider } from '@/components/legal/CookieConsentProvider'
import { Toaster } from 'sonner'
import './globals.css'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://remlo.xyz'),
  title: 'Payroll APIs for AI agents | Remlo',
  description:
    'One Remlo API surface for Tempo MPP and Solana/Base x402. AI agents pay per call to trigger compliant payroll actions, escrow, reputation, and treasury workflows over HTTP 402.',
  openGraph: {
    title: 'Payroll APIs for AI agents | Remlo',
    description:
      'One Remlo API surface for Tempo MPP and Solana/Base x402. AI agents pay per call to trigger compliant payroll actions, escrow, reputation, and treasury workflows over HTTP 402.',
    url: '/',
    siteName: 'Remlo',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Remlo — payroll APIs for AI agents across Tempo MPP and Solana x402',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Payroll APIs for AI agents | Remlo',
    description:
      'One Remlo API surface for Tempo MPP and Solana/Base x402. AI agents pay per call to trigger compliant payroll actions, escrow, reputation, and treasury workflows over HTTP 402.',
    images: ['/twitter-image'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={GeistSans.variable}
      suppressHydrationWarning
    >
      <body className={`${ibmPlexMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <QueryClientProvider>
        <PrivyClientProvider>
          <ThemeProvider>
            <CookieConsentProvider>
              {children}
              <Toaster
                position="bottom-right"
                duration={4000}
                toastOptions={{
                  style: {
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  },
                }}
              />
            </CookieConsentProvider>
          </ThemeProvider>
        </PrivyClientProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
