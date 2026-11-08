'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, addMonths, addWeeks, format } from 'date-fns'
import type { CalendarFilters, CalendarViewMode } from '@/shared/types/calendarModels'

export function useCalendarState(
  initialView: CalendarViewMode,
  initialDate: Date,
  initialFilters: CalendarFilters,
) {
  const [view, setView] = useState<CalendarViewMode>(initialView)
  const [date, setDate] = useState<Date>(initialDate)
  const [filters, setFilters] = useState<CalendarFilters>(initialFilters)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams()
    if (view !== 'month') params.set('view', view)
    params.set('date', format(date, 'yyyy-MM-dd'))
    if (filters.types?.length === 1) {
      const map = { task: 'tasks', exam: 'exams', assignment: 'assignments' } as const
      const value = map[filters.types[0] as keyof typeof map]
      if (value) params.set('filter', value)
    }
    if (filters.subjectId) params.set('subject', filters.subjectId)
    router.replace(`/calendar?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, date, filters])

  const navigate = useCallback(
    (direction: -1 | 1) => {
      setDate((current) => {
        if (view === 'month') return addMonths(current, direction)
        if (view === 'week') return addWeeks(current, direction)
        return addDays(current, direction)
      })
    },
    [view],
  )

  const openDay = useCallback((nextDate: Date) => {
    setDate(nextDate)
    setView('day')
  }, [])

  const changeView = useCallback((nextView: CalendarViewMode) => {
    setView(nextView)
  }, [])

  const clearFilters = useCallback(() => setFilters({}), [])

  return {
    view,
    date,
    filters,
    setView: changeView,
    setDate,
    setFilters,
    navigate,
    openDay,
    clearFilters,
  }
}
