'use client'

import { CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import type { Activity } from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import { ActivityCard } from './ActivityCard'
import { Button } from '@/shared/components/ui/button'

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-line/70" />
        <div className="h-5 w-16 rounded-full bg-line/50" />
      </div>
      <div className="mt-3 h-4 w-3/4 rounded bg-line/70" />
      <div className="mt-2 h-3 w-1/2 rounded bg-line/50" />
      <div className="mt-4 flex gap-3">
        <div className="h-3 w-24 rounded bg-line/50" />
        <div className="h-3 w-16 rounded bg-line/50" />
      </div>
    </div>
  )
}

interface ActivityListProps {
  activities: Activity[]
  subjects: Subject[]
  total: number
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onToggleStatus?: (activity: Activity) => void
  onEdit?: (activity: Activity) => void
  onDelete?: (activity: Activity) => void
  emptyTitle?: string
  emptyDescription?: string
  selectable?: boolean
  selectedIds?: string[]
  onToggleSelected?: (activity: Activity) => void
}

export function ActivityList({
  activities,
  subjects,
  total,
  isLoading,
  hasMore,
  onLoadMore,
  onToggleStatus,
  onEdit,
  onDelete,
  emptyTitle = 'Nenhuma atividade por aqui',
  emptyDescription = 'Que tal criar sua primeira atividade para começar a organizar a semana?',
  selectable,
  selectedIds = [],
  onToggleSelected,
}: ActivityListProps) {
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]))

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary">
          <CalendarPlus className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-serif text-xl text-ink">{emptyTitle}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted">{emptyDescription}</p>
        <Link
          href="/activities/new"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-white shadow-soft hover:bg-primary-700"
        >
          Criar atividade
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3" aria-live="polite">
        {activities.map((activity) => {
          const subject = activity.subjectId ? subjectById.get(activity.subjectId) : undefined
          return (
            <ActivityCard
              key={activity.id}
              activity={activity}
              subjectName={subject?.name}
              subjectColor={subject?.color}
              onToggleStatus={onToggleStatus}
              onEdit={onEdit}
              onDelete={onDelete}
              selectable={selectable}
              selected={selectedIds.includes(activity.id)}
              onToggleSelected={onToggleSelected}
            />
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="text-xs text-muted">
          Mostrando {activities.length} de {total} {total === 1 ? 'atividade' : 'atividades'}
        </p>
        {hasMore && onLoadMore && (
          <Button variant="outline" onClick={onLoadMore} className="w-full sm:w-auto">
            Carregar mais
          </Button>
        )}
      </div>
    </div>
  )
}
