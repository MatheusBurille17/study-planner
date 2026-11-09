import { describe, expect, it } from 'vitest'
import { Priority, ReminderType, TaskStatus } from '@/shared/types/activity'
import {
  buildReminders,
  reminderOffsetMinutesFor,
} from '@/features/activities/domain/rules'
import { buildActivityUpdate } from '@/features/activities/application/useCases/buildActivityUpdate'
import type { UpdateActivityInput } from '@/features/activities/presentation/schemas/updateActivitySchema'
import { updateTaskSchema } from '@/features/activities/presentation/schemas/createActivitySchema'
import { serializeActivity } from '@/features/activities/infrastructure/mappers/activityMapper'
import { parseDateOnly } from '@/shared/utils/dateHelpers'
import { combineDateAndTimeInTimeZone, getZonedDateTimeParts } from '@/shared/utils/timezone'
import { taskFixture } from '../../fixtures/activityFixtures'

const TIME_ZONE = 'America/Sao_Paulo'
const NOW = new Date('2026-11-01T12:00:00Z')

function eventAt(date: string, time: string): Date {
  return combineDateAndTimeInTimeZone(parseDateOnly(date)!, time, TIME_ZONE)
}

describe('lógica de lembretes', () => {
  it('calcula 1 dia antes no dia e horário corretos', () => {
    const [reminder] = buildReminders({
      activityId: 'activity-1',
      userId: 'user-1',
      eventDate: eventAt('2026-12-15', '18:00'),
      reminders: [{ reminderType: ReminderType.ONE_DAY_BEFORE, reminderTime: '09:00' }],
      timeZone: TIME_ZONE,
      now: NOW,
    })

    expect(reminder.reminderOffsetMinutes).toBe(24 * 60)
    expect(getZonedDateTimeParts(reminder.reminderTimestamp, TIME_ZONE)).toMatchObject({
      month: 12,
      day: 14,
      hour: 9,
      minute: 0,
    })
  })

  it('salva o offset correto para lembretes predefinidos', () => {
    expect(reminderOffsetMinutesFor(ReminderType.ONE_HOUR_BEFORE)).toBe(60)
    expect(reminderOffsetMinutesFor(ReminderType.TWO_HOURS_BEFORE)).toBe(120)
    expect(reminderOffsetMinutesFor(ReminderType.THREE_HOURS_BEFORE)).toBe(180)
    expect(reminderOffsetMinutesFor(ReminderType.ONE_DAY_BEFORE)).toBe(24 * 60)
    expect(reminderOffsetMinutesFor(ReminderType.TWO_DAYS_BEFORE)).toBe(48 * 60)
    expect(
      reminderOffsetMinutesFor(ReminderType.CUSTOM, { value: 90, unit: 'MINUTES' }),
    ).toBe(90)
  })

  it('edita atividade com lembrete sem quebrar e preserva o id', () => {
    const dueDate = parseDateOnly('2026-12-15')!
    const eventDate = eventAt('2026-12-15', '18:00')
    const [existingReminder] = buildReminders({
      activityId: 'activity-1',
      userId: 'user-1',
      eventDate,
      reminders: [{ reminderType: ReminderType.ONE_DAY_BEFORE, reminderTime: '09:00' }],
      timeZone: TIME_ZONE,
      now: NOW,
    })

    const existing = taskFixture({
      id: 'activity-1',
      dueDate,
      dueTime: '18:00',
      reminders: [existingReminder],
    })

    const data = {
      type: 'task',
      title: 'Tarefa editada',
      dueDate,
      dueTime: '18:00',
      priority: Priority.HIGH,
      status: TaskStatus.TODO,
      reminders: [{ reminderType: ReminderType.ONE_DAY_BEFORE, reminderTime: '09:00' }],
      timezone: TIME_ZONE,
    } as unknown as UpdateActivityInput

    const updated = buildActivityUpdate({
      existing,
      data,
      userId: 'user-1',
      now: new Date('2026-11-02T12:00:00Z'),
    })

    expect(updated.reminders).toHaveLength(1)
    expect(updated.reminders?.[0].id).toBe(existingReminder.id)
    expect(updated.reminders?.[0].reminderTimestamp.getTime()).toBe(
      existingReminder.reminderTimestamp.getTime(),
    )
    // Regressão: o update antigo quebrava ao serializar lembretes sem timestamp.
    expect(() => serializeActivity(updated)).not.toThrow()
  })

  it('permite editar atividade antiga sem bloquear por lembrete passado', () => {
    const existing = taskFixture({
      dueDate: parseDateOnly('2026-01-10')!,
      dueTime: '18:00',
      reminders: [],
    })

    const data = {
      type: 'task',
      title: 'Tarefa antiga',
      dueDate: parseDateOnly('2026-01-10')!,
      dueTime: '18:00',
      reminders: [{ reminderType: ReminderType.ON_DAY, reminderTime: '09:00' }],
      timezone: TIME_ZONE,
    } as unknown as UpdateActivityInput

    const updated = buildActivityUpdate({ existing, data, userId: 'user-1' })

    expect(updated.reminders).toHaveLength(1)
    // Lembrete já passou: fica salvo, mas inativo (não dispara).
    expect(updated.reminders?.[0].isActive).toBe(false)
  })

  it('schema de edição aceita atividade antiga com lembrete passado', () => {
    const parsed = updateTaskSchema.safeParse({
      type: 'task',
      title: 'Tarefa antiga',
      dueDate: '2026-01-10',
      dueTime: '18:00',
      reminders: [{ reminderType: ReminderType.ON_DAY, reminderTime: '09:00' }],
      timezone: TIME_ZONE,
    })

    expect(parsed.success).toBe(true)
  })

  it('rejeita dois lembretes que caem no mesmo horário', () => {
    expect(() =>
      buildReminders({
        activityId: 'activity-1',
        userId: 'user-1',
        eventDate: eventAt('2026-12-15', '18:00'),
        reminders: [
          { reminderType: ReminderType.ONE_DAY_BEFORE, reminderTime: '09:00' },
          {
            reminderType: ReminderType.CUSTOM,
            reminderTime: '09:00',
            reminderOffset: { value: 1, unit: 'DAYS' },
          },
        ],
        timeZone: TIME_ZONE,
        now: NOW,
      }),
    ).toThrow(/duplicados/)
  })

  it('usa o fuso do usuário e não o fuso do servidor', () => {
    const eventDate = eventAt('2026-12-15', '18:00')
    const [reminder] = buildReminders({
      activityId: 'activity-1',
      userId: 'user-1',
      eventDate,
      reminders: [{ reminderType: ReminderType.ONE_HOUR_BEFORE, reminderTime: '09:00' }],
      timeZone: TIME_ZONE,
      now: NOW,
    })

    // 17:00 em São Paulo = 20:00 UTC.
    expect(reminder.reminderTimestamp.toISOString()).toBe('2026-12-15T20:00:00.000Z')
  })
})
