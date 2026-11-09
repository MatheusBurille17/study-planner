import { ReminderType, type ReminderOffset, type ReminderType as ReminderTypeValue } from '@/shared/types/activity'

/** Offset padrão em minutos para cada tipo de lembrete. */
export const REMINDER_OFFSET_MINUTES: Record<ReminderTypeValue, number> = {
  [ReminderType.ON_DAY]: 0,
  [ReminderType.ONE_HOUR_BEFORE]: 60,
  [ReminderType.TWO_HOURS_BEFORE]: 120,
  [ReminderType.THREE_HOURS_BEFORE]: 180,
  [ReminderType.ONE_DAY_BEFORE]: 24 * 60,
  [ReminderType.TWO_DAYS_BEFORE]: 48 * 60,
  [ReminderType.CUSTOM]: 0,
}

/** Regras de lembrete usadas pelo agendador (Spec 7). */
export const DEFAULT_REMINDER_RULES = {
  examHoursBefore: 24,
  assignmentHoursBefore: 24,
  taskHoursBefore: 3,
  maxRemindersPerActivity: 3,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
}

/**
 * Quando a atividade não tem horário, os lembretes relativos usam o fim do dia
 * como referência (ex.: "3 horas antes" = 20:59 do dia do prazo).
 */
export const DEFAULT_EVENT_TIME = '23:59'

/** Regras nomeadas usadas pelo formatador e pelo agendador. */
export const REMINDER_RULES = {
  exam: { hoursBefore: 24, label: '1 dia antes' },
  assignment: { hoursBefore: 24, label: '1 dia antes' },
  task: { hoursBefore: 3, label: '3 horas antes' },
} as const

/**
 * Calcula o horário absoluto do lembrete padrão.
 * - Provas e trabalhos: 24h antes
 * - Tarefas: N horas antes (0-6, configurável pelo usuário)
 */
export function calculateReminderTime(
  activityType: 'exam' | 'assignment' | 'task' | string,
  dueDate: Date,
  userTaskHours = DEFAULT_REMINDER_RULES.taskHoursBefore,
  now: Date = new Date(),
): Date {
  let hoursBefore = DEFAULT_REMINDER_RULES.taskHoursBefore
  if (activityType === 'exam') hoursBefore = DEFAULT_REMINDER_RULES.examHoursBefore
  else if (activityType === 'assignment') hoursBefore = DEFAULT_REMINDER_RULES.assignmentHoursBefore
  else {
    const clamped = Math.min(6, Math.max(0, Math.round(userTaskHours)))
    hoursBefore = clamped
  }
  const timestamp = new Date(dueDate.getTime() - hoursBefore * 60 * 60 * 1000)
  // Se o horário calculado já passou, agenda para now + 1 minuto (evita lembretes no passado).
  if (timestamp.getTime() < now.getTime()) {
    return new Date(now.getTime() + 60 * 1000)
  }
  return timestamp
}

export const REMINDER_UNIT_MINUTES: Record<ReminderOffset['unit'], number> = {
  MINUTES: 1,
  HOURS: 60,
  DAYS: 24 * 60,
}

export const MIN_REMINDER_OFFSET_MINUTES = 0
export const MAX_REMINDER_OFFSET_MINUTES = 43_200
