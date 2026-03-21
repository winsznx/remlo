export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-8 w-36 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-4 w-52 rounded bg-[var(--bg-subtle)]" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-[var(--bg-subtle)]" />
      </div>

      {/* 4 metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
              <div className="h-8 w-8 rounded-lg bg-[var(--bg-subtle)]" />
            </div>
            <div className="space-y-1.5">
              <div className="h-8 w-32 rounded-lg bg-[var(--bg-subtle)]" />
              <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Payroll runs + compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
            <div className="h-4 w-36 rounded bg-[var(--bg-subtle)]" />
            <div className="h-4 w-14 rounded bg-[var(--bg-subtle)]" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)] last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-5 w-20 rounded-full bg-[var(--bg-subtle)]" />
                <div className="space-y-1">
                  <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
                  <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>

        {/* Right 1/3 */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="h-4 w-32 rounded bg-[var(--bg-subtle)]" />
            <div className="h-40 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded bg-[var(--bg-subtle)]" />
                  <div className="h-3 w-6 rounded bg-[var(--bg-subtle)]" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-10 w-full rounded-lg bg-[var(--bg-subtle)]" />
        </div>
      </div>

      {/* BarChart */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="h-4 w-48 rounded bg-[var(--bg-subtle)]" />
        <div className="h-52 rounded-lg bg-[var(--bg-subtle)]" />
      </div>
    </div>
  )
}
