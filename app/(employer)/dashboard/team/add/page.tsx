'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AddEmployeePage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Team
        </Button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          Add Employee
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Invite an employee or contractor to your organization
        </p>
      </div>
      
      <div className="p-10 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] flex flex-col items-center text-center">
        <UserPlus className="h-10 w-10 text-[var(--text-muted)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)]">Onboarding Flow Pending</h3>
        <p className="text-[var(--text-secondary)] text-sm mt-2 max-w-sm">
          The data integration form for Bridge compliance and manual creation is pending.
        </p>
      </div>
    </div>
  )
}
