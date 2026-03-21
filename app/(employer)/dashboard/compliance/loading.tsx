export default function ComplianceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <div className="h-6 w-28 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-4 w-72 rounded bg-[var(--bg-subtle)]" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-[var(--bg-subtle)]" />
      </div>

      {/* 3 summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-3.5 w-24 rounded bg-[var(--bg-subtle)]" />
              <div className="h-8 w-8 rounded-lg bg-[var(--bg-subtle)]" />
            </div>
            <div className="space-y-1">
              <div className="h-8 w-16 rounded-lg bg-[var(--bg-subtle)]" />
              <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Policy panel */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="h-4 w-28 rounded bg-[var(--bg-subtle)]" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 rounded bg-[var(--bg-subtle)]" />
              <div className="h-4 w-20 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <div className="h-4 w-40 rounded bg-[var(--bg-subtle)]" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-default)] last:border-0">
            <div className="flex-1 space-y-1">
              <div className="h-3.5 w-36 rounded bg-[var(--bg-subtle)]" />
              <div className="h-3 w-28 rounded bg-[var(--bg-subtle)]" />
            </div>
            <div className="h-5 w-16 rounded-full bg-[var(--bg-subtle)]" />
            <div className="h-5 w-20 rounded-full bg-[var(--bg-subtle)]" />
            <div className="h-3 w-24 rounded bg-[var(--bg-subtle)]" />
            <div className="flex gap-2">
              <div className="h-4 w-4 rounded bg-[var(--bg-subtle)]" />
              <div className="h-4 w-4 rounded bg-[var(--bg-subtle)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
