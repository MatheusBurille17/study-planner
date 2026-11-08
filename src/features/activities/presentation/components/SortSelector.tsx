'use client'

import { ArrowUpDown } from 'lucide-react'
import type { SortOption } from '../schemas/filterSchema'
import { SORT_LABELS } from './ActivityFilters'

export function SortSelector({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (value: SortOption) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
      <ArrowUpDown className="h-3.5 w-3.5" />
      <span className="sr-only sm:not-sr-only">Ordenar por</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
        aria-label="Ordenar atividades"
        className="bg-transparent text-xs font-medium text-ink focus:outline-none"
      >
        {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  )
}
