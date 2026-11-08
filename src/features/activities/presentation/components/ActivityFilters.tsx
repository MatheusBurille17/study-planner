'use client'

import { CalendarRange, ChevronDown, Filter, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import {
  ASSIGNMENT_STATUS_LABELS,
  AssignmentStatus,
  PRIORITY_LABELS,
  Priority,
  TASK_STATUS_LABELS,
  TaskStatus,
} from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import type { FilterCriteria, SortOption } from '../schemas/filterSchema'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/classNames'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'

interface ActivityFiltersProps {
  filters: FilterCriteria
  subjects: Subject[]
  onChange: (filters: FilterCriteria) => void
  onClear: () => void
}

const PRIORITY_OPTIONS = [Priority.HIGH, Priority.MEDIUM, Priority.LOW]
const TASK_STATUS_OPTIONS = Object.values(TaskStatus)
const ASSIGNMENT_STATUS_OPTIONS = Object.values(AssignmentStatus)

function toggleValue<T>(values: T[] | undefined, value: T): T[] {
  const current = values ?? []
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
}

function FilterGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line pb-3 last:border-none last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="space-y-2 pt-1.5">{children}</div>}
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
  color,
}: {
  checked: boolean
  onChange: () => void
  label: string
  color?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-xs text-ink hover:bg-primary-50/60">
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded border transition-colors',
          checked ? 'border-primary bg-primary text-white' : 'border-line bg-surface',
        )}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-sm bg-white" />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      <span className="truncate">{label}</span>
    </label>
  )
}

