'use client'

import type { CalendarActivity } from '@/shared/types/calendarModels'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'

export function CalendarViewContainer({
  view,
  activities,
  reference,
  selectedDate,
  onDayClick,
  onMonthChange,
  onWeekChange,
  onNavigate,
  onBackToCalendar,
}: {
  view: 'month' | 'week' | 'day'
  activities: CalendarActivity[]
  reference: Date
  selectedDate: Date
  onDayClick: (date: Date) => void
  onMonthChange: (date: Date) => void
  onWeekChange: (date: Date) => void
  onNavigate: (direction: -1 | 1) => void
  onBackToCalendar: () => void
}) {
  if (view === 'week') {
    return (
      <WeekView
        activities={activities}
        weekStart={reference}
        onDayClick={onDayClick}
        onWeekChange={onWeekChange}
      />
    )
  }
  if (view === 'day') {
    return (
      <DayView
        date={reference}
        activities={activities}
        onPreviousDay={() => onNavigate(-1)}
        onNextDay={() => onNavigate(1)}
        onBackToCalendar={onBackToCalendar}
      />
    )
  }
  return (
    <MonthView
      activities={activities}
      reference={reference}
      selectedDate={selectedDate}
      onDayClick={onDayClick}
      onMonthChange={onMonthChange}
    />
  )
}
