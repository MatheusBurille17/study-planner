import { Bell } from 'lucide-react'
import { ActivityTypeBadge } from '@/features/activities/presentation/components/ActivityTypeBadge'
import { PRIORITY_LABELS, Priority } from '@/shared/types/activity'
import type { CalendarActivity } from '@/shared/types/calendarModels'
import {
  formatCalendarTime,
  typeBorderClass,
  urgencyClasses,
} from '../../application/formatters/formatCalendarData'
import { cn } from '@/shared/utils/classNames'
import Link from 'next/link'

export function CalendarActivityCard({
  activity,
  showTime = true,
  compact = false,
}: {
  activity: CalendarActivity
  showTime?: boolean
  compact?: boolean
}) {
  const label = `${activity.title}${activity.subjectName ? ` - ${activity.subjectName}` : ''}${
    activity.time ? ` às ${formatCalendarTime(activity.time)}` : ''
  }${activity.priority ? `, prioridade ${PRIORITY_LABELS[activity.priority]}` : ''}`

  return (
    <Link
      href={`/activities/${activity.id}`}
      className={cn(
        'block rounded-lg border border-l-4 px-2 py-1.5 text-left transition-shadow hover:shadow-sm',
        typeBorderClass(activity.type),
        urgencyClasses(activity.urgency),
        activity.completed && 'opacity-60',
        compact ? 'text-[10px]' : 'text-xs',
      )}
      aria-label={label}
    >
      <span className={cn('block truncate font-medium text-ink', activity.completed && 'line-through')}>
        {activity.title}
      </span>
      {!compact && (
        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted">
          <ActivityTypeBadge type={activity.type} className="px-1.5 py-0 text-[9px]" />
          {showTime && activity.time && <span>{formatCalendarTime(activity.time)}</span>}
          {activity.priority === Priority.HIGH && (
            <span className="inline-flex items-center gap-0.5 text-[#8a3d52]">
              <Bell className="h-2.5 w-2.5" /> Alta
            </span>
          )}
        </span>
      )}
    </Link>
  )
}
