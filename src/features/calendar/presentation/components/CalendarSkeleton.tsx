export function CalendarSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-line bg-surface p-5">
      <div className="h-7 w-48 rounded bg-line/70" />
      <div className="mt-4 grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={index} className="h-16 rounded-lg bg-line/30" />
        ))}
      </div>
    </div>
  )
}
