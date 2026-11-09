import {
  ReminderType,
  type Reminder,
  type ReminderInput,
} from '@/shared/types/activity'

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Cria a entidade de lembrete já com o instante calculado. */
export function createReminderEntity(
  input: ReminderInput,
  activityId: string,
  userId: string,
  reminderTimestamp: Date,
  offsetMinutes: number,
): Reminder {
  return {
    ...input,
    id: createId(),
    activityId,
    userId,
    reminderType: input.reminderType ?? ReminderType.ONE_HOUR_BEFORE,
    reminderOffsetMinutes: offsetMinutes,
    reminderTimestamp,
    isActive: true,
    wasFired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export type { Reminder, ReminderInput } from '@/shared/types/activity'
