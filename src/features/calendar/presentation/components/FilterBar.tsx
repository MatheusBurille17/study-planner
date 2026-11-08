'use client'

import { RotateCcw } from 'lucide-react'
import type { Subject } from '@/shared/types/subject'
import type { CalendarFilters } from '@/shared/types/calendarModels'
import { cn } from '@/shared/utils/classNames'

const TYPE_OPTIONS = [
  { value: undefined, label: 'Tudo' },
  { value: 'task' as const, label: 'Tarefas', className: 'bg-sky/40 text-[#315a7d]' },
  { value: 'exam' as const, label: 'Provas', className: 'bg-rose/40 text-[#8a3d52]' },
  { value: 'assignment' as const, label: 'Trabalhos', className: 'bg-sage/40 text-[#3c6b4d]' },
]

export function FilterBar({
  filters,
  subjects,
  onChange,
  onClear,
}: {
  filters: CalendarFilters
  subjects: Subject[]
  onChange: (filters: CalendarFilters) => void
  onClear: () => void
}) {
  const activeType = filters.types?.length === 1 ? filters.types[0] : undefined
  const hasFilters = Boolean(filters.types?.length || filters.subjectId)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
        {TYPE_OPTIONS.map((option) => {
          const active = activeType === option.value
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...filters, types: option.value ? [option.value] : undefined })}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                active
                  ? 'border-primary/30 bg-primary-50 text-primary-800'
                  : 'border-line bg-surface text-muted hover:border-primary/20 hover:text-primary',
                active && option.className,
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <label className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] text-muted">
        <span className="sr-only">Filtrar por disciplina</span>
        <select
          value={filters.subjectId ?? ''}
          onChange={(event) => onChange({ ...filters, subjectId: event.target.value || undefined })}
          aria-label="Filtrar por disciplina"
          className="max-w-[150px] bg-transparent text-[11px] font-medium text-ink focus:outline-none"
        >
          <option value="">Todas as disciplinas</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-primary hover:underline"
        >
          <RotateCcw className="h-3 w-3" /> Limpar filtros
        </button>
      )}
    </div>
  )
}
