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
  title: 'Remlo — Payroll for the onchain era',
  description:
    'AI-native payroll infrastructure on Tempo. Pay anyone, anywhere, in seconds.',
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
      <body className={`${ibmPlexMono.variable} font-sans antialiased`}>
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
