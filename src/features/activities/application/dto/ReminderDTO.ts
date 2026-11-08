import type { ReminderInput } from '@/shared/types/activity'

export interface ReminderDTO {
  id: string
  activityId: string
  userId: string
  reminderType: string
  reminderOffsetMinutes: number
  reminderTime: string
  reminderTimestamp: Date | string
  isActive: boolean
}

export type CreateReminderInputDTO = ReminderInput

export interface UpdateReminderDTO extends Partial<ReminderInput> {
  id: string
}
