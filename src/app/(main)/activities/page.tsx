import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getActivityRepository, getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import { ActivityListPage } from '@/features/activities/presentation/pages/ActivityListPage'
import { parseFilterCriteria } from '@/features/activities/presentation/schemas/filterSchema'
import { toURLSearchParams } from '@/features/activities/presentation/lib/searchParams'
import { ActivityType } from '@/shared/types/activity'

export const metadata: Metadata = { title: 'Tarefas' }

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const [activityRepository, subjectRepository] = await Promise.all([
    getActivityRepository(),
    getSubjectRepository(),
  ])
  const [activities, subjects] = await Promise.all([
    activityRepository.getByUserId(user.id, { types: [ActivityType.TASK] }),
    subjectRepository.list(user.id),
  ])

  return (
    <ActivityListPage
      activities={activities}
      subjects={subjects}
      userId={user.id}
      initialFilters={parseFilterCriteria(toURLSearchParams(params))}
      title="Tarefas"
      subtitle="Seus estudos, revisões e exercícios em um só lugar."
      fixedTypes={['task']}
    />
  )
}
