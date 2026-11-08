export function DashboardSkeleton() {
  return (
    <div className="page-shell max-w-6xl">
      <div className="mb-6 space-y-2">
        <div className="h-3 w-40 animate-pulse rounded bg-line/70" />
        <div className="h-10 w-72 animate-pulse rounded bg-line/70" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {[180, 220, 200, 200].map((height, index) => (
            <div key={index} className="animate-pulse rounded-3xl border border-line bg-surface p-5" style={{ height }}>
              <div className="h-5 w-40 rounded bg-line/70" />
              <div className="mt-4 h-3 w-full rounded bg-line/50" />
              <div className="mt-2 h-3 w-2/3 rounded bg-line/50" />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          {[300, 220, 200].map((height, index) => (
            <div key={index} className="animate-pulse rounded-3xl border border-line bg-surface p-5" style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  )
}
