import {
  ReminderType,
  type Reminder,
  type ReminderInput,
  type ReminderOffset,
} from '@/shared/types/activity'
import {
  DEFAULT_EVENT_TIME,
  REMINDER_OFFSET_MINUTES,
  REMINDER_UNIT_MINUTES,
} from '@/shared/constants/reminders'
import { startOfDay } from 'date-fns'
import { createReminderEntity } from './reminder'
import {
  addCalendarDaysAtTime,
  combineDateAndTimeInTimeZone,
  formatTimeInTimeZone,
} from '@/shared/utils/timezone'

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

/** Lembrete deve estar no futuro (na criação) e sempre antes do evento. */
export function validateReminderTimestamp(
  reminderDate: Date,
  eventDate: Date,
  now: Date = new Date(),
  allowPast = false,
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
  if (!allowPast && reminderDate.getTime() < now.getTime()) {
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

/** Minutos antes do evento para qualquer tipo de lembrete (preset ou custom). */
export function reminderOffsetMinutesFor(
  reminderType: ReminderType,
  offset?: ReminderOffset,
): number {
  if (reminderType === ReminderType.CUSTOM) return offsetToMinutes(offset)
  return REMINDER_OFFSET_MINUTES[reminderType] ?? 0
}

/**
 * Tipos que usam "dia do calendário + horário escolhido" (ex.: 1 dia antes
 * às 09:00). Os demais subtraem o offset diretamente do horário do evento.
 */
export function isCalendarDayReminder(
  reminderType: ReminderType,
  offset?: ReminderOffset,
): boolean {
  return (
    reminderType === ReminderType.ON_DAY ||
    reminderType === ReminderType.ONE_DAY_BEFORE ||
    reminderType === ReminderType.TWO_DAYS_BEFORE ||
    (reminderType === ReminderType.CUSTOM && offset?.unit === 'DAYS')
  )
}

/**
 * Calcula o timestamp absoluto de um lembrete.
 *
 * Regras:
 * - ON_DAY, ONE_DAY_BEFORE, TWO_DAYS_BEFORE e CUSTOM em DAYS: usam o dia do
 *   evento e o horário escolhido (ex.: 1 dia antes às 09:00).
 * - Lembretes em horas/minutos subtraem o offset do horário do evento.
 */
export function calculateReminderTimestamp(
  eventDate: Date,
  reminderType: ReminderType,
  reminderTime: string,
  offset?: ReminderOffset,
  timeZone?: string,
): Date {
  const offsetMinutes = reminderOffsetMinutesFor(reminderType, offset)

  if (isCalendarDayReminder(reminderType, offset)) {
    const daysBefore = Math.round(offsetMinutes / (24 * 60))
    return addCalendarDaysAtTime(eventDate, -daysBefore, reminderTime, timeZone)
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

export interface EventDateFields {
  type: string
  dueDate?: Date
  dueTime?: string
  date?: Date
  time?: string
}

/**
 * Data/hora efetiva do evento no fuso do usuário.
 * Sem horário definido, usa o fim do dia (23:59) para os cálculos relativos.
 */
export function resolveEventDateTime(
  fields: EventDateFields,
  timeZone?: string,
): Date | undefined {
  const isExamLike = fields.type === 'exam' || fields.type === 'seminar'
  const date = isExamLike ? fields.date : fields.dueDate
  if (!date) return undefined
  const time = isExamLike ? fields.time : fields.dueTime
  return combineDateAndTimeInTimeZone(date, time || DEFAULT_EVENT_TIME, timeZone)
}

export interface BuildRemindersInput {
  activityId: string
  userId: string
  eventDate?: Date
  reminders?: ReminderInput[]
  /** Lembretes atuais, usados para preservar ids e o estado de disparo. */
  previous?: Reminder[]
  now?: Date
  /** Em edição permitimos lembretes que já passaram (ficam inativos). */
  allowPast?: boolean
  timeZone?: string
}

/**
 * Constrói a lista final de lembretes de uma atividade.
 *
 * Fonte única de verdade para criação e edição: calcula o timestamp,
 * valida (limite, ordem, passado e duplicidade), preserva ids/estado dos
 * lembretes inalterados e desativa os que já passaram.
 */
export function buildReminders(input: BuildRemindersInput): Reminder[] {
  const { activityId, userId, reminders, previous = [], timeZone } = input
  validateMaxReminders(reminders)
  if (!reminders?.length) return []

  if (!input.eventDate) {
    throw new ActivityRuleError(
      'Defina a data do evento antes de adicionar lembretes',
      'MISSING_EVENT_DATE',
      'reminders',
    )
  }

  const eventDate = input.eventDate
  const now = input.now ?? new Date()
  const seen = new Set<number>()
  const result: Reminder[] = []

  for (const reminderInput of reminders) {
    const timestamp = calculateReminderTimestamp(
      eventDate,
      reminderInput.reminderType,
      reminderInput.reminderTime,
      reminderInput.reminderOffset,
      timeZone,
    )

    validateReminderTimestamp(timestamp, eventDate, now, input.allowPast ?? false)

    const key = timestamp.getTime()
    if (seen.has(key)) {
      throw new ActivityRuleError(
        'Não é possível ter lembretes duplicados',
        'DUPLICATE_REMINDER',
        'reminders',
      )
    }
    seen.add(key)

    const offsetMinutes = reminderOffsetMinutesFor(
      reminderInput.reminderType,
      reminderInput.reminderOffset,
    )
    const existing = previous.find(
      (candidate) =>
        candidate.reminderType === reminderInput.reminderType &&
        candidate.reminderOffsetMinutes === offsetMinutes &&
        Math.abs(candidate.reminderTimestamp.getTime() - key) < 60_000,
    )

    // Para lembretes relativos o horário é consequência do evento.
    const reminderTime = isCalendarDayReminder(
      reminderInput.reminderType,
      reminderInput.reminderOffset,
    )
      ? reminderInput.reminderTime
      : formatTimeInTimeZone(timestamp, timeZone)

    const isActive = timestamp.getTime() > now.getTime()

    if (existing) {
      result.push({
        ...existing,
        reminderTime,
        reminderOffset: reminderInput.reminderOffset,
        isActive: existing.isActive && isActive,
        updatedAt: now,
      })
      continue
    }

    result.push({
      ...createReminderEntity(
        { ...reminderInput, reminderTime },
        activityId,
        userId,
        timestamp,
        offsetMinutes,
      ),
      isActive,
    })
  }

  return result
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
