'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, addWeeks, format, isToday, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CalendarActivity } from '@/shared/types/calendarModels'
import { CalendarActivityCard } from './CalendarActivityCard'
import { groupByDay, formatDateRange } from '../../application/formatters/formatCalendarData'
import { cn } from '@/shared/utils/classNames'

const HOURS = Array.from({ length: 18 }, (_, index) => index + 6) // 06:00 - 23:00

export function TimeSlotGrid({
  days,
  activitiesByDay,
  onDayClick,
}: {
  days: Date[]
  activitiesByDay: Map<string, CalendarActivity[]>
  onDayClick?: (date: Date) => void
}) {
  return (
    <div className="w-full min-w-0">
      <div>
        <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] sm:grid-cols-[52px_repeat(7,minmax(0,1fr))]">
          <div />
          {days.map((day) => (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick?.(day)}
              className={cn(
                'border-b border-line px-1 pb-2 text-center transition-colors hover:bg-primary-50/50',
                isToday(day) && 'text-primary',
              )}
            >
              <span className="block text-[10px] uppercase tracking-wide text-muted">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className={cn('mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm', isToday(day) && 'bg-primary text-white')}>
                {format(day, 'd')}
              </span>
            </button>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-line/60 sm:grid-cols-[52px_repeat(7,minmax(0,1fr))]"
          >
            <div className="py-2 pr-2 text-right text-[10px] text-muted">{String(hour).padStart(2, '0')}:00</div>
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const items = (activitiesByDay.get(key) ?? []).filter((activity) => {
                if (!activity.time) return false
                const activityHour = Number(activity.time.slice(0, 2))
                return activityHour === hour
              })
              return (
                <div key={`${key}-${hour}`} className="min-h-[52px] border-l border-line/50 p-1">
                  {items.map((activity) => (
                    <CalendarActivityCard key={activity.id} activity={activity} compact />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function WeekView({
  activities,
  weekStart,
  onDayClick,
  onWeekChange,
}: {
  activities: CalendarActivity[]
  weekStart: Date
  onDayClick?: (date: Date) => void
  onWeekChange: (date: Date) => void
}) {
  const start = startOfWeek(weekStart, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))
  const grouped = groupByDay(activities)
  const allDay = activities.filter((activity) => !activity.time)

  return (
    <section aria-label="Visão semanal" className="rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-2xl text-ink">{formatDateRange(days[0], days[6])}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onWeekChange(addWeeks(start, -1))}
            aria-label="Semana anterior"
            className="rounded-full p-2 text-muted hover:bg-primary-50 hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(new Date())}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary-50"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => onWeekChange(addWeeks(start, 1))}
            aria-label="Próxima semana"
            className="rounded-full p-2 text-muted hover:bg-primary-50 hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/*
       * No mobile a grade de 7 colunas não cabe sem rolagem horizontal.
       * Mostramos uma agenda vertical por dia — todo o conteúdo continua
       * visível e a tela nunca rola para os lados.
       */}
      <div className="space-y-3 md:hidden">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const items = grouped.get(key) ?? []
          const sorted = [...items].sort(
            (a, b) =>
              (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title, 'pt-BR'),
          )
          const today = isToday(day)

          return (
            <div
              key={key}
              className={cn(
                'rounded-2xl border p-3',
                today ? 'border-primary/30 bg-primary-50/30' : 'border-line/70 bg-background/40',
              )}
            >
              <button
                type="button"
                onClick={() => onDayClick?.(day)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-[10px] font-semibold uppercase tracking-[0.16em]',
                      today ? 'text-primary' : 'text-muted',
                    )}
                  >
                    {today ? 'Hoje' : format(day, 'EEEE', { locale: ptBR })}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block text-sm font-medium',
                      today ? 'text-primary-800' : 'text-ink',
                    )}
                  >
                    {format(day, "d 'de' MMMM", { locale: ptBR })}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[10px] font-medium text-muted ring-1 ring-line">
                  {items.length === 0
                    ? 'Livre'
                    : `${items.length} ${items.length === 1 ? 'atividade' : 'atividades'}`}
                </span>
              </button>

              {sorted.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {sorted.map((activity) => (
                    <CalendarActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Grade de horários: apenas em telas médias/grandes, onde cabe sem rolagem. */}
      <div className="hidden md:block">
        {allDay.length > 0 && (
          <div className="mb-4 grid grid-cols-7 gap-1 rounded-2xl bg-primary-50/40 p-2" aria-label="Atividades sem horário">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const items = (grouped.get(key) ?? []).filter((activity) => !activity.time)
              return (
                <div key={key} className="min-h-[24px] min-w-0 space-y-1">
                  {items.map((activity) => (
                    <CalendarActivityCard key={activity.id} activity={activity} showTime={false} compact />
                  ))}
                </div>
              )
            })}
          </div>
        )}

        <TimeSlotGrid days={days} activitiesByDay={grouped} onDayClick={onDayClick} />
      </div>
    </section>
  )
}
