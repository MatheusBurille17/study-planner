import { describe, expect, it } from 'vitest'
import { createExamSchema, createTaskSchema } from '@/features/activities/presentation/schemas/createActivitySchema'
import {
  DATE_ONLY_PATTERN,
  parseDateOnly,
  toDate,
  toISODate,
} from '@/shared/utils/dateHelpers'
import { getZonedDateTimeParts, combineDateAndTimeInTimeZone } from '@/shared/utils/timezone'

describe('datas de calendário (yyyy-MM-dd)', () => {
  it('lê a data como calendário local, não como UTC', () => {
    const parsed = parseDateOnly('2026-11-12')
    expect(parsed).toBeInstanceOf(Date)
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(10)
    expect(parsed?.getDate()).toBe(12)
    // Meio-dia local: não vira o dia em nenhum fuso razoável.
    expect(parsed?.getHours()).toBe(12)
  })

  it('toDate reconhece o formato de data sem hora', () => {
    const parsed = toDate('2026-11-12')
    expect(toISODate(parsed)).toBe('2026-11-12')
    expect(DATE_ONLY_PATTERN.test('2026-11-12')).toBe(true)
    expect(parseDateOnly('12/11/2026')).toBeUndefined()
  })

  it('o schema de tarefa preserva o dia escolhido no formulário', () => {
    const parsed = createTaskSchema.safeParse({
      type: 'task',
      title: 'Estudar',
      dueDate: '2026-11-12',
      dueTime: '18:00',
    })

    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.dueDate?.getDate()).toBe(12)
    expect(toISODate(parsed.data.dueDate)).toBe('2026-11-12')
  })

  it('o schema de prova também preserva o dia', () => {
    const parsed = createExamSchema.safeParse({
      type: 'exam',
      subjectId: crypto.randomUUID(),
      date: '2026-11-12',
      time: '10:00',
      examType: 'WRITTEN',
    })

    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(toISODate(parsed.data.date)).toBe('2026-11-12')
  })

  it('combina data e horário respeitando o fuso do usuário', () => {
    const date = parseDateOnly('2026-11-12')!
    const eventAt = combineDateAndTimeInTimeZone(date, '18:00', 'America/Sao_Paulo')

    expect(getZonedDateTimeParts(eventAt, 'America/Sao_Paulo')).toMatchObject({
      year: 2026,
      month: 11,
      day: 12,
      hour: 18,
      minute: 0,
    })
  })
})
