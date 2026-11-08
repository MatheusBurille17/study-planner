import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateSubject, subjectColor } from '@/features/subjects/domain/subject'
import { isQuietHours, shouldSendNotification } from '@/features/notifications/domain/rules'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/features/notifications/domain/repository'
import { formatDateShort, relativeDayLabel, urgencyLevel } from '@/shared/utils/dateHelpers'
import { formatMinutes, initialsFromEmail } from '@/shared/utils/formatting'
import { addDays } from 'date-fns'
import { taskFixture } from '../../fixtures/activityFixtures'
import { Priority, TaskStatus } from '@/shared/types/activity'

describe('disciplinas', () => {
  it('valida nome e cor', () => {
    expect(validateSubject({ name: 'Cálculo', color: '#c4b5fd' })).toEqual([])
    expect(validateSubject({ name: '' })).toContain('Nome é obrigatório')
    expect(validateSubject({ name: 'X', color: 'invalida' })).toContain('Cor inválida')
    expect(subjectColor()).toBe('#c4b5fd')
  })
})

describe('preferências de notificação', () => {
  // Fixa o horário fora do silêncio padrão (22:00–07:00) para o teste não
  // falhar apenas por ter sido executado à noite.
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const preferences = {
    userId: 'user-1',
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    updatedAt: new Date(),
  }

  it('respeita horário de silêncio', () => {
    expect(isQuietHours(new Date('2026-01-01T23:00:00'), '22:00', '07:00')).toBe(true)
    expect(isQuietHours(new Date('2026-01-01T12:00:00'), '22:00', '07:00')).toBe(false)
  })

  it('envia apenas tipos habilitados e fora do silêncio', () => {
    const task = taskFixture({ dueDate: addDays(new Date(), 2) })
    const decision = shouldSendNotification(task, preferences)
    expect(decision.send).toBe(true)
    expect(decision.timestamp).toBeDefined()

    expect(
      shouldSendNotification(task, { ...preferences, tasksEnabled: false }).send,
    ).toBe(false)
    expect(
      shouldSendNotification(task, {
        ...preferences,
        quietHoursStart: '00:00',
        quietHoursEnd: '23:59',
      }).send,
    ).toBe(false)
  })
})

describe('utilitários de data e formatação', () => {
  it('formata datas e minutos', () => {
    expect(formatDateShort(new Date('2026-11-07T12:00:00'))).toBe('07/11/2026')
    expect(formatMinutes(90)).toBe('1h 30min')
    expect(formatMinutes(0)).toBe('—')
    expect(initialsFromEmail('amanda.silva@uni.edu.br')).toBe('AS')
  })

  it('calcula urgência de prazo', () => {
    expect(urgencyLevel(new Date())).toBe('high')
    expect(urgencyLevel(addDays(new Date(), 10))).toBe('low')
    expect(relativeDayLabel(addDays(new Date(), 1))).toBe('Amanhã')
  })

  it('mantém labels de prioridade e status', () => {
    expect(Priority.HIGH).toBe('HIGH')
    expect(TaskStatus.COMPLETED).toBe('COMPLETED')
  })
})
