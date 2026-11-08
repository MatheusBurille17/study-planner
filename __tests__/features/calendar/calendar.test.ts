import { describe, expect, it } from 'vitest'
import { addDays, differenceInCalendarDays } from 'date-fns'
import fc from 'fast-check'
import {
  calculateUrgency,
  daysUntil,
  getActivityDate,
  getActivityTime,
  isActivityCompleted,
  isActivityOverdue,
} from '@/features/calendar/domain/calendarRules'
import {
  activitiesInRange,
  formatCalendarData,
  formatDateRange,
  formatMonthYear,
  getViewRange,
  groupByDay,
  truncateSubject,
  truncateTitle,
} from '@/features/calendar/application/formatters/formatCalendarData'
import { getMonthGrid, getWeekDays } from '@/shared/utils/dateHelpers'
import type { Subject } from '@/shared/types/subject'
import { TaskStatus } from '@/shared/types/activity'
import { assignmentFixture, examFixture, taskFixture } from '../../fixtures/activityFixtures'

describe('regras do calendário', () => {
  const now = new Date('2026-11-07T10:00:00')

  it('calcula urgência por dias restantes', () => {
    expect(calculateUrgency(addDays(now, -1), now)).toBe('critical')
    expect(calculateUrgency(now, now)).toBe('critical')
    expect(calculateUrgency(addDays(now, 2), now)).toBe('high')
    expect(calculateUrgency(addDays(now, 5), now)).toBe('medium')
    expect(calculateUrgency(addDays(now, 20), now)).toBe('low')
    expect(calculateUrgency(undefined, now)).toBe('low')
  })

  it('detecta atraso e conclusão', () => {
    const overdue = taskFixture({ dueDate: addDays(now, -2), status: TaskStatus.TODO })
    const completed = taskFixture({ dueDate: addDays(now, -2), status: TaskStatus.COMPLETED })
    expect(isActivityOverdue(overdue, now)).toBe(true)
    expect(isActivityOverdue(completed, now)).toBe(false)
    expect(isActivityCompleted(completed)).toBe(true)
  })

  it('extrai data e hora por tipo', () => {
    const task = taskFixture({ dueDate: now, dueTime: '18:00' })
    const exam = examFixture({ date: now, time: '10:00' })
    expect(getActivityDate(task)?.getTime()).toBe(now.getTime())
    expect(getActivityTime(task)).toBe('18:00')
    expect(getActivityTime(exam)).toBe('10:00')
    expect(daysUntil(addDays(now, 3), now)).toBe(3)
  })

  it('gera intervalo de mês, semana e dia', () => {
    const month = getViewRange('month', now)
    expect(month.start.getDate()).toBeLessThanOrEqual(1)
    const week = getViewRange('week', now)
    expect(differenceInCalendarDays(week.end, week.start)).toBe(6)
    const day = getViewRange('day', now)
    expect(day.start.getTime()).toBe(now.getTime())
  })

  it('filtra atividades no intervalo', () => {
    const inside = taskFixture({ dueDate: now })
    const outside = taskFixture({ dueDate: addDays(now, 30) })
    const formatted = formatCalendarData([inside, outside], [], {}, now)
    const range = getViewRange('week', now)
    const visible = activitiesInRange(formatted, range.start, range.end)
    expect(visible.map((activity) => activity.id)).toContain(inside.id)
    expect(visible.map((activity) => activity.id)).not.toContain(outside.id)
  })

  it('formata e trunca textos', () => {
    expect(truncateTitle('a'.repeat(50), 40)).toHaveLength(40)
    expect(truncateSubject('a'.repeat(40))).toHaveLength(25)
    expect(formatMonthYear(now)).toContain('novembro')
    expect(formatDateRange(addDays(now, -2), addDays(now, 2))).toContain('–')
  })

  it('mapeia atividades com disciplina e cores', () => {
    const subject: Subject = {
      id: crypto.randomUUID(),
      userId: 'user-1',
      name: 'Cálculo II',
      color: '#c4b5fd',
      createdAt: now,
      updatedAt: now,
    }
    const activity = taskFixture({ subjectId: subject.id })
    const [mapped] = formatCalendarData([activity], [subject], {}, now)
    expect(mapped.subjectName).toBe('Cálculo II')
    expect(mapped.subjectColor).toBe('#c4b5fd')
    expect(mapped.urgency).toBeDefined()
  })

  it('agrupa atividades por dia', () => {
    const a = taskFixture({ dueDate: now })
    const b = taskFixture({ dueDate: addDays(now, 1) })
    const formatted = formatCalendarData([a, b], [], {}, now)
    const grouped = groupByDay(formatted)
    expect(grouped.size).toBe(2)
  })

  it('propriedade: grade mensal contém todos os dias do mês', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }), (date) => {
        const grid = getMonthGrid(date)
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        const inMonth = grid.filter(
          (day) => day.getMonth() === date.getMonth() && day.getFullYear() === date.getFullYear(),
        )
        return (
          grid.length >= 35 &&
          inMonth.length === daysInMonth &&
          new Set(inMonth.map((day) => day.getDate())).size === daysInMonth
        )
      }),
      { numRuns: 100 },
    )
  })

  it('propriedade: semana tem exatamente 7 dias consecutivos', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }), (date) => {
        const week = getWeekDays(date)
        if (week.length !== 7) return false
        return week.every((day, index) =>
          index === 0
            ? true
            : Math.round((day.getTime() - week[index - 1].getTime()) / 86_400_000) === 1,
        )
      }),
      { numRuns: 100 },
    )
  })
})
