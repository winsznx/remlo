import * as React from 'react'
import { PublicNavbar } from '@/components/layout/PublicNavbar'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      <PublicNavbar />
      <main className="flex-1 pt-24 pb-16 px-6 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
