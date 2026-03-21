'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'

export default function PayrollHistoryPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Payroll</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            View and manage all past payroll runs
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/payroll/new')}
          className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 gap-2 w-full min-[400px]:w-auto"
        >
          <Plus className="h-4 w-4" />
          Run Payroll
        </Button>
      </div>

      <EmptyState
        icon={<Banknote className="h-8 w-8 text-[var(--text-muted)]" />}
        title="No payroll history"
        description="Your payroll history will appear here once you complete your first run."
        action={
          <Button
            onClick={() => router.push('/dashboard/payroll/new')}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 gap-2 w-full min-[400px]:w-auto"
          >
            <Plus className="h-4 w-4" />
            Run Payroll
          </Button>
        }
      />
    </div>
  )
}
