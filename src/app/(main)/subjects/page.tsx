import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getActivityRepository, getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import { SubjectManager } from '@/features/subjects/presentation/components/SubjectManager'

export const metadata: Metadata = { title: 'Disciplinas' }

export default async function SubjectsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [subjectRepository, activityRepository] = await Promise.all([
    getSubjectRepository(),
    getActivityRepository(),
  ])
  const [subjects, activities] = await Promise.all([
    subjectRepository.list(user.id),
    activityRepository.getByUserId(user.id),
  ])

  const activityCounts = activities.reduce<Record<string, number>>((counts, activity) => {
    if (activity.subjectId) counts[activity.subjectId] = (counts[activity.subjectId] ?? 0) + 1
    return counts
  }, {})

  return (
    <div className="page-shell max-w-4xl">
      <header className="mb-5">
        <p className="eyebrow mb-1">Sua grade</p>
        <h1 className="section-heading">Disciplinas</h1>
        <p className="mt-1 text-sm text-muted">Cores, códigos e professores das suas matérias.</p>
      </header>

      <SubjectManager subjects={subjects} activityCounts={activityCounts} />
    </div>
  )
}
