import { describe, expect, it } from 'vitest'
import { addDays } from 'date-fns'
import {
  calculateReminderTimestamp,
  validateDeadline,
  validateMaxReminders,
  validateNoDuplicateReminders,
  validateReminderTimestamp,
} from '@/features/activities/domain/rules'
import { calculateReminderTime } from '@/shared/constants/reminders'
import { isQuietHours as isQuietHoursRule } from '@/features/notifications/domain/rules'
import { formatNotificationMessage, formatTimeRemaining, truncateSubject } from '@/features/notifications/domain/notificationFormatter'
import { ReminderType } from '@/shared/types/activity'
import { examFixture, taskFixture } from '../../fixtures/activityFixtures'

describe('regras de lembrete', () => {
  it('calcula 1 dia antes às 09:00', () => {
    const event = new Date('2026-12-15T18:00:00')
    const timestamp = calculateReminderTimestamp(event, ReminderType.ONE_DAY_BEFORE, '09:00')
    expect(timestamp.getDate()).toBe(14)
    expect(timestamp.getHours()).toBe(9)
  })

  it('calcula horas antes a partir do evento', () => {
    const event = new Date('2026-12-15T18:00:00')
    const timestamp = calculateReminderTimestamp(event, ReminderType.THREE_HOURS_BEFORE, '09:00')
    expect(timestamp.getHours()).toBe(15)
  })

  it('valida lembrete antes do evento e no futuro', () => {
    const event = addDays(new Date(), 2)
    expect(() => validateReminderTimestamp(addDays(new Date(), 1), event)).not.toThrow()
    expect(() => validateReminderTimestamp(addDays(new Date(), 3), event)).toThrow(/anterior/)
    expect(() => validateReminderTimestamp(addDays(new Date(), -1), event)).toThrow(/passado/)
  })

  it('valida deadline e limites de lembretes', () => {
    expect(() => validateDeadline(addDays(new Date(), 1))).not.toThrow()
    expect(() => validateDeadline(addDays(new Date(), -1))).toThrow(/passado/)
    expect(() => validateMaxReminders([], 3)).not.toThrow()
    expect(() =>
      validateMaxReminders(Array.from({ length: 4 }, () => ({ reminderType: ReminderType.ON_DAY, reminderTime: '09:00' }))),
    ).toThrow(/Máximo/)
  })

  it('rejeita lembretes duplicados', () => {
    const date = addDays(new Date(), 1)
    expect(() =>
      validateNoDuplicateReminders([{ reminderTimestamp: date }, { reminderTimestamp: date }]),
    ).toThrow(/duplicados/)
  })

  it('calcula regra padrão por tipo (24h prova/entrega, 3h tarefa)', () => {
    const due = addDays(new Date(), 3)
    const exam = calculateReminderTime('exam', due)
    const assignment = calculateReminderTime('assignment', due)
    const task = calculateReminderTime('task', due)
    expect(Math.round((due.getTime() - exam.getTime()) / 3_600_000)).toBe(24)
    expect(Math.round((due.getTime() - assignment.getTime()) / 3_600_000)).toBe(24)
    expect(Math.round((due.getTime() - task.getTime()) / 3_600_000)).toBe(3)
    const custom = calculateReminderTime('task', due, 6)
    expect(Math.round((due.getTime() - custom.getTime()) / 3_600_000)).toBe(6)
  })

  it('detecta horário de silêncio inclusive virada de meia-noite', () => {
    const at23 = new Date('2026-01-01T23:00:00')
    const at06 = new Date('2026-01-01T06:00:00')
    const at12 = new Date('2026-01-01T12:00:00')
    expect(isQuietHoursRule(at23, '22:00', '08:00')).toBe(true)
    expect(isQuietHoursRule(at06, '22:00', '08:00')).toBe(true)
    expect(isQuietHoursRule(at12, '22:00', '08:00')).toBe(false)
    expect(isQuietHoursRule(at23, '22:00', '07:00')).toBe(true)
  })
})

describe('formatador de notificações', () => {
  it('gera título e corpo em português', () => {
    const exam = examFixture({ title: 'Prova de Anatomia' })
    const message = formatNotificationMessage(exam, 'Anatomia')
    expect(message.title).toBe('Prova: Anatomia')
    expect(message.body).toContain('10:00')
    expect(message.body).toContain('Prova de Anatomia')
  })

  it('trunca disciplina em 30 caracteres', () => {
    const long = 'Disciplina com nome extremamente longo e comprido'
    expect(truncateSubject(long)).toHaveLength(30)
    expect(truncateSubject(long).endsWith('…')).toBe(true)
  })

  it('formata tempo restante em linguagem natural', () => {
    expect(formatTimeRemaining(0)).toBe('agora')
    expect(formatTimeRemaining(2)).toMatch(/2 horas/)
    expect(formatTimeRemaining(48)).toMatch(/2 dias/)
    expect(formatTimeRemaining(0.5)).toMatch(/minutos/)
  })

  it('formata tarefa com data de hoje', () => {
    const task = taskFixture({ dueDate: new Date(), dueTime: '18:00', title: 'Revisar' })
    const message = formatNotificationMessage(task, 'Cálculo')
    expect(message.title).toBe('Tarefa: Cálculo')
    expect(message.body).toContain('Hoje')
  })
})
