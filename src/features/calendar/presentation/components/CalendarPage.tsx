'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { Plus } from 'lucide-react'
import type { Activity } from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import type { CalendarFilters, CalendarViewMode } from '@/shared/types/calendarModels'
import { useIsOnline } from '@/shared/hooks/useIsOnline'
import { Button } from '@/shared/components/ui/button'
import { useActivityRealtime } from '@/features/activities/presentation/hooks/useActivityRealtime'
import {
  activitiesInRange,
  formatCalendarData,
  formatCalendarFullDate,
  formatDateRange,
  formatMonthYear,
  getViewRange,
} from '../../application/formatters/formatCalendarData'
import { useCalendarState } from '../hooks/useCalendarState'
import { CalendarHeader } from './CalendarHeader'
import { FilterBar } from './FilterBar'
import { CalendarViewContainer } from './CalendarViewContainer'
import { getCalendarDataAction } from '../actions/getCalendarData'
import { cacheCalendarData } from '@/shared/lib/calendarCache'

export function CalendarPage({
  activities,
  subjects,
  userId,
  initialView,
  initialDate,
  initialFilters,
}: {
  activities: Activity[]
  subjects: Subject[]
  userId: string
  initialView: CalendarViewMode
  initialDate: Date
  initialFilters: CalendarFilters
}) {
  const calendar = useCalendarState(initialView, initialDate, initialFilters)
  const isOnline = useIsOnline()
  const router = useRouter()
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useActivityRealtime(userId)

  useEffect(() => {
    const onChange = () => router.refresh()
    window.addEventListener('activity:changed', onChange)
    return () => window.removeEventListener('activity:changed', onChange)
  }, [router])

  const formatted = useMemo(
    () => formatCalendarData(activities, subjects, calendar.filters),
    [activities, subjects, calendar.filters],
  )

  const range = getViewRange(calendar.view, calendar.date)
  const visible = useMemo(
    () => activitiesInRange(formatted, range.start, range.end),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formatted, calendar.view, calendar.date],
  )

  useEffect(() => {
    const key = `calendar_${userId}_${calendar.view}_${format(calendar.date, 'yyyy-MM-dd')}`
    void cacheCalendarData(key, {
      view: calendar.view,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      activities: visible,
      subjects: subjects.map((subject) => ({ id: subject.id, name: subject.name, color: subject.color })),
      generatedAt: new Date().toISOString(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar.view, calendar.date, visible])

  async function refresh() {
    setIsRefreshing(true)
    setError(null)
    const result = await getCalendarDataAction({
      view: calendar.view,
      date: format(calendar.date, 'yyyy-MM-dd'),
      filters: calendar.filters,
    })
    setIsRefreshing(false)
    if (!result.success) {
      setError(result.error?.message ?? 'Não foi possível carregar o calendário')
      return
    }
    setLastUpdated(new Date(result.data?.generatedAt ?? Date.now()))
    router.refresh()
  }

  useEffect(() => {
    const onOnline = () => void refresh()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar.view, calendar.date, calendar.filters])

  const dateLabel =
    calendar.view === 'month'
      ? formatMonthYear(calendar.date)
      : calendar.view === 'week'
        ? formatDateRange(
            startOfWeek(calendar.date, { weekStartsOn: 0 }),
            endOfWeek(calendar.date, { weekStartsOn: 0 }),
          )
        : formatCalendarFullDate(calendar.date)

  const showEmptyFilter =
    visible.length === 0 && (Boolean(calendar.filters.types?.length) || Boolean(calendar.filters.subjectId))

  return (
    <div className="page-shell max-w-6xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Sua agenda</p>
          <h1 className="section-heading">Calendário</h1>
          <p className="mt-1 text-sm text-muted">Visualize tarefas, provas e trabalhos por dia, semana ou mês.</p>
        </div>
        <Link
          href="/activities/new"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-medium text-white shadow-soft hover:bg-primary-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nova atividade
        </Link>
      </header>

      <div className="mb-3 space-y-3">
        <CalendarHeader
          viewMode={calendar.view}
          dateLabel={dateLabel}
          onViewModeChange={calendar.setView}
          onNavigate={calendar.navigate}
          isOffline={!isOnline}
        />
        <FilterBar
          filters={calendar.filters}
          subjects={subjects}
          onChange={calendar.setFilters}
          onClear={calendar.clearFilters}
        />
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#b91c1c]" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="destructive" onClick={() => void refresh()} disabled={isRefreshing}>
            {isRefreshing ? 'Tentando…' : 'Tentar novamente'}
          </Button>
        </div>
      )}

      {showEmptyFilter && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-xs text-muted">
          Nenhuma atividade corresponde a este filtro.
          <button type="button" onClick={calendar.clearFilters} className="font-medium text-primary hover:underline">
            Limpar filtros
          </button>
        </div>
      )}

      <CalendarViewContainer
        view={calendar.view}
        activities={visible}
        reference={calendar.date}
        selectedDate={calendar.date}
        onDayClick={calendar.openDay}
        onMonthChange={calendar.setDate}
        onWeekChange={calendar.setDate}
        onNavigate={calendar.navigate}
        onBackToCalendar={() => calendar.setView('month')}
      />
    </div>
  )
}
