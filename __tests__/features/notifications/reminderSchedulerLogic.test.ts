import { describe, expect, it } from 'vitest'
import {
  addDaysToIsoDate,
  defaultReminderHours,
  defaultReminderInstant,
  eventTimeOfDay,
  isQuietHoursInTimeZone,
  isWithinWindow,
  isoDateInTimeZone,
  nextQuietHoursEnd,
  reminderTypeForHours,
  resolveEventInstant,
  typeEnabled,
  zonedDateTimeToUtc,
} from '../../../supabase/functions/send-reminders/logic'

const preferences = {
  remindersEnabled: true,
  examsEnabled: true,
  assignmentsEnabled: true,
  tasksEnabled: true,
  taskRemindersHours: 3,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
}

describe('agendador de lembretes (Edge Function)', () => {
  it('converte horário de parede para UTC usando o fuso do usuário', () => {
    // 19:00 em São Paulo (UTC-3) = 22:00 UTC
    expect(zonedDateTimeToUtc('2026-11-16', '19:00', 'America/Sao_Paulo').toISOString()).toBe(
      '2026-11-16T22:00:00.000Z',
    )
    // 23:59 em São Paulo já cai no dia seguinte em UTC
    expect(zonedDateTimeToUtc('2026-11-16', '23:59', 'America/Sao_Paulo').toISOString()).toBe(
      '2026-11-17T02:59:00.000Z',
    )
  })

  it('usa fim do dia quando o evento não tem horário', () => {
    expect(resolveEventInstant('2026-11-16', null, 'America/Sao_Paulo').toISOString()).toBe(
      '2026-11-17T02:59:00.000Z',
    )
    expect(eventTimeOfDay(null)).toBe('23:59')
    expect(eventTimeOfDay('09:30:00')).toBe('09:30')
  })

  it('calcula a antecedência padrão de cada tipo', () => {
    expect(defaultReminderHours('exam')).toBe(24)
    expect(defaultReminderHours('assignment')).toBe(24)
    expect(defaultReminderHours('task', 5)).toBe(5)
    expect(defaultReminderHours('task', 12)).toBe(6)
    expect(defaultReminderHours('task', -2)).toBe(0)
    expect(defaultReminderHours('task', undefined)).toBe(3)
  })

  it('calcula o instante do lembrete padrão', () => {
    const exam = defaultReminderInstant('exam', '2026-11-17', '19:00', preferences, 'America/Sao_Paulo')
    expect(exam.toISOString()).toBe('2026-11-16T22:00:00.000Z')

    const task = defaultReminderInstant('task', '2026-11-16', '19:00', preferences, 'America/Sao_Paulo')
    expect(task.toISOString()).toBe('2026-11-16T19:00:00.000Z')
  })

  it('respeita a janela de execução do CRON', () => {
    const now = new Date('2026-11-16T22:00:00.000Z')
    expect(isWithinWindow(new Date('2026-11-16T22:03:00.000Z'), now)).toBe(true)
    expect(isWithinWindow(new Date('2026-11-16T21:57:00.000Z'), now)).toBe(true)
    expect(isWithinWindow(new Date('2026-11-16T22:06:00.000Z'), now)).toBe(false)
    expect(isWithinWindow('2026-11-16T22:06:00.000Z', now)).toBe(false)
  })

  it('interpreta horário de silêncio no fuso do usuário', () => {
    const now = new Date('2026-11-17T01:00:00.000Z') // 22:00 em São Paulo
    expect(isQuietHoursInTimeZone(now, '22:00', '07:00', 'America/Sao_Paulo')).toBe(true)

    const midday = new Date('2026-11-16T15:00:00.000Z') // 12:00 em São Paulo
    expect(isQuietHoursInTimeZone(midday, '22:00', '07:00', 'America/Sao_Paulo')).toBe(false)
  })

  it('adia o lembrete para o fim do silêncio', () => {
    const now = new Date('2026-11-17T01:00:00.000Z') // 22:00 BRT
    const next = nextQuietHoursEnd(now, '07:00', 'America/Sao_Paulo')
    expect(next?.toISOString()).toBe('2026-11-17T10:00:00.000Z')

    // Já depois do fim do silêncio: usa o dia seguinte.
    const after = new Date('2026-11-16T15:00:00.000Z') // 12:00 BRT
    expect(nextQuietHoursEnd(after, '07:00', 'America/Sao_Paulo')?.toISOString()).toBe(
      '2026-11-17T10:00:00.000Z',
    )
  })

  it('mapeia horas para um reminder_type válido', () => {
    expect(reminderTypeForHours(0)).toEqual({ reminderType: 'ON_DAY', offsetMinutes: 0 })
    expect(reminderTypeForHours(3)).toEqual({
      reminderType: 'THREE_HOURS_BEFORE',
      offsetMinutes: 180,
    })
    expect(reminderTypeForHours(24)).toEqual({
      reminderType: 'ONE_DAY_BEFORE',
      offsetMinutes: 1440,
    })
    expect(reminderTypeForHours(5)).toEqual({ reminderType: 'CUSTOM', offsetMinutes: 300 })
  })

  it('respeita preferências por tipo', () => {
    expect(typeEnabled(preferences, 'EXAM')).toBe(true)
    expect(typeEnabled({ ...preferences, examsEnabled: false }, 'EXAM')).toBe(false)
    expect(typeEnabled({ ...preferences, remindersEnabled: false }, 'TASK')).toBe(false)
  })

  it('auxiliares de data local', () => {
    expect(isoDateInTimeZone(new Date('2026-11-17T01:00:00.000Z'), 'America/Sao_Paulo')).toBe(
      '2026-11-16',
    )
    expect(addDaysToIsoDate('2026-11-16', -2)).toBe('2026-11-14')
    expect(addDaysToIsoDate('2026-11-30', 2)).toBe('2026-12-02')
  })
})
