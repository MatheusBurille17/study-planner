import { describe, expect, it } from 'vitest'
import { addDays } from 'date-fns'
import {
  buildDashboardSummary,
  calculateCompletionPercent,
  calculateEstimatedHours,
  calculatePriorityBreakdown,
  countOverdue,
  getGreeting,
} from '@/features/dashboard/domain/dashboardRules'
import { formatDashboardData } from '@/features/dashboard/application/formatDashboardData'
import { Priority, TaskStatus } from '@/shared/types/activity'
import { assignmentFixture, examFixture, taskFixture } from '../../fixtures/activityFixtures'

describe('regras do dashboard', () => {
  const now = new Date('2026-11-07T10:00:00')

  it('calcula conclusão com zero e com tarefas', () => {
    expect(calculateCompletionPercent([])).toBe(0)
    const tasks = [
      taskFixture({ status: TaskStatus.COMPLETED }),
      taskFixture({ status: TaskStatus.COMPLETED }),
      taskFixture({ status: TaskStatus.TODO }),
      taskFixture({ status: TaskStatus.IN_PROGRESS }),
    ]
    expect(calculateCompletionPercent(tasks)).toBe(50)
  })

  it('calcula atrasadas ignorando concluídas', () => {
    const overdue = taskFixture({ dueDate: addDays(now, -2), status: TaskStatus.TODO })
    const completed = taskFixture({ dueDate: addDays(now, -2), status: TaskStatus.COMPLETED })
    const future = taskFixture({ dueDate: addDays(now, 2), status: TaskStatus.TODO })
    expect(countOverdue([overdue, completed, future], now)).toBe(1)
  })

  it('calcula horas estimadas apenas pendentes', () => {
    const tasks = [
      taskFixture({ estimatedTimeMinutes: 90, status: TaskStatus.TODO }),
      taskFixture({ estimatedTimeMinutes: 120, status: TaskStatus.IN_PROGRESS }),
      taskFixture({ estimatedTimeMinutes: 300, status: TaskStatus.COMPLETED }),
    ]
    expect(calculateEstimatedHours(tasks)).toBe(3.5)
    expect(calculateEstimatedHours([])).toBe(0)
  })

  it('calcula breakdown de prioridades', () => {
    const tasks = [
      taskFixture({ priority: Priority.HIGH }),
      taskFixture({ priority: Priority.HIGH }),
      taskFixture({ priority: Priority.MEDIUM }),
      taskFixture({ priority: Priority.LOW }),
    ]
    expect(calculatePriorityBreakdown(tasks)).toEqual({ high: 2, medium: 1, low: 1 })
  })

  it('monta resumo com janela de 14 dias e máximo de 5', () => {
    const tasks = Array.from({ length: 7 }, (_, index) =>
      taskFixture({ dueDate: addDays(now, index + 1), status: TaskStatus.TODO }),
    )
    const exams = [
      examFixture({ date: addDays(now, 2) }),
      examFixture({ date: addDays(now, 20) }),
    ]
    const assignments = [
      assignmentFixture({ dueDate: addDays(now, 3) }),
      assignmentFixture({ dueDate: addDays(now, 15) }),
    ]
    const summary = buildDashboardSummary([...tasks, ...exams, ...assignments], now)
    expect(summary.pendingTasks).toHaveLength(5)
    expect(summary.totalPendingTasks).toBe(7)
    expect(summary.upcomingExams).toHaveLength(1)
    expect(summary.upcomingAssignments).toHaveLength(1)
    expect(summary.stats.completionPercent).toBe(0)
  })

  it('formata dados, trunca títulos e horas', () => {
    const summary = buildDashboardSummary(
      [taskFixture({ title: 'A'.repeat(80), dueDate: addDays(now, 1), estimatedTimeMinutes: 330 })],
      now,
    )
    const formatted = formatDashboardData(summary, new Map())
    expect(formatted.tasks[0].shortTitle.endsWith('…')).toBe(true)
    expect(formatted.stats.estimatedHours).toBe(5.5)
  })

  it('saúda conforme o horário', () => {
    expect(getGreeting(new Date('2026-01-01T08:00:00'))).toBe('Bom dia')
    expect(getGreeting(new Date('2026-01-01T14:00:00'))).toBe('Boa tarde')
    expect(getGreeting(new Date('2026-01-01T22:00:00'))).toBe('Boa noite')
  })
})
