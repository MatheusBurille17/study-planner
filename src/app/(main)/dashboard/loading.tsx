import { DashboardSkeleton } from '@/features/dashboard/presentation/components/DashboardSkeleton'

export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <DashboardSkeleton />
    </div>
  )
}
