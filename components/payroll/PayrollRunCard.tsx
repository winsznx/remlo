'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'
import { PayrollBadge } from '@/components/employee/PayrollBadge'
import { cn } from '@/lib/utils'

interface PayrollRunCardProps {
  id: string
  status: 'draft' | 'pending' | 'processing' | 'completed' | 'failed'
  totalAmount: number
  employeeCount: number
  createdAt: string
  className?: string
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export function PayrollRunCard({
  id,
  status,
  totalAmount,
  employeeCount,
  createdAt,
  className,
}: PayrollRunCardProps) {
  return (
    <Link
      href={`/dashboard/payroll/${id}`}
      className={cn(
        'group flex items-center justify-between px-4 py-3.5 rounded-lg transition-colors',
        'border border-[var(--border-default)] hover:border-[var(--border-strong)]',
        'bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <PayrollBadge status={status} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {formatDate(createdAt)}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Users className="h-3 w-3 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">{employeeCount} employees</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
          {formatCurrency(totalAmount)}
        </span>
        <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
      </div>
    </Link>
  )
}
