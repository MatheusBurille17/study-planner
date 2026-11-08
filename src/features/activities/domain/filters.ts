import type { Activity } from '@/shared/types/activity'
import type { ActivityFilter } from '@/shared/types/notification'
import { Priority } from '@/shared/types/activity'
import { getEventDate } from './rules'

const PRIORITY_WEIGHT: Record<string, number> = {
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1,
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function activitySearchText(activity: Activity): string {
  return normalizeText([activity.title, activity.description].filter(Boolean).join(' '))
}

/** Filtra e ordena atividades em memória (usado pelo modo local e testes). */
export function filterActivities(activities: Activity[], filter: ActivityFilter = {}): Activity[] {
  let result = [...activities]

  if (filter.types?.length) {
    result = result.filter((activity) => filter.types?.includes(activity.type as never))
  }
  if (filter.priorities?.length) {
    result = result.filter(
      (activity) => 'priority' in activity && filter.priorities?.includes(activity.priority as never),
    )
  }
  if (filter.statuses?.length) {
    result = result.filter(
      (activity) => 'status' in activity && filter.statuses?.includes(activity.status as never),
    )
  }
  if (filter.subjectIds?.length) {
    result = result.filter(
      (activity) => activity.subjectId && filter.subjectIds?.includes(activity.subjectId),
    )
  }
  if (filter.search?.trim()) {
    const term = normalizeText(filter.search)
    result = result.filter((activity) => activitySearchText(activity).includes(term))
  }
  if (filter.dateFrom) {
    const from = new Date(filter.dateFrom).getTime()
    result = result.filter((activity) => {
      const date = getEventDate(activity)
      // Atividades sem data permanecem visíveis em filtros de período.
      return date ? date.getTime() >= from : true
    })
  }
  if (filter.dateTo) {
    const to = new Date(filter.dateTo)
    to.setHours(23, 59, 59, 999)
    result = result.filter((activity) => {
      const date = getEventDate(activity)
      return date ? date.getTime() <= to.getTime() : true
    })
  }

  const sortBy = filter.sortBy ?? 'dueDate'
  const direction = filter.sortOrder === 'desc' ? -1 : 1

  result.sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title, 'pt-BR') * direction
    if (sortBy === 'createdAt') {
      return (a.createdAt.getTime() - b.createdAt.getTime()) * direction
    }
    if (sortBy === 'priority') {
      const aWeight = 'priority' in a ? PRIORITY_WEIGHT[a.priority] ?? 0 : 0
      const bWeight = 'priority' in b ? PRIORITY_WEIGHT[b.priority] ?? 0 : 0
      return (aWeight - bWeight) * direction
    }
    const aDate = getEventDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bDate = getEventDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return (aDate - bDate) * direction
  })

  return result
}
