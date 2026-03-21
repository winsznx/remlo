'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PayrollRunDetailsPage({ params }: { params: Promise<{ runId: string }> }) {
  const router = useRouter()
  // Next.js 15 requires params to be a Promise, unwrapped with React.use()
  const resolvedParams = React.use(params)
  const runId = resolvedParams.runId

  return (
    <div className="space-y-6">
      <div>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Payroll
        </Button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Payroll Run Details
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Viewing receipt {runId}
        </p>
      </div>
      
      <div className="p-6 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]">
        <p className="text-[var(--text-secondary)]">
          The itemized employee payout list for this run will be implemented in a subsequent stage.
        </p>
      </div>
    </div>
  )
}
