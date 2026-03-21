'use client'

import { EmployeeTopNav } from '@/components/employee/EmployeeTopNav'
import { BottomTabNav } from '@/components/employee/BottomTabNav'

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)]">
      <EmployeeTopNav />
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        {children}
      </main>
      <BottomTabNav />
    </div>
  )
}
