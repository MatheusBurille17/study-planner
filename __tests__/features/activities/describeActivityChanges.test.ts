import { describe, expect, it } from 'vitest'
import { describeActivityChanges } from '@/features/activities/application/useCases/describeActivityChanges'
import {
  Priority,
  ReminderType,
  TASK_STATUS_LABELS,
  TaskStatus,
  type Task,
} from '@/shared/types/activity'
import { taskFixture } from '../../fixtures/activityFixtures'

describe('describeActivityChanges', () => {
  it('lista apenas os campos que mudaram, já formatados', () => {
    const server = taskFixture({
      title: 'Entes Empresariais',
      description: 'Descrição original',
      subjectId: 'subject-1',
      dueDate: new Date(2026, 10, 10),
      dueTime: '18:00',
      priority: Priority.MEDIUM,
      status: TaskStatus.TODO,
      estimatedTimeMinutes: 60,
      tags: ['revisão'],
    })

    const client = {
      title: 'Entes Empresariais',
      description: 'Descrição original',
      subjectId: 'subject-1',
      dueDate: new Date(2026, 10, 12),
      dueTime: '20:00',
      priority: Priority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      estimatedTimeMinutes: 90,
      tags: ['revisão', 'prova'],
      reminders: [],
    } as Partial<Task>

    const changes = describeActivityChanges(server, client as Partial<Task>)

    expect(changes.map((change) => change.field)).toEqual([
      'dueDate',
      'dueTime',
      'priority',
      'status',
      'estimatedTimeMinutes',
      'tags',
    ])
    expect(changes.find((change) => change.field === 'dueDate')).toMatchObject({
      label: 'Prazo',
      serverValue: '10/11/2026',
      clientValue: '12/11/2026',
    })
    expect(changes.find((change) => change.field === 'status')).toMatchObject({
      serverValue: TASK_STATUS_LABELS[TaskStatus.TODO],
      clientValue: TASK_STATUS_LABELS[TaskStatus.IN_PROGRESS],
    })
    expect(changes.find((change) => change.field === 'estimatedTimeMinutes')).toMatchObject({
      serverValue: '1h',
      clientValue: '1h 30min',
    })
  })

  it('resolve o nome da disciplina a partir dos subjects', () => {
    const server = taskFixture({ subjectId: 'subject-1' })
    const client = { ...server, subjectId: 'subject-2' } as Partial<Task>

    const changes = describeActivityChanges(server, client, {
      subjectNames: { 'subject-1': 'Cálculo II', 'subject-2': 'Direito Civil' },
    })

    expect(changes).toEqual([
      {
        field: 'subjectId',
        label: 'Disciplina',
        serverValue: 'Cálculo II',
        clientValue: 'Direito Civil',
      },
    ])
  })

  it('não lista campos iguais', () => {
    const server = taskFixture({ title: 'Mesmo título', reminders: [] })
    const client = {
      title: 'Mesmo título',
      dueDate: server.dueDate,
      dueTime: server.dueTime,
      priority: server.priority,
      status: server.status,
      estimatedTimeMinutes: server.estimatedTimeMinutes,
      tags: server.tags,
      reminders: [],
    } as Partial<Task>

    expect(describeActivityChanges(server, client)).toEqual([])
  })

  it('compara lembretes pelo tipo e horário, ignorando metadados do servidor', () => {
    const server = taskFixture({
      reminders: [
        {
          id: 'r1',
          activityId: 'a1',
          userId: 'u1',
          reminderType: ReminderType.ONE_DAY_BEFORE,
          reminderTime: '09:00',
          reminderOffsetMinutes: 1440,
          reminderTimestamp: new Date(2026, 10, 9, 9),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })
    const client = {
      reminders: [{ reminderType: ReminderType.ONE_DAY_BEFORE, reminderTime: '09:00' }],
    } as Partial<Task>

    expect(describeActivityChanges(server, client)).toEqual([])

    const withChange = describeActivityChanges(server, {
      reminders: [{ reminderType: ReminderType.ON_DAY, reminderTime: '08:00' }],
    } as Partial<Task>)

    expect(withChange.find((change) => change.field === 'reminders')).toMatchObject({
      label: 'Lembretes',
      serverValue: '1 dia antes',
      clientValue: 'No dia do evento',
    })
  })
})
