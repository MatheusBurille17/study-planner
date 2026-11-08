import { describe, expect, it } from 'vitest'
import { addDays, subDays } from 'date-fns'
import type { Activity } from '@/shared/types/activity'
import { Priority, ReminderType, TaskStatus } from '@/shared/types/activity'
import type { ActivityRepository } from '@/features/activities/domain/repository'
import { CreateActivityUseCase } from '@/features/activities/application/useCases/createActivity'
import { taskFixture } from '../../fixtures/activityFixtures'

class InMemoryRepository implements ActivityRepository {
  items = new Map<string, Activity>()
  async save(activity: Activity) {
    this.items.set(activity.id, activity)
    return activity
  }
  async getById(id: string, userId: string) {
    const activity = this.items.get(id)
    return activity && activity.userId === userId ? activity : null
  }
  async getByUserId(userId: string) {
    return [...this.items.values()].filter((activity) => activity.userId === userId)
  }
  async update(activity: Activity) {
    this.items.set(activity.id, activity)
    return activity
  }
  async delete(id: string, userId: string) {
    const activity = await this.getById(id, userId)
    if (activity) this.items.set(id, { ...activity, isDeleted: true, deletedAt: new Date() } as Activity)
  }
  async softDelete(id: string, userId: string) {
    await this.delete(id, userId)
  }
  async restore(id: string, userId: string) {
    const activity = await this.getById(id, userId)
    const restored = { ...activity, isDeleted: false, deletedAt: undefined } as Activity
    this.items.set(id, restored)
    return restored
  }
  async getDeleted(userId: string) {
    return [...this.items.values()].filter((activity) => activity.userId === userId && activity.isDeleted)
  }
  async permanentDelete(id: string) {
    this.items.delete(id)
  }
  async count(userId: string) {
    return [...this.items.values()].filter((activity) => activity.userId === userId && !activity.isDeleted).length
  }
}

describe('CreateActivityUseCase', () => {
  it('cria tarefa, calcula lembrete e persiste', async () => {
    const repository = new InMemoryRepository()
    const useCase = new CreateActivityUseCase(repository)
    const dueDate = addDays(new Date(), 4)
    dueDate.setHours(18, 0, 0, 0)

    const result = await useCase.execute({
      type: 'task',
      userId: 'user-1',
      title: 'Estudar derivadas',
      dueDate,
      dueTime: '18:00',
      priority: Priority.HIGH,
      status: TaskStatus.TODO,
      estimatedTimeMinutes: 90,
      tags: ['cálculo'],
      reminders: [
        {
          reminderType: ReminderType.ONE_DAY_BEFORE,
          reminderTime: '09:00',
        },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.activity?.type).toBe('task')
    expect(result.activity?.reminders).toHaveLength(1)
    const reminder = result.activity?.reminders?.[0]
    expect(reminder?.reminderTimestamp.getTime()).toBeLessThan(dueDate.getTime())
    expect(repository.items.size).toBe(1)
  })

  it('cria prova e trabalho válidos', async () => {
    const repository = new InMemoryRepository()
    const useCase = new CreateActivityUseCase(repository)
    const subjectId = crypto.randomUUID()

    const exam = await useCase.execute({
      type: 'exam',
      userId: 'user-1',
      title: 'Prova',
      subjectId,
      date: addDays(new Date(), 5),
      time: '10:00',
      examType: 'WRITTEN' as never,
      content: ['Tema 1'],
    })
    expect(exam.success).toBe(true)

    const assignment = await useCase.execute({
      type: 'assignment',
      userId: 'user-1',
      title: 'Trabalho',
      description: 'Descrição',
      subjectId,
      dueDate: addDays(new Date(), 6),
      assignmentType: 'PROJECT' as never,
    })
    expect(assignment.success).toBe(true)
    expect(repository.items.size).toBe(2)
  })

  it('rejeita prazo no passado', async () => {
    const useCase = new CreateActivityUseCase(new InMemoryRepository())
    const result = await useCase.execute({
      type: 'task',
      userId: 'user-1',
      title: 'Atrasada',
      dueDate: subDays(new Date(), 2),
    })
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('PAST_DATE')
  })

  it('rejeita lembrete no passado', async () => {
    const useCase = new CreateActivityUseCase(new InMemoryRepository())
    const result = await useCase.execute({
      type: 'task',
      userId: 'user-1',
      title: 'Com lembrete',
      dueDate: addDays(new Date(), 1),
      dueTime: '08:00',
      reminders: [{ reminderType: ReminderType.ONE_DAY_BEFORE, reminderTime: '09:00' }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('REMINDER_IN_PAST')
  })

  it('rejeita mais de 3 lembretes', async () => {
    const useCase = new CreateActivityUseCase(new InMemoryRepository())
    const result = await useCase.execute({
      type: 'task',
      userId: 'user-1',
      title: 'Lembretes demais',
      dueDate: addDays(new Date(), 10),
      reminders: Array.from({ length: 4 }, () => ({
        reminderType: ReminderType.ONE_DAY_BEFORE,
        reminderTime: '09:00',
      })),
    })
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('MAX_REMINDERS')
  })

  it('não altera atividade existente em save duplicado', async () => {
    const repository = new InMemoryRepository()
    const task = taskFixture()
    await repository.save(task)
    const useCase = new CreateActivityUseCase(repository)
    const result = await useCase.execute({
      type: 'task',
      userId: 'user-1',
      title: 'Nova',
      dueDate: addDays(new Date(), 2),
    })
    expect(result.success).toBe(true)
    expect(repository.items.size).toBe(2)
  })
})
