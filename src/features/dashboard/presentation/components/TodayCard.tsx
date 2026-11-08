'use client'

import Link from 'next/link'
import { Check, Clock3, Sparkles } from 'lucide-react'
import type { FormattedTask } from '../../application/formatDashboardData'
import { Priority } from '@/shared/types/activity'
import { cn } from '@/shared/utils/classNames'

interface TodayCardProps {
  tasks: FormattedTask[]
  total: number
  onToggle: (task: FormattedTask) => void
}

export function TodayCard({ tasks, total, onToggle }: TodayCardProps) {
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#eee3fb] via-[#f1e6fb] to-[#fbe7dc] p-5 shadow-card sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/40" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/20 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-[#3b2a52]">Para hoje</h2>
          <p className="mt-1 text-xs text-[#6b5a80]">
            {total === 0 ? 'Nenhuma tarefa para hoje' : `${completed} de ${total} concluídas`}
          </p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-[#5b4675] backdrop-blur">
          {Math.min(completed, total)} de {total}
        </span>
      </div>

      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#b794f6] transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso das tarefas de hoje"
        />
      </div>

      {tasks.length === 0 ? (
        <div className="relative mt-5 flex items-center gap-2 rounded-2xl bg-white/50 px-4 py-3 text-xs text-[#5b4675]">
          <Sparkles className="h-4 w-4" />
          Nada por aqui. Aproveite para respirar ou adiantar uma leitura.
        </div>
      ) : (
        <ul className="relative mt-4 space-y-2.5">
          {tasks.map((task) => {
            const done = task.status === 'COMPLETED'
            return (
              <li key={task.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onToggle(task)}
                  aria-label={done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                    done
                      ? 'border-[#4f9a72] bg-[#4f9a72] text-white'
                      : 'border-[#9b7bbd] bg-white/40 text-transparent hover:bg-white/70',
                  )}
                >
                  <Check className="h-4 w-4" />
                </button>
                <Link href={`/activities/${task.id}`} className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm text-[#3b2a52] transition-colors hover:text-[#7c3aed]',
                      done && 'line-through decoration-[#7a6a8f]/60',
                    )}
                  >
                    {task.shortTitle}
                  </span>
                </Link>
                {task.dueTime && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[#6b5a80]">
                    <Clock3 className="h-3 w-3" />
                    {task.dueTime}
                  </span>
                )}
                <span
                  className={cn(
                    'hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline',
                    task.priority === Priority.HIGH
                      ? 'bg-rose/60 text-[#7d3448]'
                      : task.priority === Priority.MEDIUM
                        ? 'bg-butter/70 text-[#6f5a1c]'
                        : 'bg-sage/60 text-[#356346]',
                  )}
                >
                  {task.priorityLabel}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