export function ActivityFilters({ filters, subjects, onChange, onClear }: ActivityFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.priorities?.length ||
      filters.subjectIds?.length ||
      filters.statuses?.length ||
      filters.dateFrom ||
      filters.dateTo,
  )

  function patch(partial: Partial<FilterCriteria>) {
    onChange({ ...filters, ...partial, page: 1 })
  }

  function applyPreset(preset: 'today' | 'week' | 'month') {
    const now = new Date()
    const range =
      preset === 'today'
        ? [now, now]
        : preset === 'week'
          ? [startOfWeek(now, { weekStartsOn: 0 }), endOfWeek(now, { weekStartsOn: 0 })]
          : [startOfMonth(now), endOfMonth(now)]
    patch({ dateFrom: format(range[0], 'yyyy-MM-dd'), dateTo: format(range[1], 'yyyy-MM-dd') })
  }

  const content = (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Filter className="h-4 w-4 text-primary" /> Filtros
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <RotateCcw className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>

      <FilterGroup title="Período">
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'today' as const, label: 'Hoje' },
            { key: 'week' as const, label: 'Esta semana' },
            { key: 'month' as const, label: 'Este mês' },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => applyPreset(preset.key)}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted hover:border-primary/30 hover:text-primary"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            aria-label="Data inicial"
            value={filters.dateFrom ?? ''}
            onChange={(event) => patch({ dateFrom: event.target.value || undefined })}
            className="h-9 text-xs"
          />
          <Input
            type="date"
            aria-label="Data final"
            value={filters.dateTo ?? ''}
            onChange={(event) => patch({ dateTo: event.target.value || undefined })}
            className="h-9 text-xs"
          />
        </div>
        {filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo && (
          <p className="text-[11px] text-[#ef4444]">Data inicial deve ser antes da final</p>
        )}
      </FilterGroup>

      <FilterGroup title="Prioridade">
        {PRIORITY_OPTIONS.map((priority) => (
          <CheckRow
            key={priority}
            label={PRIORITY_LABELS[priority]}
            checked={Boolean(filters.priorities?.includes(priority))}
            onChange={() => patch({ priorities: toggleValue(filters.priorities, priority) })}
            color={
              priority === Priority.HIGH ? '#d97b93' : priority === Priority.MEDIUM ? '#d9bf62' : '#78b48c'
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Status">
        {TASK_STATUS_OPTIONS.map((status) => (
          <CheckRow
            key={status}
            label={TASK_STATUS_LABELS[status]}
            checked={Boolean(filters.statuses?.includes(status))}
            onChange={() => patch({ statuses: toggleValue(filters.statuses, status) })}
          />
        ))}
        {ASSIGNMENT_STATUS_OPTIONS.map((status) => (
          <CheckRow
            key={status}
            label={ASSIGNMENT_STATUS_LABELS[status]}
            checked={Boolean(filters.statuses?.includes(status))}
            onChange={() => patch({ statuses: toggleValue(filters.statuses, status) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Disciplina" defaultOpen={subjects.length > 0}>
        {subjects.length === 0 && <p className="text-[11px] text-muted">Nenhuma disciplina cadastrada.</p>}
        <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1 scrollbar-none">
          {subjects.map((subject) => (
            <CheckRow
              key={subject.id}
              label={subject.name}
              color={subject.color}
              checked={Boolean(filters.subjectIds?.includes(subject.id))}
              onChange={() => patch({ subjectIds: toggleValue(filters.subjectIds, subject.id) })}
            />
          ))}
        </div>
      </FilterGroup>
    </div>
  )

  return (
    <>
      <div className="lg:hidden">
        <Button variant="outline" className="w-full" onClick={() => setMobileOpen((current) => !current)}>
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />}
        </Button>
        {mobileOpen && <div className="mt-3 rounded-2xl border border-line bg-surface p-4 shadow-card">{content}</div>}
      </div>
      <aside className="hidden rounded-3xl border border-line bg-surface p-4 shadow-card lg:block">{content}</aside>
    </>
  )
}

export function ActiveFilterChips({
  filters,
  subjects,
  onChange,
}: {
  filters: FilterCriteria
  subjects: Subject[]
  onChange: (filters: FilterCriteria) => void
}) {
  const chips: Array<{ key: string; label: string; clear: () => void }> = []
  if (filters.search) {
    chips.push({
      key: 'search',
      label: `Busca: ${filters.search}`,
      clear: () => onChange({ ...filters, search: undefined, page: 1 }),
    })
  }
  filters.priorities?.forEach((priority) => {
    chips.push({
      key: `priority-${priority}`,
      label: PRIORITY_LABELS[priority],
      clear: () =>
        onChange({
          ...filters,
          priorities: filters.priorities?.filter((item) => item !== priority),
          page: 1,
        }),
    })
  })
  filters.subjectIds?.forEach((subjectId) => {
    const subject = subjects.find((item) => item.id === subjectId)
    chips.push({
      key: `subject-${subjectId}`,
      label: subject?.name ?? 'Disciplina',
      clear: () =>
        onChange({
          ...filters,
          subjectIds: filters.subjectIds?.filter((item) => item !== subjectId),
          page: 1,
        }),
    })
  })
  filters.statuses?.forEach((status) => {
    chips.push({
      key: `status-${status}`,
      label:
        TASK_STATUS_LABELS[status as TaskStatus] ??
        ASSIGNMENT_STATUS_LABELS[status as AssignmentStatus] ??
        status,
      clear: () =>
        onChange({
          ...filters,
          statuses: filters.statuses?.filter((item) => item !== status),
          page: 1,
        }),
    })
  })
  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      key: 'dates',
      label: `${filters.dateFrom ?? '…'} → ${filters.dateTo ?? '…'}`,
      clear: () => onChange({ ...filters, dateFrom: undefined, dateTo: undefined, page: 1 }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] text-primary-800"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.clear}
            aria-label={`Remover filtro ${chip.label}`}
            className="rounded-full p-0.5 hover:bg-primary-100"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...filters,
            search: undefined,
            priorities: undefined,
            subjectIds: undefined,
            statuses: undefined,
            dateFrom: undefined,
            dateTo: undefined,
            page: 1,
          })
        }
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted hover:text-primary"
      >
        <CalendarRange className="h-3 w-3" /> Limpar filtros
      </button>
    </div>
  )
}

export const SORT_LABELS: Record<SortOption, string> = {
  date_asc: 'Data (mais próxima)',
  date_desc: 'Data (mais distante)',
  priority_desc: 'Prioridade (alta → baixa)',
  priority_asc: 'Prioridade (baixa → alta)',
  created_desc: 'Criação (recente)',
  created_asc: 'Criação (antiga)',
  title_asc: 'Título (A → Z)',
  title_desc: 'Título (Z → A)',
  status: 'Status',
}
