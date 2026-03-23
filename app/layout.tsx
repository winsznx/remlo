import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { IBM_Plex_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { PrivyClientProvider } from '@/components/providers/PrivyClientProvider'
import { QueryClientProvider } from '@/components/providers/QueryClientProvider'
import { Toaster } from 'sonner'
import './globals.css'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://remlo-drab.vercel.app'),
  title: 'Remlo — Payroll for the onchain era',
  description:
    'AI-native payroll infrastructure on Tempo. Pay anyone, anywhere, in seconds.',
  openGraph: {
    title: 'Remlo — Payroll for the onchain era',
    description:
      'AI-native payroll infrastructure on Tempo. Pay anyone, anywhere, in seconds.',
    url: '/',
    siteName: 'Remlo',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Remlo — Borderless enterprise payroll on Tempo L1',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Remlo — Payroll for the onchain era',
    description:
      'AI-native payroll infrastructure on Tempo. Pay anyone, anywhere, in seconds.',
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
          </ThemeProvider>
        </PrivyClientProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
