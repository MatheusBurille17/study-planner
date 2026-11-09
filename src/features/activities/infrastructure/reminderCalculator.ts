import type { ReminderOffset, ReminderType } from '@/shared/types/activity'
import {
  calculateReminderTimestamp,
  reminderOffsetMinutesFor,
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
  timeZone?: string,
): Date {
  return calculateReminderTimestamp(eventDate, reminderType, reminderTime, offset, timeZone)
}

export function reminderOffsetMinutes(
  reminderType: ReminderType,
  offset?: ReminderOffset,
): number {
  return reminderOffsetMinutesFor(reminderType, offset)
}

export function describeReminder(
  eventDate: Date,
  reminderType: ReminderType,
  reminderTime: string,
  offset?: ReminderOffset,
  timeZone?: string,
): { timestamp: Date; offsetMinutes: number } {
  return {
    timestamp: calculateReminderTimestamp(eventDate, reminderType, reminderTime, offset, timeZone),
    offsetMinutes: reminderOffsetMinutesFor(reminderType, offset),
  }
}
