import type { Activity } from '@/shared/types/activity'
import { toDate } from '@/shared/utils/dateHelpers'

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

/** Converte dados persistidos de volta para entidades de domínio. */
export function deserializeActivity(row: Record<string, unknown>): Activity {
  const base = {
    ...row,
    createdAt: toDate(row.createdAt) ?? new Date(),
    updatedAt: toDate(row.updatedAt) ?? new Date(),
    dueDate: toDate(row.dueDate),
    date: toDate(row.date),
    submittedAt: toDate(row.submittedAt),
    gradedAt: toDate(row.gradedAt),
    deletedAt: toDate(row.deletedAt),
    reminders: Array.isArray(row.reminders)
      ? row.reminders.map((reminder) => {
          const value = reminder as Record<string, unknown>
          return {
            ...value,
            reminderTimestamp: toDate(value.reminderTimestamp) ?? new Date(),
            createdAt: toDate(value.createdAt) ?? new Date(),
            updatedAt: toDate(value.updatedAt) ?? new Date(),
            firedAt: toDate(value.firedAt),
          }
        })
      : [],
  } as unknown as Activity
  return base
}
