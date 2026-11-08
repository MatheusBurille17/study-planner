import { describe, expect, it, beforeEach } from 'vitest'
import fc from 'fast-check'
import { addDays } from 'date-fns'
import {
  deserializeActivity,
  serializeActivity,
} from '@/features/activities/infrastructure/mappers/activityMapper'
import {
  addToSyncQueue,
  clearOfflineDatabase,
  getActivitiesByUser,
  getActivity,
  getPendingSyncQueue,
  initDatabase,
  saveActivity,
} from '@/shared/lib/offline/indexeddb'
import { assignmentFixture, examFixture, taskFixture } from '../../../fixtures/activityFixtures'
import { AssignmentType, Priority, ReminderType, TaskStatus } from '@/shared/types/activity'

describe('integridade de dados offline', () => {
  beforeEach(async () => {
    await initDatabase()
    await clearOfflineDatabase()
  })

  it('round-trip de tarefa preserva campos e datas', () => {
    const task = taskFixture({
      tags: ['revisão', 'lista'],
      estimatedTimeMinutes: 90,
      priority: Priority.HIGH,
      status: TaskStatus.IN_PROGRESS,
    })
    const restored = deserializeActivity(serializeActivity(task) as Record<string, unknown>)
    expect(restored).toMatchObject({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      estimatedTimeMinutes: 90,
      tags: ['revisão', 'lista'],
    })
    expect((restored as typeof task).dueDate?.getTime()).toBe(task.dueDate?.getTime())
    expect(restored.createdAt).toBeInstanceOf(Date)
  })

  it('round-trip de prova e trabalho preserva arrays e status', () => {
    const exam = examFixture({ content: ['Tema 1', 'Tema 2'] })
    const assignment = assignmentFixture({ assignmentType: AssignmentType.PRESENTATION })
    const restoredExam = deserializeActivity(serializeActivity(exam) as Record<string, unknown>)
    const restoredAssignment = deserializeActivity(serializeActivity(assignment) as Record<string, unknown>)
    expect((restoredExam as typeof exam).content).toEqual(['Tema 1', 'Tema 2'])
    expect((restoredAssignment as typeof assignment).assignmentType).toBe(AssignmentType.PRESENTATION)
  })

  it('preserva lembretes com timestamps', () => {
    const task = taskFixture({
      reminders: [
        {
          id: crypto.randomUUID(),
          activityId: 'a',
          userId: 'user-1',
          reminderType: ReminderType.ONE_HOUR_BEFORE,
          reminderTime: '09:00',
          reminderOffsetMinutes: 60,
          reminderTimestamp: addDays(new Date(), 1),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })
    const restored = deserializeActivity(serializeActivity(task) as Record<string, unknown>)
    expect(restored.reminders).toHaveLength(1)
    expect(restored.reminders?.[0].reminderTimestamp).toBeInstanceOf(Date)
  })

  it('salva e recupera atividade no IndexedDB', async () => {
    const task = taskFixture()
    await saveActivity(task)
    const restored = await getActivity(task.id)
    expect(restored?.title).toBe(task.title)
    const byUser = await getActivitiesByUser(task.userId)
    expect(byUser.some((activity) => activity.id === task.id)).toBe(true)
  })

  it('fila offline mantém FIFO', async () => {
    const first = taskFixture()
    const second = taskFixture()
    await addToSyncQueue('CREATE', 'activity', first.id, first, first.userId)
    await new Promise((resolve) => setTimeout(resolve, 5))
    await addToSyncQueue('UPDATE', 'activity', second.id, second, second.userId)
    const pending = await getPendingSyncQueue()
    expect(pending.length).toBeGreaterThanOrEqual(2)
    expect(pending[0].entityId).toBe(first.id)
    expect(pending[1].entityId).toBe(second.id)
  })

  it('propriedade: serialização preserva título e descrição arbitrários', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ maxLength: 200 }),
        (title, description) => {
          const task = taskFixture({ title, description })
          const restored = deserializeActivity(serializeActivity(task) as Record<string, unknown>)
          return restored.title === title && restored.description === description
        },
      ),
      { numRuns: 50 },
    )
  })
})
