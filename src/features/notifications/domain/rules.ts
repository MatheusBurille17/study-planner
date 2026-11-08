import type { Activity } from '@/shared/types/activity'
import type { NotificationPreferences } from '@/shared/types/notification'
import { calculateReminderTime } from '@/shared/constants/reminders'

/** Verifica se o horário atual está dentro do silêncio (suporta virada de meia-noite). */
export function isQuietHours(now: Date, start?: string, end?: string): boolean {
  if (!start || !end) return false
  const minutes = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  if ([startH, startM, endH, endM].some((value) => !Number.isFinite(value))) return false
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes === endMinutes) return false
  if (startMinutes < endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes
  }
  // Atravessa meia-noite, ex.: 22:00 → 08:00
  return minutes >= startMinutes || minutes < endMinutes
}

export function isTypeEnabled(
  preferences: NotificationPreferences,
  type: Activity['type'] | string,
): boolean {
  if (!preferences.remindersEnabled) return false
  if (type === 'exam') return preferences.examsEnabled
  if (type === 'assignment') return preferences.assignmentsEnabled
  return preferences.tasksEnabled
}

/** Próximo lembrete: usa os configurados na atividade ou a regra padrão. */
export function nextReminderForActivity(
  activity: Activity,
  preferences: NotificationPreferences,
  now: Date = new Date(),
): Date | null {
  const date =
    activity.type === 'task' || activity.type === 'assignment'
      ? activity.dueDate
      : activity.type === 'exam'
        ? activity.date
        : undefined
  if (!date) return null

  const configured = (activity.reminders ?? [])
    .filter((reminder) => reminder.isActive && !reminder.wasFired)
    .map((reminder) => reminder.reminderTimestamp)
    .filter((timestamp) => timestamp.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())

  if (configured.length > 0) return configured[0]

  return calculateReminderTime(activity.type, date, preferences.taskRemindersHours, now)
}

export function shouldSendNotification(
  activity: Activity,
  preferences: NotificationPreferences,
  now: Date = new Date(),
): { send: boolean; reason?: string; timestamp?: Date } {
  if (!isTypeEnabled(preferences, activity.type)) {
    return { send: false, reason: 'Tipo de lembrete desabilitado' }
  }
  if (isQuietHours(now, preferences.quietHoursStart, preferences.quietHoursEnd)) {
    return { send: false, reason: 'Horário de silêncio' }
  }
  const timestamp = nextReminderForActivity(activity, preferences, now)
  if (!timestamp) return { send: false, reason: 'Atividade sem data' }
  return { send: true, timestamp }
}

/** Helper exibido nas configurações. */
export function describePreferences(preferences: NotificationPreferences): string {
  if (!preferences.remindersEnabled) return 'Lembretes desativados'
  const parts: string[] = []
  if (preferences.examsEnabled) parts.push('provas 24h antes')
  if (preferences.assignmentsEnabled) parts.push('entregas 24h antes')
  if (preferences.tasksEnabled) parts.push(`tarefas ${preferences.taskRemindersHours}h antes`)
  return parts.length ? `Você receberá lembretes de ${parts.join(', ')}.` : 'Nenhum tipo de lembrete ativo'
}
