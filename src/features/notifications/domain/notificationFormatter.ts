import { format, isSameDay, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Activity, Assignment, Exam, Task } from '@/shared/types/activity'

export interface FormattedNotification {
  title: string
  body: string
}

export function truncateSubject(value: string, max = 30): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

export function formatNotificationDate(date: Date): string {
  if (isSameDay(date, new Date())) return 'Hoje'
  if (isTomorrow(date)) return 'Amanhã'
  return format(date, "dd 'de' MMMM", { locale: ptBR })
}

export function formatNotificationTime(date: Date): string {
  return format(date, 'HH:mm')
}

export function formatTimeRemaining(hoursUntil: number): string {
  if (hoursUntil <= 0) return 'agora'
  if (hoursUntil < 1) return `em ${Math.max(1, Math.round(hoursUntil * 60))} minutos`
  if (hoursUntil < 24) return `em ${Math.round(hoursUntil)} horas`
  const days = Math.round(hoursUntil / 24)
  return `em ${days} ${days === 1 ? 'dia' : 'dias'}`
}

function activityLabel(activity: Activity): string {
  if (activity.type === 'exam') return 'Prova'
  if (activity.type === 'assignment') return 'Entrega'
  return 'Tarefa'
}

function activityDate(activity: Activity): Date | undefined {
  if (activity.type === 'task' || activity.type === 'assignment') return activity.dueDate
  if (activity.type === 'exam') return activity.date
  return undefined
}

function activityTime(activity: Activity): string | undefined {
  if (activity.type === 'task' || activity.type === 'assignment') return activity.dueTime
  if (activity.type === 'exam') return activity.time
  return undefined
}

/**
 * Pretty printer em português (BR).
 * Título: "Prova: Cálculo I"; corpo: "15 de março às 10:00 · em 1 dia".
 */
export function formatNotificationMessage(
  activity: Activity,
  subjectName?: string,
  now: Date = new Date(),
): FormattedNotification {
  const date = activityDate(activity)
  const time = activityTime(activity)
  const subject = truncateSubject(subjectName ?? 'Sem disciplina')
  const title = `${activityLabel(activity)}: ${subject}`

  if (!date) {
    return { title, body: truncateSubject(activity.title, 60) }
  }

  const datePart = formatNotificationDate(date)
  const timePart = time ? ` às ${time.slice(0, 5)}` : ''
  const hoursUntil = (date.getTime() - now.getTime()) / 3_600_000
  const remaining = formatTimeRemaining(hoursUntil)

  return {
    title: truncateSubject(title, 60),
    body: `${datePart}${timePart} · ${remaining} — ${truncateSubject(activity.title, 60)}`,
  }
}

export function formatTaskNotification(activity: Task, subjectName?: string): FormattedNotification {
  return formatNotificationMessage(activity, subjectName)
}

export function formatExamNotification(activity: Exam, subjectName?: string): FormattedNotification {
  return formatNotificationMessage(activity, subjectName)
}

export function formatAssignmentNotification(activity: Assignment, subjectName?: string): FormattedNotification {
  return formatNotificationMessage(activity, subjectName)
}
