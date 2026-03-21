import * as React from 'react'

export default function NewPayrollLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-lg bg-[var(--bg-subtle)]" />
        <div className="space-y-1.5">
          <div className="h-8 w-32 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-4 w-52 rounded bg-[var(--bg-subtle)]" />
        </div>
      </div>
      <div className="max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 space-y-8">
        {/* Step bar */}
        <div className="flex items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <React.Fragment key={i}>
              <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)]" />
              {i < 3 && <div className="flex-1 h-0.5 bg-[var(--bg-subtle)]" />}
            </React.Fragment>
          ))}
        </div>
        {/* Employee rows */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] px-4 py-3.5">
              <div className="h-4 w-4 rounded bg-[var(--bg-subtle)]" />
              <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)]" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-36 rounded bg-[var(--bg-subtle)]" />
                <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
              </div>
              <div className="h-3.5 w-20 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
