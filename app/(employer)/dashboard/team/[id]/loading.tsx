export default function EmployeeDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-lg bg-[var(--bg-subtle)]" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[var(--bg-subtle)]" />
          <div className="space-y-1.5">
            <div className="h-5 w-40 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="h-9 w-64 rounded-lg bg-[var(--bg-subtle)]" />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="h-4 w-32 rounded bg-[var(--bg-subtle)]" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
                  <div className="h-4 w-40 rounded bg-[var(--bg-subtle)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
