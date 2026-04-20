export default function SolanaLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-6 w-32 rounded-lg bg-[var(--bg-subtle)]" />
        <div className="h-4 w-64 rounded bg-[var(--bg-subtle)]" />
      </div>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="h-3.5 w-24 rounded bg-[var(--bg-subtle)]" />
            <div className="h-10 w-40 rounded-lg bg-[var(--bg-subtle)]" />
          </div>
          <div className="space-y-3">
            <div className="h-3.5 w-24 rounded bg-[var(--bg-subtle)]" />
            <div className="h-10 w-40 rounded-lg bg-[var(--bg-subtle)]" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4">
          <div className="h-4 w-24 rounded bg-[var(--bg-subtle)]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
              <div className="h-5 w-16 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4">
          <div className="h-4 w-40 rounded bg-[var(--bg-subtle)]" />
          <div className="h-24 rounded bg-[var(--bg-subtle)]" />
        </div>
      </div>
    </div>
  )
}
