export default function TreasuryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-6 w-24 rounded-lg bg-[var(--bg-subtle)]" />
        <div className="h-4 w-56 rounded bg-[var(--bg-subtle)]" />
      </div>
      {/* TreasuryCard */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-5">
        <div className="flex justify-between">
          <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
          <div className="h-3.5 w-8 rounded bg-[var(--bg-subtle)]" />
        </div>
        <div className="h-10 w-44 rounded-lg bg-[var(--bg-subtle)]" />
        <div className="space-y-2">
          <div className="h-1.5 rounded-full bg-[var(--bg-subtle)]" />
          <div className="flex justify-between">
            <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3.5 w-24 rounded bg-[var(--bg-subtle)]" />
          </div>
        </div>
      </div>
      {/* Deposit + Yield */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4">
            <div className="h-4 w-28 rounded bg-[var(--bg-subtle)]" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
                  <div className="h-4 w-40 rounded bg-[var(--bg-subtle)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex gap-4">
          {[16, 32, 24, 20, 16].map((w, i) => (
            <div key={i} className="h-3 rounded bg-[var(--bg-subtle)]" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-default)] last:border-0">
            <div className="h-5 w-16 rounded-full bg-[var(--bg-subtle)]" />
            <div className="flex-1 h-3.5 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-28 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-24 rounded bg-[var(--bg-subtle)]" />
            <div className="ml-auto h-4 w-20 rounded bg-[var(--bg-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
