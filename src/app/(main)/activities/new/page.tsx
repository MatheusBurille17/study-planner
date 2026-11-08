import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/shared/lib/auth/helpers'
import { getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import { TaskForm } from '@/features/activities/presentation/components/TaskForm'
import { ExamForm } from '@/features/activities/presentation/components/ExamForm'
import { AssignmentForm } from '@/features/activities/presentation/components/AssignmentForm'
import { cn } from '@/shared/utils/classNames'

export const metadata: Metadata = { title: 'Nova atividade' }

const TYPE_TABS = [
  { type: 'task', label: 'Tarefa' },
  { type: 'exam', label: 'Prova' },
  { type: 'assignment', label: 'Trabalho' },
] as const

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const params = await searchParams
  const type = TYPE_TABS.some((tab) => tab.type === params.type) ? (params.type as string) : 'task'

  const subjectRepository = await getSubjectRepository()
  const subjects = await subjectRepository.list(user.id)

  return (
    <div className="page-shell max-w-3xl">
      <Link href="/activities" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <header className="mb-5">
        <p className="eyebrow mb-1">Nova atividade</p>
        <h1 className="section-heading">
          {type === 'task' ? 'Nova tarefa' : type === 'exam' ? 'Nova prova' : 'Novo trabalho'}
        </h1>
        <p className="mt-1 text-sm text-muted">Preencha o essencial e adicione lembretes se quiser.</p>
      </header>

      <div className="mb-5 flex gap-2 rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Tipo de atividade">
        {TYPE_TABS.map((tab) => (
          <Link
            key={tab.type}
            href={`/activities/new?type=${tab.type}`}
            role="tab"
            aria-selected={type === tab.type}
            className={cn(
              'flex-1 rounded-full px-4 py-2 text-center text-xs font-medium transition-colors',
              type === tab.type ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-primary-50 hover:text-primary',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {type === 'task' && <TaskForm subjects={subjects} />}
      {type === 'exam' && <ExamForm subjects={subjects} />}
      {type === 'assignment' && <AssignmentForm subjects={subjects} />}
    </div>
  )
}
