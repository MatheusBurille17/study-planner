import { differenceInCalendarDays, startOfDay } from 'date-fns'
import type { Activity, Assignment, Exam, Task } from '@/shared/types/activity'
import { AssignmentStatus, TaskStatus } from '@/shared/types/activity'
import type { CalendarUrgency } from '@/shared/types/calendarModels'

export function isTask(activity: Activity): activity is Task {
  return activity.type === 'task'
}

export function isExam(activity: Activity): activity is Exam {
  return activity.type === 'exam'
}

export function isAssignment(activity: Activity): activity is Assignment {
  return activity.type === 'assignment'
}

/** Data de exibição da atividade no calendário. */
export function getActivityDate(activity: Activity): Date | undefined {
  if (activity.type === 'task' || activity.type === 'assignment') return activity.dueDate
  if (activity.type === 'exam' || activity.type === 'seminar') return activity.date
  return undefined
}

/** Horário (HH:mm) da atividade, se houver. */
export function getActivityTime(activity: Activity): string | undefined {
  if (activity.type === 'task' || activity.type === 'assignment') return activity.dueTime
  if (activity.type === 'exam' || activity.type === 'seminar') return activity.time
  return undefined
}

export function isActivityCompleted(activity: Activity): boolean {
  if (isTask(activity)) return activity.status === TaskStatus.COMPLETED
  if (isAssignment(activity)) return activity.status !== AssignmentStatus.PENDING
  return false
}

/**
 * Urgência baseada nos dias restantes:
 * <= 0 crítico, 1-3 alto, 4-7 médio, 8+ baixo.
 */
export function calculateUrgency(date: Date | undefined, now: Date = new Date()): CalendarUrgency {
  if (!date) return 'low'
  const days = differenceInCalendarDays(startOfDay(date), startOfDay(now))
  if (days <= 0) return 'critical'
  if (days <= 3) return 'high'
  if (days <= 7) return 'medium'
  return 'low'
}

export function isActivityOverdue(activity: Activity, now: Date = new Date()): boolean {
  const date = getActivityDate(activity)
  if (!date) return false
  if (isActivityCompleted(activity)) return false
  return startOfDay(date) < startOfDay(now)
}

export function daysUntil(date: Date | undefined, now: Date = new Date()): number | null {
  if (!date) return null
  return differenceInCalendarDays(startOfDay(date), startOfDay(now))
}
