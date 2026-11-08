'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/shared/utils/classNames'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

interface MiniCalendarProps {
  calendarDays: Array<{ date: string; types: string[] }>
  initialDate?: Date
}

export function MiniCalendar({ calendarDays, initialDate = new Date() }: MiniCalendarProps) {
  const [reference, setReference] = useState(initialDate)
  const router = useRouter()

  const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })

  const eventsByDay = new Map(calendarDays.map((item) => [item.date, item.types]))
  const today = new Date()

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl capitalize text-ink">
          {format(reference, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setReference((current) => addMonths(current, -1))}
            aria-label="Mês anterior"
            className="rounded-full p-1.5 text-muted hover:bg-primary-50 hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setReference((current) => addMonths(current, 1))}
            aria-label="Próximo mês"
            className="rounded-full p-1.5 text-muted hover:bg-primary-50 hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((label, index) => (
          <span key={`${label}-${index}`} className="pb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {label}
          </span>
        ))}
        {days.map((date) => {
          const key = format(date, 'yyyy-MM-dd')
          const types = eventsByDay.get(key) ?? []
          const inMonth = isSameMonth(date, reference)
          const isToday = isSameDay(date, today)
          return (
            <button
              key={key}
              type="button"
              onClick={() => router.push(`/calendar?date=${key}`)}
              aria-label={`${format(date, "d 'de' MMMM", { locale: ptBR })}${types.length ? `, ${types.length} atividades` : ''}`}
              className={cn(
                'relative mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-full text-xs transition-colors',
                !inMonth && 'text-muted/40',
                inMonth && !isToday && 'text-ink hover:bg-primary-50',
                isToday && 'bg-primary font-semibold text-white shadow-sm',
              )}
            >
              {format(date, 'd')}
              {types.length > 0 && (
                <span className="absolute -bottom-0.5 flex gap-0.5">
                  {types.slice(0, 3).map((type) => (
                    <span
                      key={type}
                      className={cn(
                        'h-1 w-1 rounded-full',
                        type === 'task' && 'bg-[#6fa8d8]',
                        type === 'exam' && 'bg-[#d97b93]',
                        type === 'assignment' && 'bg-[#78b48c]',
                        !['task', 'exam', 'assignment'].includes(type) && 'bg-lilac',
                        isToday && 'bg-white',
                      )}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#6fa8d8]" /> Tarefa</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#d97b93]" /> Prova</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#78b48c]" /> Trabalho</span>
      </div>
      <Link href="/calendar" className="mt-3 inline-flex text-[11px] font-medium text-primary hover:underline">
        Ver calendário completo →
      </Link>
    </section>
  )
}
