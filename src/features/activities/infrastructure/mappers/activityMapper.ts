import type { Activity } from '@/shared/types/activity'

/** Converte Datas para ISO ao persistir em JSON. */
export function serializeActivity(activity: Activity): Record<string, unknown> {
  return {
    ...activity,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
    ...(activity.type === 'task' || activity.type === 'assignment'
      ? { dueDate: activity.dueDate?.toISOString() }
      : {}),
    ...(activity.type === 'exam' || activity.type === 'seminar'
      ? { date: activity.date?.toISOString() }
      : {}),
    ...(activity.type === 'assignment'
      ? {
          submittedAt: activity.submittedAt?.toISOString(),
          gradedAt: activity.gradedAt?.toISOString(),
        }
      : {}),
    deletedAt: activity.deletedAt?.toISOString(),
    reminders: (activity.reminders ?? []).map((reminder) => ({
      ...reminder,
      reminderTimestamp: reminder.reminderTimestamp.toISOString(),
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
      firedAt: reminder.firedAt?.toISOString(),
    })),
  }
}

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** Converte dados persistidos de volta para entidades de domínio. */
export function deserializeActivity(row: Record<string, unknown>): Activity {
  const base = {
    ...row,
    createdAt: asDate(row.createdAt) ?? new Date(),
    updatedAt: asDate(row.updatedAt) ?? new Date(),
    dueDate: asDate(row.dueDate),
    date: asDate(row.date),
    submittedAt: asDate(row.submittedAt),
    gradedAt: asDate(row.gradedAt),
    deletedAt: asDate(row.deletedAt),
    reminders: Array.isArray(row.reminders)
      ? row.reminders.map((reminder) => {
          const value = reminder as Record<string, unknown>
          return {
            ...value,
            reminderTimestamp: asDate(value.reminderTimestamp) ?? new Date(),
            createdAt: asDate(value.createdAt) ?? new Date(),
            updatedAt: asDate(value.updatedAt) ?? new Date(),
            firedAt: asDate(value.firedAt),
          }
        })
      : [],
  } as unknown as Activity
  return base
}
