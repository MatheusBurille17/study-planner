/**
 * Regras puras do agendador de lembretes (Edge Function `send-reminders`).
 *
 * Fica separado do `index.ts` (Deno) para poder ser testado com Vitest e
 * reutilizado sem depender de `Deno`/`supabase-js`.
 */

export const DEFAULT_EVENT_TIME = '23:59'
export const DEFAULT_TASK_REMINDER_HOURS = 3
export const DEFAULT_WINDOW_MINUTES = 5

export interface SchedulerPreferences {
  remindersEnabled: boolean
  examsEnabled: boolean
  assignmentsEnabled: boolean
  tasksEnabled: boolean
  taskRemindersHours: number
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
  soundEnabled?: boolean
  vibrationEnabled?: boolean
}

export type ActivityKind = 'exam' | 'assignment' | 'task'

/** Usadas quando o usuário ainda não abriu /settings/notifications. */
export const DEFAULT_SCHEDULER_PREFERENCES: SchedulerPreferences = {
  remindersEnabled: true,
  examsEnabled: true,
  assignmentsEnabled: true,
  tasksEnabled: true,
  taskRemindersHours: DEFAULT_TASK_REMINDER_HOURS,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  soundEnabled: true,
  vibrationEnabled: true,
}

export function normalizeType(type: string): ActivityKind | null {
  const value = type.toLowerCase()
  if (value === 'exam' || value === 'assignment' || value === 'task') return value
  return null
}

export function typeEnabled(preferences: SchedulerPreferences, type: string): boolean {
  if (!preferences.remindersEnabled) return false
  const normalized = normalizeType(type)
  if (normalized === 'exam') return preferences.examsEnabled
  if (normalized === 'assignment') return preferences.assignmentsEnabled
  return preferences.tasksEnabled
}

/** Antecedência padrão (em horas) de cada tipo de atividade. */
export function defaultReminderHours(type: string, taskReminderHours?: number): number {
  const normalized = normalizeType(type)
  if (normalized === 'exam' || normalized === 'assignment') return 24
  const hours = Number(taskReminderHours)
  if (!Number.isFinite(hours)) return DEFAULT_TASK_REMINDER_HOURS
  return Math.min(6, Math.max(0, Math.round(hours)))
}

function timeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    // Alguns runtimes retornam 24 para meia-noite.
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  }
}

function offsetMilliseconds(instant: number, timeZone: string): number {
  const parts = timeZoneParts(new Date(instant), timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - instant
}

/**
 * Converte um horário de parede (`YYYY-MM-DD` + `HH:mm` no fuso informado)
 * para o instante UTC correspondente. Assim os lembretes respeitam o fuso do
 * usuário, e não o UTC do servidor.
 */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number)
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  const wallClock = Date.UTC(year, month - 1, day, hours, minutes, 0)
  const firstOffset = offsetMilliseconds(wallClock, timeZone)
  let instant = wallClock - firstOffset
  const secondOffset = offsetMilliseconds(instant, timeZone)
  if (secondOffset !== firstOffset) instant = wallClock - secondOffset
  return new Date(instant)
}

/** Data local (`YYYY-MM-DD`) no fuso informado. */
export function isoDateInTimeZone(date: Date, timeZone: string): string {
  const parts = timeZoneParts(date, timeZone)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function addDaysToIsoDate(date: string, days: number): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day))
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

/** Instante do evento acadêmico; sem horário, usa o fim do dia. */
export function resolveEventInstant(
  date: string,
  time: string | null | undefined,
  timeZone: string,
): Date {
  const value = time?.trim() ? time : DEFAULT_EVENT_TIME
  return zonedDateTimeToUtc(date, value, timeZone)
}

/** Momento do lembrete padrão (24h antes de provas/trabalhos, N horas antes de tarefas). */
export function defaultReminderInstant(
  type: string,
  date: string,
  time: string | null | undefined,
  preferences: Pick<SchedulerPreferences, 'taskRemindersHours'>,
  timeZone: string,
): Date {
  const event = resolveEventInstant(date, time, timeZone)
  const hours = defaultReminderHours(type, preferences.taskRemindersHours)
  return new Date(event.getTime() - hours * 60 * 60 * 1000)
}

export function isWithinWindow(
  timestamp: Date | string,
  now: Date,
  windowMinutes = DEFAULT_WINDOW_MINUTES,
): boolean {
  const value = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime()
  if (Number.isNaN(value)) return false
  const window = windowMinutes * 60 * 1000
  return value >= now.getTime() - window && value <= now.getTime() + window
}

/** Minutos desde a meia-noite no fuso informado. */
export function localMinutes(date: Date, timeZone: string): number {
  const parts = timeZoneParts(date, timeZone)
  return parts.hour * 60 + parts.minute
}

function parseClock(value?: string | null): number | null {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

/** Horário de silêncio, interpretado no fuso do usuário e com virada de meia-noite. */
export function isQuietHoursInTimeZone(
  now: Date,
  start: string | null | undefined,
  end: string | null | undefined,
  timeZone: string,
): boolean {
  const startMinutes = parseClock(start)
  const endMinutes = parseClock(end)
  if (startMinutes === null || endMinutes === null) return false
  if (startMinutes === endMinutes) return false
  const minutes = localMinutes(now, timeZone)
  if (startMinutes < endMinutes) return minutes >= startMinutes && minutes < endMinutes
  return minutes >= startMinutes || minutes < endMinutes
}

/**
 * Próximo fim do horário de silêncio a partir de `now` (no fuso informado).
 * Usado para adiar um lembrete que venceria durante o silêncio.
 */
export function nextQuietHoursEnd(
  now: Date,
  end: string | null | undefined,
  timeZone: string,
): Date | null {
  const endMinutes = parseClock(end)
  if (endMinutes === null) return null
  const local = localMinutes(now, timeZone)
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
  const today = isoDateInTimeZone(now, timeZone)
  const candidate = zonedDateTimeToUtc(
    local < endMinutes ? today : addDaysToIsoDate(today, 1),
    endTime,
    timeZone,
  )
  return candidate.getTime() > now.getTime() ? candidate : null
}

/** Tipo de lembrete compatível com o CHECK de `activity_reminders`. */
export function reminderTypeForHours(hours: number): {
  reminderType: string
  offsetMinutes: number
} {
  const offsetMinutes = Math.max(0, Math.round(hours)) * 60
  switch (offsetMinutes) {
    case 0:
      return { reminderType: 'ON_DAY', offsetMinutes }
    case 60:
      return { reminderType: 'ONE_HOUR_BEFORE', offsetMinutes }
    case 120:
      return { reminderType: 'TWO_HOURS_BEFORE', offsetMinutes }
    case 180:
      return { reminderType: 'THREE_HOURS_BEFORE', offsetMinutes }
    case 1440:
      return { reminderType: 'ONE_DAY_BEFORE', offsetMinutes }
    case 2880:
      return { reminderType: 'TWO_DAYS_BEFORE', offsetMinutes }
    default:
      return { reminderType: 'CUSTOM', offsetMinutes }
  }
}

/** `HH:mm` do horário do evento (ou fim do dia quando não informado). */
export function eventTimeOfDay(time: string | null | undefined): string {
  return (time?.trim() ? time : DEFAULT_EVENT_TIME).slice(0, 5)
}
