import { describe, expect, it } from 'vitest'
import { addDays } from 'date-fns'
import {
  createActivitySchema,
  createAssignmentSchema,
  createExamSchema,
  createTaskSchema,
  updateTaskSchema,
} from '@/features/activities/presentation/schemas/createActivitySchema'
import { reminderSchema } from '@/features/activities/presentation/schemas/reminderSchema'
import { Priority, ReminderType, TaskStatus } from '@/shared/types/activity'

const future = () => addDays(new Date(), 5).toISOString()

describe('schemas de atividade', () => {
  it('valida tarefa completa', () => {
    const parsed = createTaskSchema.safeParse({
      type: 'task',
      title: 'Estudar',
      description: 'Descrição',
      dueDate: future(),
      dueTime: '18:00',
      priority: Priority.HIGH,
      status: TaskStatus.TODO,
      estimatedTimeMinutes: 45,
      tags: ['a', 'b'],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejeita título vazio e data passada', () => {
    const empty = createTaskSchema.safeParse({ type: 'task', title: '' })
    expect(empty.success).toBe(false)
    const past = createTaskSchema.safeParse({
      type: 'task',
      title: 'T',
      dueDate: addDays(new Date(), -2).toISOString(),
    })
    expect(past.success).toBe(false)
    if (!past.success) {
      expect(past.error.errors[0].message).toMatch(/passado/)
    }
  })

  it('valida prova com disciplina UUID e conteúdo', () => {
    const parsed = createExamSchema.safeParse({
      type: 'exam',
      subjectId: crypto.randomUUID(),
      date: future(),
      time: '10:00',
      examType: 'WRITTEN',
      content: 'Tema 1, Tema 2',
      reminders: [{ reminderType: ReminderType.ONE_DAY_BEFORE, reminderTime: '09:00' }],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejeita prova sem disciplina', () => {
    const parsed = createExamSchema.safeParse({
      type: 'exam',
      subjectId: '',
      date: future(),
      examType: 'ORAL',
    })
    expect(parsed.success).toBe(false)
  })

  it('exige descrição em trabalho', () => {
    const parsed = createAssignmentSchema.safeParse({
      type: 'assignment',
      title: 'Trabalho',
      description: '',
      subjectId: crypto.randomUUID(),
      dueDate: future(),
      assignmentType: 'PROJECT',
    })
    expect(parsed.success).toBe(false)
  })

  it('valida união discriminada', () => {
    expect(
      createActivitySchema.safeParse({
        type: 'task',
        title: 'Tarefa',
      }).success,
    ).toBe(true)
    expect(createActivitySchema.safeParse({ type: 'unknown', title: 'X' }).success).toBe(false)
  })

  it('aceita datas passadas em update', () => {
    const parsed = updateTaskSchema.safeParse({
      type: 'task',
      title: 'Tarefa antiga',
      dueDate: addDays(new Date(), -5).toISOString(),
      priority: Priority.LOW,
      status: TaskStatus.COMPLETED,
    })
    expect(parsed.success).toBe(true)
  })

  it('limita lembretes a 3 e exige offset customizado', () => {
    const reminders = Array.from({ length: 4 }, () => ({
      reminderType: ReminderType.ONE_HOUR_BEFORE,
      reminderTime: '09:00',
    }))
    expect(
      createTaskSchema.safeParse({ type: 'task', title: 'T', dueDate: future(), reminders }).success,
    ).toBe(false)

    expect(
      reminderSchema.safeParse({ reminderType: ReminderType.CUSTOM, reminderTime: '09:00' }).success,
    ).toBe(false)
    expect(
      reminderSchema.safeParse({
        reminderType: ReminderType.CUSTOM,
        reminderTime: '09:00',
        reminderOffset: { value: 2, unit: 'DAYS' },
      }).success,
    ).toBe(true)
  })

  it('rejeita hora inválida em lembrete', () => {
    expect(
      reminderSchema.safeParse({ reminderType: ReminderType.ON_DAY, reminderTime: '25:00' }).success,
    ).toBe(false)
  })
})
