export default function ApiAccessLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-6 w-28 rounded-lg bg-[var(--bg-subtle)]" />
        <div className="h-4 w-64 rounded bg-[var(--bg-subtle)]" />
      </div>

      {/* Pricing tiles */}
      <div className="space-y-3">
        <div className="h-4 w-16 rounded bg-[var(--bg-subtle)]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
              <div className="h-4 w-24 rounded bg-[var(--bg-subtle)]" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="flex justify-between">
                    <div className="space-y-1">
                      <div className="h-3 w-24 rounded bg-[var(--bg-subtle)]" />
                      <div className="h-3 w-40 rounded bg-[var(--bg-subtle)]" />
                    </div>
                    <div className="h-4 w-12 rounded bg-[var(--bg-subtle)]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent key + sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="h-4 w-28 rounded bg-[var(--bg-subtle)]" />
          <div className="h-4 w-64 rounded bg-[var(--bg-subtle)]" />
          <div className="h-9 w-36 rounded-lg bg-[var(--bg-subtle)]" />
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="h-4 w-32 rounded bg-[var(--bg-subtle)]" />
          <div className="h-24 rounded-lg bg-[var(--bg-subtle)]" />
        </div>
      </div>

      {/* Terminal */}
      <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
        <div className="h-10 bg-[var(--bg-subtle)]" />
        <div className="h-48 bg-background" />
      </div>
    </div>
  )
}
