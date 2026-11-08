import { describe, expect, it } from 'vitest'
import { addDays, addHours, subDays } from 'date-fns'
import { Assignment as AssignmentEntity, Exam as ExamEntity, Task as TaskEntity } from '@/features/activities/domain/activity'
import type { Activity, Assignment as AssignmentData, Exam as ExamData, Reminder, Task as TaskData } from '@/shared/types/activity'
import {
  AssignmentStatus,
  AssignmentType,
  ExamType,
  Priority,
  ReminderType,
  TaskStatus,
} from '@/shared/types/activity'

export function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    type: 'task',
    title: 'Revisar cálculo',
    description: 'Lista 5',
    subjectId: undefined,
    dueDate: addDays(new Date(), 3),
    dueTime: '18:00',
    priority: Priority.HIGH,
    status: TaskStatus.TODO,
    estimatedTimeMinutes: 60,
    tags: ['revisão'],
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TaskData
}

export function makeExam(overrides: Partial<ExamData> = {}): ExamData {
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    type: 'exam',
    title: 'Prova de Anatomia',
    subjectId: crypto.randomUUID(),
    date: addDays(new Date(), 5),
    time: '10:00',
    examType: ExamType.WRITTEN,
    content: ['Sistema nervoso'],
    location: 'Sala 204',
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ExamData
}

export function makeAssignment(overrides: Partial<AssignmentData> = {}): AssignmentData {
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    type: 'assignment',
    title: 'Relatório',
    description: 'Relatório de campo',
    subjectId: crypto.randomUUID(),
    dueDate: addDays(new Date(), 7),
    dueTime: '23:59',
    assignmentType: AssignmentType.PROJECT,
    criteria: 'ABNT',
    status: AssignmentStatus.PENDING,
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as AssignmentData
}

export function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: crypto.randomUUID(),
    activityId: 'activity-1',
    userId: 'user-1',
    reminderType: ReminderType.ONE_DAY_BEFORE,
    reminderTime: '09:00',
    reminderOffsetMinutes: 1440,
    reminderTimestamp: addDays(new Date(), 2),
    isActive: true,
    wasFired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('Activity entities', () => {
  it('cria tarefa válida e preserva invariantes de timestamp', () => {
    const task = new TaskEntity({
      userId: 'user-1',
      title: 'Estudar',
      dueDate: addDays(new Date(), 2),
      priority: Priority.MEDIUM,
    })
    expect(task.toActivity().title).toBe('Estudar')
    expect(task.createdAt.getTime()).toBeLessThanOrEqual(Date.now())
    expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(task.createdAt.getTime())
  })

  it('rejeita título vazio', () => {
    expect(
      () => new TaskEntity({ userId: 'user-1', title: '   ', dueDate: addDays(new Date(), 1) }),
    ).toThrow(/Título é obrigatório/)
  })

  it('rejeita prazo no passado', () => {
    expect(
      () => new TaskEntity({ userId: 'user-1', title: 'Atrasada', dueDate: subDays(new Date(), 1) }),
    ).toThrow(/passado/)
  })

  it('rejeita mais de 3 lembretes', () => {
    const reminders = Array.from({ length: 4 }, () => makeReminder())
    expect(
      () =>
        new TaskEntity({
          userId: 'user-1',
          title: 'Com lembretes',
          dueDate: addDays(new Date(), 5),
          reminders,
        }),
    ).toThrow(/Máximo de 3 lembretes/)
  })

  it('exige disciplina em prova e trabalho', () => {
    expect(
      () => new ExamEntity({ userId: 'user-1', title: 'Prova', subjectId: '', date: addDays(new Date(), 3), examType: ExamType.ORAL }),
    ).toThrow(/Disciplina é obrigatória/)
    expect(
      () =>
        new AssignmentEntity({
          userId: 'user-1',
          title: 'Trabalho',
          description: 'Desc',
          subjectId: '',
          dueDate: addDays(new Date(), 3),
          assignmentType: AssignmentType.WRITTEN,
        }),
    ).toThrow(/Disciplina é obrigatória/)
  })

  it('marca tarefa como concluída', () => {
    const task = new TaskEntity({ userId: 'user-1', title: 'Tarefa', dueDate: addDays(new Date(), 1) })
    expect(task.markCompleted().status).toBe(TaskStatus.COMPLETED)
    expect(task.calculateProgressPercent()).toBe(0)
  })

  it('gera ids únicos para atividades', () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => new TaskEntity({ userId: 'user-1', title: 'T' }).id),
    )
    expect(ids.size).toBe(100)
  })
})
