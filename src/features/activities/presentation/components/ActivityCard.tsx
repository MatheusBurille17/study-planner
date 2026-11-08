'use client'

import Link from 'next/link'
import { Check, Clock3, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Activity } from '@/shared/types/activity'
import {
  ASSIGNMENT_STATUS_LABELS,
  AssignmentStatus,
  ExamType,
  PRIORITY_LABELS,
  Priority,
  TASK_STATUS_LABELS,
  TaskStatus,
} from '@/shared/types/activity'
import { ActivityTypeBadge } from './ActivityTypeBadge'
import { cn } from '@/shared/utils/classNames'
import {
  formatDateShort,
  formatTime,
  getDaysRemaining,
  isOverdue,
  relativeDayLabel,
  urgencyLevel,
} from '@/shared/utils/dateHelpers'

interface ActivityCardProps {
  activity: Activity
  subjectName?: string
  subjectColor?: string
  onToggleStatus?: (activity: Activity) => void
  onEdit?: (activity: Activity) => void
  onDelete?: (activity: Activity) => void
  compact?: boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelected?: (activity: Activity) => void
}

function dueDateOf(activity: Activity): Date | undefined {
  if (activity.type === 'task' || activity.type === 'assignment') return activity.dueDate
  if (activity.type === 'exam' || activity.type === 'seminar') return activity.date
  return undefined
}

function statusOf(activity: Activity): { label: string; completed: boolean } | null {
  if (activity.type === 'task') {
    return {
      label: TASK_STATUS_LABELS[activity.status],
      completed: activity.status === TaskStatus.COMPLETED,
    }
  }
  if (activity.type === 'assignment') {
    return {
      label: ASSIGNMENT_STATUS_LABELS[activity.status],
      completed: activity.status !== AssignmentStatus.PENDING,
    }
  }
  return null
}

export function ActivityCard({
  activity,
  subjectName,
  subjectColor,
  onToggleStatus,
  onEdit,
  onDelete,
  compact,
  selectable,
  selected,
  onToggleSelected,
}: ActivityCardProps) {
  const dueDate = dueDateOf(activity)
  const urgency = urgencyLevel(dueDate)
  const status = statusOf(activity)
  const overdue = !status?.completed && isOverdue(dueDate)
  const days = getDaysRemaining(dueDate)

  const urgencyClass = overdue
    ? 'bg-rose/40 text-[#8a3d52]'
    : urgency === 'high'
      ? 'bg-rose/30 text-[#8a3d52]'
      : urgency === 'medium'
        ? 'bg-butter/40 text-[#7a6422]'
        : 'bg-sage/30 text-[#3c6b4d]'

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card',
        status?.completed && 'opacity-70',
        compact && 'p-3',
      )}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <label className="mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-surface">
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onChange={() => onToggleSelected?.(activity)}
              className="sr-only"
              aria-label={`Selecionar ${activity.title}`}
            />
            <span className={cn('h-3 w-3 rounded-sm', selected ? 'bg-primary' : 'bg-transparent')} />
          </label>
        )}
        {onToggleStatus && activity.type === 'task' && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              onToggleStatus(activity)
            }}
            aria-label={
              activity.status === TaskStatus.COMPLETED ? 'Marcar como a fazer' : 'Marcar como concluída'
            }
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
              activity.status === TaskStatus.COMPLETED
                ? 'border-[#78b48c] bg-[#78b48c] text-white'
                : 'border-line bg-surface text-transparent hover:border-primary/40',
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ActivityTypeBadge type={activity.type} />
            {'priority' in activity && activity.type === 'task' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  activity.priority === Priority.HIGH
                    ? 'bg-rose/30 text-[#8a3d52]'
                    : activity.priority === Priority.MEDIUM
                      ? 'bg-butter/40 text-[#7a6422]'
                      : 'bg-sage/30 text-[#3c6b4d]',
                )}
              >
                {PRIORITY_LABELS[activity.priority as Priority]}
              </span>
            )}
            {activity.type === 'exam' && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] text-primary-700">
                {activity.examType === ExamType.WRITTEN
                  ? 'Escrita'
                  : activity.examType === ExamType.ORAL
                    ? 'Oral'
                    : 'Prática'}
              </span>
            )}
          </div>

          <Link href={`/activities/${activity.id}`} className="mt-1.5 block">
            <h3
              className={cn(
                'line-clamp-2 font-serif text-[17px] leading-snug text-ink transition-colors group-hover:text-primary-700',
                status?.completed && 'line-through decoration-muted/50',
                compact && 'text-[15px]',
              )}
            >
              {activity.title}
            </h3>
          </Link>

          {!compact && activity.description && (
            <p className="mt-1 line-clamp-1 text-xs text-muted">{activity.description}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            {subjectName && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: subjectColor ?? '#c4b5fd' }}
                />
                {subjectName}
              </span>
            )}
            {dueDate && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {formatDateShort(dueDate)}
                {(activity.type === 'task' || activity.type === 'assignment') && activity.dueTime
                  ? ` · ${formatTime(activity.dueTime)}`
                  : activity.type === 'exam' && activity.time
                    ? ` · ${formatTime(activity.time)}`
                    : ''}
              </span>
            )}
            {activity.type === 'exam' && activity.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {activity.location}
              </span>
            )}
            {dueDate && (
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-medium', urgencyClass)}>
                {relativeDayLabel(dueDate)}
              </span>
            )}
            {status && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5',
                  status.completed ? 'bg-sage/40 text-[#3c6b4d]' : 'bg-line/60 text-muted',
                )}
              >
                {status.label}
              </span>
            )}
            {days !== null && days < 0 && !status?.completed && (
              <span className="rounded-full bg-[#ef4444]/10 px-2 py-0.5 text-[#b91c1c]">Atrasada</span>
            )}
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(activity)}
                className="rounded-full p-1.5 text-muted hover:bg-primary-50 hover:text-primary"
                aria-label="Editar atividade"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(activity)}
                className="rounded-full p-1.5 text-muted hover:bg-rose/20 hover:text-[#8a3d52]"
                aria-label="Excluir atividade"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
