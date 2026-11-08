'use client'

import type { Activity } from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import { TaskForm } from './TaskForm'
import { ExamForm } from './ExamForm'
import { AssignmentForm } from './AssignmentForm'

/**
 * Editor polimórfico de atividades.
 * Renderiza o formulário específico do tipo, sempre em modo de edição.
 */
export function ActivityEditor({ activity, subjects }: { activity: Activity; subjects: Subject[] }) {
  if (activity.type === 'task') {
    return <TaskForm subjects={subjects} initialActivity={activity} mode="edit" />
  }
  if (activity.type === 'exam') {
    return <ExamForm subjects={subjects} initialActivity={activity} mode="edit" />
  }
  if (activity.type === 'assignment') {
    return <AssignmentForm subjects={subjects} initialActivity={activity} mode="edit" />
  }
  return (
    <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
      A edição de seminários estará disponível em breve.
    </p>
  )
}
