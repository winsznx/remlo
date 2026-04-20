export default function AgentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-36 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-4 w-72 rounded bg-[var(--bg-subtle)]" />
        </div>
        <div className="h-9 w-32 rounded-md bg-[var(--bg-subtle)]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-5 w-28 rounded-full bg-[var(--bg-subtle)]" />
                <div className="flex-1" />
                <div className="h-4 w-16 rounded bg-[var(--bg-subtle)]" />
              </div>
              <div className="h-4 w-full rounded bg-[var(--bg-subtle)]" />
              <div className="h-2 w-24 rounded-full bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4 h-fit">
          <div className="h-4 w-20 rounded bg-[var(--bg-subtle)]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-28 rounded bg-[var(--bg-subtle)]" />
              <div className="h-5 w-12 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
