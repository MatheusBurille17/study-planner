'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { addDays } from 'date-fns'
import type { CalendarActivity } from '@/shared/types/calendarModels'
import { AllDaySection } from './AllDaySection'
import { CalendarActivityCard } from './CalendarActivityCard'
import { formatCalendarFullDate } from '../../application/formatters/formatCalendarData'

export function DayView({
  date,
  activities,
  onPreviousDay,
  onNextDay,
  onBackToCalendar,
}: {
  date: Date
  activities: CalendarActivity[]
  onPreviousDay: () => void
  onNextDay: () => void
  onBackToCalendar: () => void
}) {
  const allDay = activities.filter((activity) => !activity.time)
  const timed = activities
    .filter((activity) => activity.time)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

  return (
    <section aria-label="Visão diária" className="rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <button type="button" onClick={onBackToCalendar} className="text-[11px] font-medium text-primary hover:underline">
            Voltar ao calendário
          </button>
          <h2 className="mt-1 font-serif text-2xl capitalize text-ink">{formatCalendarFullDate(date)}</h2>
          <p className="text-xs text-muted">
            {activities.length} {activities.length === 1 ? 'atividade' : 'atividades'}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPreviousDay}
            aria-label="Dia anterior"
            className="rounded-full p-2 text-muted hover:bg-primary-50 hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextDay}
            aria-label="Próximo dia"
            className="rounded-full p-2 text-muted hover:bg-primary-50 hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-4 py-12 text-center">
          <p className="text-sm text-muted">Nenhuma atividade para este dia.</p>
          <Link
            href={`/activities/new?type=task&date=${addDays(date, 0).toISOString().slice(0, 10)}`}
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" /> Criar atividade
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {allDay.length > 0 && (
            <div>
              <h3 className="mb-2 font-serif text-lg text-ink">Dia inteiro</h3>
              <AllDaySection activities={allDay} />
            </div>
          )}

          {timed.length > 0 && (
            <div>
              <h3 className="mb-2 font-serif text-lg text-ink">Com horário</h3>
              <ul className="space-y-2">
                {timed.map((activity) => (
                  <li key={activity.id} className="flex gap-3">
                    <span className="w-12 shrink-0 pt-1 text-right text-xs font-medium text-muted">{activity.time}</span>
                    <div className="min-w-0 flex-1">
                      <CalendarActivityCard activity={activity} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
