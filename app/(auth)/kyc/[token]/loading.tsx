export default function KycLoadingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
              <div className="h-5 w-36 animate-pulse rounded bg-[var(--bg-subtle)]" />
              <div className="h-10 w-full animate-pulse rounded bg-[var(--bg-subtle)]" />
              <div className="h-10 w-4/5 animate-pulse rounded bg-[var(--bg-subtle)]" />
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] p-5 sm:p-6">
              <div className="space-y-3">
                <div className="h-4 w-28 animate-pulse rounded bg-[var(--bg-subtle)]" />
                <div className="h-20 w-full animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--bg-subtle)]" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--bg-subtle)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
