import type { ActivityRepository, SubjectRepository } from '@/features/activities/domain/repository'
import type { CalendarFilters, CalendarResponse, CalendarViewMode } from '@/shared/types/calendarModels'
import {
  activitiesInRange,
  formatCalendarData,
  getViewRange,
} from '../formatters/formatCalendarData'

/** Caso de uso: montar os dados do calendário para um intervalo e filtros. */
export async function getCalendarData(
  userId: string,
  view: CalendarViewMode,
  reference: Date,
  filters: CalendarFilters,
  activityRepository: ActivityRepository,
  subjectRepository: SubjectRepository,
): Promise<CalendarResponse> {
  const [activities, subjects] = await Promise.all([
    activityRepository.getByUserId(userId),
    subjectRepository.list(userId),
  ])

  const formatted = formatCalendarData(activities, subjects, filters)
  const range = getViewRange(view, reference)
  const visible = activitiesInRange(formatted, range.start, range.end)

  return {
    view,
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
    activities: visible,
    subjects: subjects.map((subject) => ({ id: subject.id, name: subject.name, color: subject.color })),
    generatedAt: new Date().toISOString(),
  }
}
