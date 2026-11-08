import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getActivityRepository, getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import { ActivityEditor } from '@/features/activities/presentation/components/ActivityEditor'

export const metadata: Metadata = { title: 'Editar atividade' }

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const activityRepository = await getActivityRepository()
  const activity = await activityRepository.getById(id, user.id)
  if (!activity) notFound()

  const subjectRepository = await getSubjectRepository()
  const subjects = await subjectRepository.list(user.id)

  return (
    <div className="page-shell max-w-3xl">
      <Link href={`/activities/${activity.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar para detalhes
      </Link>
      <header className="mb-5">
        <p className="eyebrow mb-1">Editar</p>
        <h1 className="section-heading">Editar atividade</h1>
        <p className="mt-1 text-sm text-muted">Atualize os dados e salve as alterações.</p>
      </header>

      <ActivityEditor activity={activity} subjects={subjects} />
    </div>
  )
}
