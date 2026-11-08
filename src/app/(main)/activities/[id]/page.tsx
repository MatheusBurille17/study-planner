import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getActivityRepository, getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import { ActivityDetail } from '@/features/activities/presentation/components/ActivityDetail'

export const metadata: Metadata = { title: 'Detalhes da atividade' }

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const activityRepository = await getActivityRepository()
  const activity = await activityRepository.getById(id, user.id)
  if (!activity) notFound()

  let subject
  if (activity.subjectId) {
    const subjectRepository = await getSubjectRepository()
    subject = (await subjectRepository.getById(activity.subjectId, user.id)) ?? undefined
  }

  return <ActivityDetail activity={activity} subject={subject} />
}
