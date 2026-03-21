export default function PortalLoading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Balance card */}
      <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 space-y-4">
        <div className="h-3 w-28 rounded bg-[var(--bg-subtle)]" />
        <div className="h-10 w-48 rounded bg-[var(--bg-subtle)]" />
        <div className="h-3 w-32 rounded bg-[var(--bg-subtle)]" />
      </div>

      {/* Section label */}
      <div className="h-4 w-32 rounded bg-[var(--bg-subtle)] mt-6" />

      {/* Transaction rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-[var(--border-default)] last:border-0">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
          </div>
          <div className="h-4 w-16 rounded bg-[var(--bg-subtle)]" />
        </div>
      ))}
    </div>
  )
}
