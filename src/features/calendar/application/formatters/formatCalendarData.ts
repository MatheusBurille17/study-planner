import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Activity } from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import type { CalendarActivity, CalendarFilters, CalendarUrgency } from '@/shared/types/calendarModels'
import {
  calculateUrgency,
  getActivityDate,
  getActivityTime,
  isActivityCompleted,
  isActivityOverdue,
} from '../../domain/calendarRules'

export function truncateTitle(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

export function truncateSubject(value: string): string {
  return truncateTitle(value, 25)
}

export function formatCalendarDate(value: Date | undefined): string {
  if (!value) return 'Sem data'
  return format(value, "dd 'de' MMM", { locale: ptBR })
}

export function formatCalendarFullDate(value: Date): string {
  return format(value, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatCalendarTime(value?: string): string {
  if (!value) return ''
  return value.slice(0, 5)
}

export function formatMonthYear(value: Date): string {
  return format(value, "MMMM 'de' yyyy", { locale: ptBR })
}

export function formatDateRange(start: Date, end: Date): string {
  return `${format(start, "dd 'de' MMM", { locale: ptBR })} – ${format(end, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`
}

export function relativeCalendarLabel(date: Date | undefined, now: Date = new Date()): string {
  const urgency = calculateUrgency(date, now)
  if (urgency === 'critical') return 'Hoje'
  if (urgency === 'high') return 'Em breve'
  if (urgency === 'medium') return 'Esta semana'
  return 'Em breve'
}

export function urgencyClasses(urgency: CalendarUrgency): string {
  switch (urgency) {
    case 'critical':
      return 'bg-rose/30 border-[#d97b93]'
    case 'high':
      return 'bg-peach/40 border-[#e0a06e]'
    case 'medium':
      return 'bg-butter/40 border-[#d9bf62]'
    default:
      return 'bg-line/30 border-[#b9b1a6]'
  }
}

export function typeBorderClass(type: string): string {
  if (type === 'exam') return 'border-l-[#d97b93]'
  if (type === 'assignment') return 'border-l-[#78b48c]'
  return 'border-l-[#6fa8d8]'
}

export function mapActivityToCalendarActivity(
  activity: Activity,
  subjects: Subject[],
  now: Date = new Date(),
): CalendarActivity | null {
  const date = getActivityDate(activity)
  if (!date || !activity.title) return null

  const subject = activity.subjectId ? subjects.find((item) => item.id === activity.subjectId) : undefined
  const base = {
    id: activity.id,
    title: activity.title,
    type: activity.type,
    date,
    time: getActivityTime(activity),
    subjectId: activity.subjectId,
    subjectName: truncateSubject(subject?.name ?? 'Sem disciplina'),
    subjectColor: subject?.color,
    urgency: calculateUrgency(date, now),
    isOverdue: isActivityOverdue(activity, now),
    completed: isActivityCompleted(activity),
    description: activity.description,
  }

  if (activity.type === 'task') {
    return { ...base, priority: activity.priority, status: activity.status }
  }
  if (activity.type === 'assignment') {
    return { ...base, status: activity.status }
  }
  if (activity.type === 'exam') {
    return { ...base, location: activity.location }
  }
  return base
}

export function filterCalendarActivities(
  activities: CalendarActivity[],
  filters: CalendarFilters,
): CalendarActivity[] {
  return activities.filter((activity) => {
    if (filters.types?.length && !filters.types.includes(activity.type as never)) return false
    if (filters.subjectId && activity.subjectId !== filters.subjectId) return false
    return true
  })
}

export function formatCalendarData(
  activities: Activity[],
  subjects: Subject[],
  filters: CalendarFilters = {},
  now: Date = new Date(),
): CalendarActivity[] {
  const mapped = activities
    .map((activity) => mapActivityToCalendarActivity(activity, subjects, now))
    .filter((activity): activity is CalendarActivity => Boolean(activity))
  return filterCalendarActivities(mapped, filters).sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime()
    if (dateDiff !== 0) return dateDiff
    return (a.time ?? '23:59').localeCompare(b.time ?? '23:59')
  })
}

/** Intervalo visível para cada modo. */
export function getViewRange(view: 'month' | 'week' | 'day', reference: Date): { start: Date; end: Date } {
  if (view === 'month') {
    return {
      start: startOfWeek(startOfMonth(reference), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(reference), { weekStartsOn: 0 }),
    }
  }
  if (view === 'week') {
    return {
      start: startOfWeek(reference, { weekStartsOn: 0 }),
      end: endOfWeek(reference, { weekStartsOn: 0 }),
    }
  }
  return { start: reference, end: reference }
}

export function activitiesInRange(
  activities: CalendarActivity[],
  start: Date,
  end: Date,
): CalendarActivity[] {
  const from = startOfDay(start).getTime()
  const to = endOfDay(end).getTime()
  return activities.filter((activity) => {
    const time = startOfDay(activity.date).getTime()
    return time >= from && time <= to
  })
}

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

export function groupByDay(activities: CalendarActivity[]): Map<string, CalendarActivity[]> {
  const map = new Map<string, CalendarActivity[]>()
  for (const activity of activities) {
    const key = format(activity.date, 'yyyy-MM-dd')
    const list = map.get(key) ?? []
    list.push(activity)
    map.set(key, list)
  }
  return map
}

export { addDays }
