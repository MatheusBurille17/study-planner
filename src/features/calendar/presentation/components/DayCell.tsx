'use client'

import { memo } from 'react'
import { format, isSameMonth, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CalendarActivity } from '@/shared/types/calendarModels'
import { cn } from '@/shared/utils/classNames'

interface DayCellProps {
  date: Date
  activities: CalendarActivity[]
  isCurrentMonth: boolean
  isSelected: boolean
  onClick: (date: Date) => void
}

export const DayCell = memo(function DayCell({
  date,
  activities,
  isCurrentMonth,
  isSelected,
  onClick,
}: DayCellProps) {
  const counts = {
    task: activities.filter((activity) => activity.type === 'task').length,
    exam: activities.filter((activity) => activity.type === 'exam').length,
    assignment: activities.filter((activity) => activity.type === 'assignment').length,
  }
  const today = isToday(date)
  const ariaLabel = `${format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}${
    activities.length
      ? `, ${activities.length} atividades: ${counts.task} tarefas, ${counts.exam} provas, ${counts.assignment} trabalhos`
      : ', sem atividades'
  }`

  return (
    <button
      type="button"
      onClick={() => onClick(date)}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      role="gridcell"
      className={cn(
        'relative flex min-h-[72px] flex-col items-stretch rounded-xl border border-transparent p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2',
        isCurrentMonth ? 'text-ink hover:border-primary/20 hover:bg-primary-50/50' : 'text-muted/40',
        isSelected && 'border-primary/30 bg-primary-50/70',
        today && 'bg-primary-50',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
          today && 'bg-primary text-white',
          isSelected && !today && 'bg-primary-100 text-primary-800',
        )}
      >
        {format(date, 'd')}
      </span>

      <span className="mt-1 flex min-h-[14px] flex-1 flex-col gap-0.5 overflow-hidden">
        {activities.slice(0, 2).map((activity) => (
          <span
            key={activity.id}
            className={cn(
              'truncate rounded px-1 py-0.5 text-[9px] leading-tight',
              activity.type === 'task' && 'bg-sky/50 text-[#315a7d]',
              activity.type === 'exam' && 'bg-rose/50 text-[#8a3d52]',
              activity.type === 'assignment' && 'bg-sage/50 text-[#3c6b4d]',
              activity.completed && 'line-through opacity-60',
            )}
          >
            {activity.title}
          </span>
        ))}
      </span>

      {activities.length > 0 && (
        <span className="mt-1 flex items-center gap-1">
          <span className="flex gap-0.5">
            {counts.task > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#6fa8d8]" />}
            {counts.exam > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#d97b93]" />}
            {counts.assignment > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#78b48c]" />}
          </span>
          {activities.length > 2 && (
            <span className="ml-auto text-[9px] text-muted">+{activities.length - 2}</span>
          )}
        </span>
      )}
    </button>
  )
})
