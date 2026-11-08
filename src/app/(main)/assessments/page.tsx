import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getActivityRepository, getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import { ActivityListPage } from '@/features/activities/presentation/pages/ActivityListPage'
import { parseFilterCriteria } from '@/features/activities/presentation/schemas/filterSchema'
import { toURLSearchParams } from '@/features/activities/presentation/lib/searchParams'
import { ActivityType } from '@/shared/types/activity'

export const metadata: Metadata = { title: 'Provas & Trabalhos' }

export default async function AssessmentsPage({
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
    activityRepository.getByUserId(user.id, { types: [ActivityType.EXAM, ActivityType.ASSIGNMENT] }),
    subjectRepository.list(user.id),
  ])

  return (
    <ActivityListPage
      activities={activities}
      subjects={subjects}
      userId={user.id}
      initialFilters={parseFilterCriteria(toURLSearchParams(params))}
      title="Provas & Trabalhos"
      subtitle="Avaliações e entregas com prazos, locais e critérios."
      fixedTypes={['exam', 'assignment']}
      showTypeTabs
    />
  )
}
