import {
  ReminderType,
  type ReminderInput,
  type ReminderOffset,
} from '@/shared/types/activity'
import { REMINDER_OFFSET_MINUTES, REMINDER_UNIT_MINUTES } from '@/shared/constants/reminders'
import { startOfDay } from 'date-fns'

export class ActivityRuleError extends Error {
  constructor(
    message: string,
    public code: string = 'VALIDATION_ERROR',
    public field?: string,
  ) {
    super(message)
    this.name = 'ActivityRuleError'
  }
}

/** Rejeita datas de prazo anteriores a hoje (comparação por dia local). */
export function validateDeadline(date: Date, now: Date = new Date()): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new ActivityRuleError('Data inválida', 'INVALID_DATE', 'dueDate')
  }
  if (startOfDay(date) < startOfDay(now)) {
    throw new ActivityRuleError('Data não pode estar no passado', 'PAST_DATE', 'dueDate')
  }
}

/** Lembrete deve estar no futuro e antes do evento. */
export function validateReminderTimestamp(
  reminderDate: Date,
  eventDate: Date,
  now: Date = new Date(),
): void {
  if (Number.isNaN(reminderDate.getTime())) {
    throw new ActivityRuleError('Data do lembrete inválida', 'INVALID_REMINDER_DATE', 'reminders')
  }
  if (reminderDate.getTime() >= eventDate.getTime()) {
    throw new ActivityRuleError(
      'O lembrete deve ser anterior ao evento',
      'REMINDER_AFTER_EVENT',
      'reminders',
    )
  }
  if (reminderDate.getTime() < now.getTime()) {
    throw new ActivityRuleError(
      'O lembrete não pode estar no passado',
      'REMINDER_IN_PAST',
      'reminders',
    )
  }
}

/** Converte offset customizado em minutos. */
export function offsetToMinutes(offset?: ReminderOffset): number {
  if (!offset) return 0
  const multiplier = REMINDER_UNIT_MINUTES[offset.unit] ?? 1
  return Math.max(0, Math.min(43_200, offset.value * multiplier))
}

/**
 * Calcula o timestamp absoluto de um lembrete.
 *
 * Regras:
 * - ON_DAY, ONE_DAY_BEFORE, TWO_DAYS_BEFORE e CUSTOM em DAYS usam a data
 *   do calendário e a hora escolhida (ex.: 1 dia antes às 17:00).
 * - Lembretes em horas/minutos subtraem o offset do horário do evento.
 */
export function calculateReminderTimestamp(
  eventDate: Date,
  reminderType: ReminderType,
  reminderTime: string,
  offset?: ReminderOffset,
): Date {
  const [hours, minutes] = reminderTime.split(':').map(Number)
  const safeHours = Number.isFinite(hours) ? Math.min(23, Math.max(0, hours)) : 0
  const safeMinutes = Number.isFinite(minutes) ? Math.min(59, Math.max(0, minutes)) : 0

  const isCustom = reminderType === ReminderType.CUSTOM
  const offsetMinutes = isCustom ? offsetToMinutes(offset) : REMINDER_OFFSET_MINUTES[reminderType] ?? 0
  const usesCalendarDays =
    reminderType === ReminderType.ON_DAY ||
    reminderType === ReminderType.ONE_DAY_BEFORE ||
    reminderType === ReminderType.TWO_DAYS_BEFORE ||
    (isCustom && offset?.unit === 'DAYS')

  if (usesCalendarDays) {
    const daysBefore = Math.round(offsetMinutes / (24 * 60))
    const result = new Date(eventDate)
    result.setDate(result.getDate() - daysBefore)
    result.setHours(safeHours, safeMinutes, 0, 0)
    return result
  }

  return new Date(eventDate.getTime() - offsetMinutes * 60 * 1000)
}

export function validateMaxReminders(reminders: ReminderInput[] | undefined, max = 3): void {
  if (reminders && reminders.length > max) {
    throw new ActivityRuleError(`Máximo de ${max} lembretes por atividade`, 'MAX_REMINDERS', 'reminders')
  }
}

export function validateNoDuplicateReminders(
  reminders: Array<{ reminderTimestamp: Date }>,
): void {
  const seen = new Set<number>()
  for (const reminder of reminders) {
    const key = reminder.reminderTimestamp.getTime()
    if (seen.has(key)) {
      throw new ActivityRuleError('Não é possível ter lembretes duplicados', 'DUPLICATE_REMINDER', 'reminders')
    }
    seen.add(key)
  }
}

/** Campos obrigatórios/opcionais por tipo de atividade. */
export function getFieldRequirements(type: 'task' | 'exam' | 'assignment' | 'seminar'): {
  required: string[]
  optional: string[]
} {
  switch (type) {
    case 'task':
      return {
        required: ['title', 'priority', 'status'],
        optional: ['description', 'subjectId', 'dueDate', 'dueTime', 'estimatedTimeMinutes', 'tags', 'reminders'],
      }
    case 'exam':
      return {
        required: ['subjectId', 'date', 'examType'],
        optional: ['time', 'content', 'location', 'notes', 'reminders'],
      }
    case 'assignment':
      return {
        required: ['subjectId', 'title', 'description', 'dueDate', 'assignmentType'],
        optional: ['dueTime', 'criteria', 'status', 'reminders'],
      }
    case 'seminar':
      return {
        required: ['subjectId', 'date'],
        optional: ['time', 'topic', 'location', 'format', 'responsible', 'reminders'],
      }
  }
}

/** Data efetiva de vencimento/evento usada por regras e lembretes. */
export function getEventDate(activity: {
  type: string
  dueDate?: Date
  date?: Date
}): Date | undefined {
  return activity.dueDate ?? activity.date
}
