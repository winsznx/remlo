export default function TeamLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-8 w-20 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-4 w-40 rounded bg-[var(--bg-subtle)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-9 w-36 rounded-lg bg-[var(--bg-subtle)]" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
          {[24, 32, 20, 16, 14, 16].map((w, i) => (
            <div key={i} className={`h-3 w-${w} rounded bg-[var(--bg-subtle)]`} style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-default)] last:border-0">
            <div className="h-4 w-4 rounded bg-[var(--bg-subtle)] shrink-0" />
            <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)] shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="h-3.5 w-36 rounded bg-[var(--bg-subtle)]" />
              <div className="h-3 w-28 rounded bg-[var(--bg-subtle)]" />
            </div>
            <div className="h-3 w-6 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-28 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
            <div className="h-5 w-16 rounded-full bg-[var(--bg-subtle)]" />
            <div className="h-5 w-20 rounded-full bg-[var(--bg-subtle)]" />
            <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
            <div className="h-6 w-6 rounded bg-[var(--bg-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
