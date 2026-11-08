'use client'

import Link from 'next/link'
import { ArrowRight, Check, ListChecks } from 'lucide-react'
import type { FormattedTask } from '../../application/formatDashboardData'
import { PRIORITY_LABELS, Priority, TASK_STATUS_LABELS } from '@/shared/types/activity'
import { formatDashboardDateShort } from '../../application/formatDashboardData'
import { cn } from '@/shared/utils/classNames'

export function PendingTasksSection({
  tasks,
  total,
  onToggle,
}: {
  tasks: FormattedTask[]
  total: number
  onToggle: (task: FormattedTask) => void
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-card" aria-labelledby="pending-tasks-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="pending-tasks-heading" className="flex items-center gap-2 font-serif text-xl text-ink">
          <ListChecks className="h-4.5 w-4.5 text-primary" /> Tarefas pendentes
        </h2>
        {total > 5 && (
          <Link
            href="/activities?status=TODO,IN_PROGRESS&sort=date_asc"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            aria-label={`Ver todas as ${total} tarefas pendentes`}
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-xl bg-sage/20 px-4 py-4 text-center text-xs text-[#3c6b4d]">
          Nenhuma tarefa pendente. Bom trabalho!
        </p>
      ) : (
        <ul className="divide-y divide-line/70">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => onToggle(task)}
                aria-label={`Concluir ${task.title}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#9b7bbd] text-transparent transition-colors hover:bg-primary-50 hover:text-primary"
              >
                <Check className="h-3 w-3" />
              </button>
              <Link href={`/activities/${task.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink hover:text-primary">{task.shortTitle}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {task.subjectName}
                  {task.dueDate ? ` · ${formatDashboardDateShort(task.dueDate)}` : ' · Sem prazo'}
                  {task.dueTime ? ` · ${task.dueTime}` : ''}
                </p>
              </Link>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  task.priority === Priority.HIGH
                    ? 'bg-rose/40 text-[#8a3d52]'
                    : task.priority === Priority.MEDIUM
                      ? 'bg-butter/50 text-[#7a6422]'
                      : 'bg-sage/40 text-[#3c6b4d]',
                )}
                aria-label={`Prioridade ${PRIORITY_LABELS[task.priority]}`}
              >
                {PRIORITY_LABELS[task.priority]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {tasks.length > 0 && (
        <p className="mt-3 text-[10px] text-muted">
          {total} tarefa{total === 1 ? '' : 's'} pendente{total === 1 ? '' : 's'} no total.
        </p>
      )}
    </section>
  )
}
