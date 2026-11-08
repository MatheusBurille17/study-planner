import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getActivityRepository, getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import { CalendarPage } from '@/features/calendar/presentation/components/CalendarPage'
import type { CalendarFilters, CalendarViewMode } from '@/shared/types/calendarModels'

export const metadata: Metadata = { title: 'Calendário' }

const FILTER_MAP: Record<string, Array<'task' | 'exam' | 'assignment'>> = {
  tasks: ['task'],
  exams: ['exam'],
  assignments: ['assignment'],
}

export default async function CalendarRoute({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; filter?: string; subject?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const view: CalendarViewMode =
    params.view === 'week' || params.view === 'day' || params.view === 'month' ? params.view : 'month'
  const parsedDate = params.date ? new Date(`${params.date}T12:00:00`) : new Date()
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
  const filters: CalendarFilters = {
    types: params.filter ? FILTER_MAP[params.filter] : undefined,
    subjectId: params.subject || undefined,
  }

  const [activityRepository, subjectRepository] = await Promise.all([
    getActivityRepository(),
    getSubjectRepository(),
  ])
  const [activities, subjects] = await Promise.all([
    activityRepository.getByUserId(user.id),
    subjectRepository.list(user.id),
  ])

  return (
    <CalendarPage
      activities={activities}
      subjects={subjects}
      userId={user.id}
      initialView={view}
      initialDate={date}
      initialFilters={filters}
    />
  )
}
