'use client'

import type { CalendarActivity } from '@/shared/types/calendarModels'
import { CalendarActivityCard } from './CalendarActivityCard'

export function AllDaySection({ activities }: { activities: CalendarActivity[] }) {
  if (activities.length === 0) return null
  return (
    <section aria-label="Atividades sem horário" className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Dia inteiro</p>
      <div className="space-y-1">
        {activities.map((activity) => (
          <CalendarActivityCard key={activity.id} activity={activity} showTime={false} compact />
        ))}
      </div>
    </section>
  )
}
