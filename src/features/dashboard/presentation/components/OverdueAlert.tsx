import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export function OverdueAlert({ overdueCount }: { overdueCount: number }) {
  if (overdueCount <= 0) return null

  return (
    <div
      role="region"
      aria-live="polite"
      aria-atomic="true"
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-4 border-[#e0728c] bg-rose/20 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-[#8a3d52]" />
        <p className="text-sm text-[#6d3042]">
          Você tem <strong>{overdueCount}</strong>{' '}
          {overdueCount === 1 ? 'atividade atrasada' : 'atividades atrasadas'}.
        </p>
      </div>
      <Link
        href="/activities?status=overdue&sort=date_asc"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#8a3d52] hover:underline"
        aria-label={`Ver ${overdueCount} atividades atrasadas`}
      >
        Ver atrasadas <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
