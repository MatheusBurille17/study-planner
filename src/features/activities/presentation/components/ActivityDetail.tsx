'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { Activity } from '@/shared/types/activity'
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TYPE_LABELS,
  EXAM_TYPE_LABELS,
  PRIORITY_LABELS,
  REMINDER_TYPE_LABELS,
  TASK_STATUS_LABELS,
  type Assignment,
  type Exam,
  type Task,
} from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import { ActivityTypeBadge } from './ActivityTypeBadge'
import { DeleteActivityDialog } from './DeleteActivityDialog'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/components/ui/toast'
import { toggleActivityStatusAction } from '../actions/toggleActivityStatus'
import {
  formatDate,
  formatDateShort,
  formatDateTime,
  relativeDayLabel,
  urgencyLevel,
} from '@/shared/utils/dateHelpers'
import { cn } from '@/shared/utils/classNames'
import { formatMinutes } from '@/shared/utils/formatting'

export function ActivityDetail({ activity, subject }: { activity: Activity; subject?: Subject }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const toast = useToast()

  const task = activity.type === 'task' ? (activity as Task) : null
  const exam = activity.type === 'exam' ? (activity as Exam) : null
  const assignment = activity.type === 'assignment' ? (activity as Assignment) : null
  const dueDate = task?.dueDate ?? assignment?.dueDate ?? exam?.date
  const completed =
    task?.status === 'COMPLETED' || (assignment ? assignment.status !== 'PENDING' : false)
  const urgency = urgencyLevel(dueDate)

  async function toggleStatus() {
    if (!task && !assignment) return
    setIsUpdating(true)
    const next =
      task && task.status !== 'COMPLETED'
        ? 'COMPLETED'
        : task
          ? 'TODO'
          : assignment?.status === 'PENDING'
            ? 'SUBMITTED'
            : 'PENDING'
    const result = await toggleActivityStatusAction(activity.id, next)
    setIsUpdating(false)
    if (!result.success) {
      toast.error('Não foi possível atualizar', { description: result.error?.message })
      return
    }
    toast.success('Status atualizado')
    router.refresh()
  }

  return (
    <div className="page-shell max-w-4xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href={activity.type === 'task' ? '/activities' : '/assessments'} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/activities/${activity.id}/edit`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-medium text-ink hover:border-primary/30 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Link>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-medium text-[#8a3d52] hover:border-rose/60 hover:bg-rose/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        </div>
      </div>

      <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
        <div className="border-b border-line bg-gradient-to-br from-primary-50 via-surface to-butter/20 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <ActivityTypeBadge type={activity.type} />
            {task && (
              <span className="rounded-full bg-butter/40 px-2.5 py-1 text-[11px] text-[#7a6422]">
                Prioridade {PRIORITY_LABELS[task.priority]}
              </span>
            )}
            {dueDate && (
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  completed
                    ? 'bg-sage/40 text-[#3c6b4d]'
                    : urgency === 'high'
                      ? 'bg-rose/40 text-[#8a3d52]'
                      : urgency === 'medium'
                        ? 'bg-butter/50 text-[#7a6422]'
                        : 'bg-sage/30 text-[#3c6b4d]',
                )}
              >
                {completed ? 'Concluída' : relativeDayLabel(dueDate)}
              </span>
            )}
          </div>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">{activity.title}</h1>
          {activity.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{activity.description}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            {subject && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                {subject.name}
              </span>
            )}
            {dueDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {formatDate(dueDate, "EEEE, dd 'de' MMMM 'de' yyyy")}
              </span>
            )}
            {((task && task.dueTime) || exam?.time || assignment?.dueTime) && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {task?.dueTime ?? exam?.time ?? assignment?.dueTime}
              </span>
            )}
            {exam?.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {exam.location}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <section className="space-y-4">
            <h2 className="font-serif text-lg text-ink">Detalhes</h2>
            {task && (
              <>
                <DetailRow label="Status" value={TASK_STATUS_LABELS[task.status]} />
                <DetailRow label="Prioridade" value={PRIORITY_LABELS[task.priority]} />
                <DetailRow label="Tempo estimado" value={formatMinutes(task.estimatedTimeMinutes)} />
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">Tags</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {task.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] text-primary-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {exam && (
              <>
                <DetailRow label="Tipo de prova" value={EXAM_TYPE_LABELS[exam.examType]} />
                {exam.content && exam.content.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">Conteúdo</p>
                    <ul className="mt-1.5 space-y-1 text-sm text-ink">
                      {exam.content.map((topic) => (
                        <li key={topic} className="flex items-start gap-2">
                          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {exam.notes && <DetailRow label="Observações" value={exam.notes} multiline />}
              </>
            )}
            {assignment && (
              <>
                <DetailRow label="Tipo de trabalho" value={ASSIGNMENT_TYPE_LABELS[assignment.assignmentType]} />
                <DetailRow label="Status" value={ASSIGNMENT_STATUS_LABELS[assignment.status]} />
                {assignment.criteria && <DetailRow label="Critérios" value={assignment.criteria} multiline />}
              </>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-serif text-lg text-ink">
              <Bell className="h-4 w-4 text-primary" /> Lembretes
            </h2>
            {activity.reminders && activity.reminders.length > 0 ? (
              <ul className="space-y-2">
                {activity.reminders.map((reminder) => (
                  <li key={reminder.id} className="flex items-center justify-between rounded-xl border border-line bg-background px-3 py-2.5 text-xs">
                    <span className="text-ink">{REMINDER_TYPE_LABELS[reminder.reminderType]}</span>
                    <span className="text-muted">{formatDateTime(reminder.reminderTimestamp)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
                Nenhum lembrete configurado.
              </p>
            )}

            {(task || assignment) && (
              <Button variant={completed ? 'outline' : 'soft'} className="w-full" onClick={toggleStatus} disabled={isUpdating}>
                {completed ? (
                  'Reabrir atividade'
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Marcar como concluída
                  </>
                )}
              </Button>
            )}

            <div className="rounded-xl bg-primary-50/60 p-3 text-[11px] text-muted">
              Criada em {formatDateTime(activity.createdAt)} · Atualizada em {formatDateTime(activity.updatedAt)}
            </div>
          </section>
        </div>
      </article>

      <DeleteActivityDialog activity={activity} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-0.5 text-sm text-ink', multiline && 'leading-relaxed')}>{value}</p>
    </div>
  )
}
