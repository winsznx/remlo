import * as React from 'react'
import { Hash, Calendar, Building2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { decodeMemo, type MemoFields } from '@/lib/memo'

interface MemoDecoderProps {
  /** Raw 32-byte memo as 0x-prefixed hex */
  memo?: `0x${string}`
  memoHex?: `0x${string}`
  className?: string
}

interface FieldRowProps {
  icon: React.ElementType
  label: string
  value: string
  mono?: boolean
}

function FieldRow({ icon: Icon, label, value, mono = false }: FieldRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border-default)] last:border-0">
      <div className="h-7 w-7 rounded-md bg-[var(--bg-subtle)] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p
          className={cn(
            'text-sm text-[var(--text-primary)] truncate',
            mono && 'font-mono text-[var(--mono)]',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function InvalidMemo({ hex }: { hex: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-2">
      <div className="flex items-center gap-2 text-[var(--status-error)]">
        <Hash className="h-4 w-4" />
        <p className="text-sm font-medium">Invalid memo</p>
      </div>
      <p className="font-mono text-xs text-[var(--text-muted)] break-all">{hex}</p>
    </div>
  )
}

export function MemoDecoder({ memo, memoHex, className }: MemoDecoderProps) {
  const resolvedMemo = memoHex ?? memo
  const decoded: MemoFields | null = React.useMemo(
    () => (resolvedMemo ? decodeMemo(resolvedMemo) : null),
    [resolvedMemo]
  )

  if (!resolvedMemo || !decoded) return <InvalidMemo hex={resolvedMemo ?? 'No memo provided'} />

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-[var(--text-muted)]" />
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            ISO 20022 Memo
          </p>
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {decoded.messageType.toUpperCase()}
        </span>
      </div>

      {/* Fields */}
      <div className="px-4 divide-y divide-[var(--border-default)]">
        <FieldRow icon={Building2} label="Employer ID" value={decoded.employerId} mono />
        <FieldRow icon={User} label="Employee ID" value={decoded.employeeId} mono />
        <FieldRow icon={Calendar} label="Pay period" value={decoded.payPeriod} />
        <FieldRow
          icon={Building2}
          label="Cost center"
          value={decoded.costCenter === 0 ? '—' : String(decoded.costCenter)}
        />
        <FieldRow icon={Hash} label="Record hash" value={`0x${decoded.recordHash}`} mono />
      </div>

      {/* Raw hex */}
      <div className="px-4 py-3 bg-[var(--bg-subtle)] border-t border-[var(--border-default)]">
        <p className="text-xs text-[var(--text-muted)] mb-1">Raw memo</p>
        <p className="font-mono text-xs text-[var(--mono)] break-all">{resolvedMemo}</p>
      </div>
    </div>
  )
}
