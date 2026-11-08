import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '@/features/activities/infrastructure/activityRepository'
import { TrashBin } from '@/features/activities/presentation/components/TrashBin'

export const metadata: Metadata = { title: 'Lixeira' }

export default async function TrashPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const repository = await getActivityRepository()
  const activities = await repository.getDeleted(user.id)

  return (
    <div className="page-shell max-w-3xl">
      <Link href="/activities" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar para tarefas
      </Link>
      <header className="mb-5">
        <p className="eyebrow mb-1">Lixeira</p>
        <h1 className="section-heading">Atividades excluídas</h1>
        <p className="mt-1 text-sm text-muted">
          Você tem 30 dias para restaurar uma atividade antes da exclusão permanente.
        </p>
      </header>
      <TrashBin activities={activities} />
    </div>
  )
}
