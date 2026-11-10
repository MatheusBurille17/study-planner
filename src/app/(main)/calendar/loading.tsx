import { CalendarSkeleton } from '@/features/calendar/presentation/components/CalendarSkeleton'

export default function CalendarLoading() {
  return (
    <div className="page-shell max-w-6xl" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <header className="mb-5 space-y-2">
        <div className="h-2.5 w-24 animate-pulse rounded bg-line/60" />
        <div className="h-8 w-44 animate-pulse rounded bg-line/70" />
        <div className="h-3 w-80 max-w-full animate-pulse rounded bg-line/50" />
      </header>
      <div className="mb-3 space-y-3">
        <div className="h-12 animate-pulse rounded-full bg-line/50" />
        <div className="h-11 animate-pulse rounded-2xl bg-line/40" />
      </div>
      <CalendarSkeleton />
    </div>
  )
}
