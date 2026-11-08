'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, format, isSameMonth } from 'date-fns'
import { getMonthGrid } from '@/shared/utils/dateHelpers'
import type { CalendarActivity } from '@/shared/types/calendarModels'
import { DayCell } from './DayCell'
import { formatMonthYear, groupByDay } from '../../application/formatters/formatCalendarData'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function MonthView({
  activities,
  reference,
  selectedDate,
  onDayClick,
  onMonthChange,
}: {
  activities: CalendarActivity[]
  reference: Date
  selectedDate: Date
  onDayClick: (date: Date) => void
  onMonthChange: (date: Date) => void
}) {
  const days = getMonthGrid(reference)
  const grouped = groupByDay(activities)

  return (
    <section aria-label="Visão mensal" className="rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl capitalize text-ink">{formatMonthYear(reference)}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(reference, -1))}
            aria-label="Mês anterior"
            className="rounded-full p-2 text-muted hover:bg-primary-50 hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(new Date())}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary-50"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(reference, 1))}
            aria-label="Próximo mês"
            className="rounded-full p-2 text-muted hover:bg-primary-50 hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div role="grid" aria-label={`Calendário de ${formatMonthYear(reference)}`}>
        <div role="row" className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date) => (
            <DayCell
              key={format(date, 'yyyy-MM-dd')}
              date={date}
              activities={grouped.get(format(date, 'yyyy-MM-dd')) ?? []}
              isCurrentMonth={isSameMonth(date, reference)}
              isSelected={format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')}
              onClick={onDayClick}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#6fa8d8]" /> Tarefa</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#d97b93]" /> Prova</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#78b48c]" /> Trabalho</span>
      </div>
    </section>
  )
}
