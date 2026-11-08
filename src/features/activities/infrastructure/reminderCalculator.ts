import type { ReminderOffset, ReminderType } from '@/shared/types/activity'
import {
  calculateReminderTimestamp,
  offsetToMinutes,
} from '@/features/activities/domain/rules'

/**
 * Serviço de cálculo de lembretes.
 * Armazena timestamps em UTC (Date) e exibe em horário local.
 */
export function calculateReminderTimestampForEvent(
  eventDate: Date,
  reminderType: ReminderType,
  reminderTime: string,
  offset?: ReminderOffset,
): Date {
  return calculateReminderTimestamp(eventDate, reminderType, reminderTime, offset)
}

export function reminderOffsetMinutes(
  reminderType: ReminderType,
  offset?: ReminderOffset,
): number {
  return offsetToMinutes(offset)
}

export function describeReminder(
  eventDate: Date,
  reminderType: ReminderType,
  reminderTime: string,
  offset?: ReminderOffset,
): { timestamp: Date; offsetMinutes: number } {
  return {
    timestamp: calculateReminderTimestamp(eventDate, reminderType, reminderTime, offset),
    offsetMinutes: reminderOffsetMinutes(reminderType, offset),
  }
}
