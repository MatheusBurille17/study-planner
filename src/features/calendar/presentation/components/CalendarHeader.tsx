'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/utils/classNames'

const VIEWS = [
  { value: 'month' as const, label: 'Mês' },
  { value: 'week' as const, label: 'Semana' },
  { value: 'day' as const, label: 'Dia' },
]

export function CalendarHeader({
  viewMode,
  dateLabel,
  onViewModeChange,
  onNavigate,
  isOffline,
}: {
  viewMode: 'month' | 'week' | 'day'
  dateLabel: string
  onViewModeChange: (view: 'month' | 'week' | 'day') => void
  onNavigate: (direction: -1 | 1) => void
  isOffline?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          aria-label="Período anterior"
          className="rounded-full border border-line bg-surface p-2 text-muted hover:border-primary/30 hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          aria-label="Próximo período"
          className="rounded-full border border-line bg-surface p-2 text-muted hover:border-primary/30 hover:text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <h2 className="ml-1 font-serif text-xl capitalize text-ink sm:text-2xl">{dateLabel}</h2>
      </div>

      <div className="flex items-center gap-2">
        {isOffline && (
          <span className="rounded-full bg-line/60 px-2.5 py-1 text-[10px] text-muted">Offline</span>
        )}
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Modo de visualização">
          {VIEWS.map((view) => (
            <button
              key={view.value}
              type="button"
              role="tab"
              aria-selected={viewMode === view.value}
              onClick={() => onViewModeChange(view.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors',
                viewMode === view.value ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-primary-50 hover:text-primary',
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
