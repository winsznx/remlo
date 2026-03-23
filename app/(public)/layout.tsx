import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      <PublicNavbar />
      <main className="flex-1 pt-24 pb-16 px-6 max-w-5xl mx-auto w-full">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to home
        </Link>
        {children}
      </main>
    </div>
  )
}
