import type { Activity } from '@/shared/types/activity'

export interface ActivityResponseDTO {
  id: string
  userId: string
  type: Activity['type']
  title: string
  description?: string
  subjectId?: string
  createdAt: Date | string
  updatedAt: Date | string
  reminders: Array<{
    id: string
    reminderType: string
    reminderTime: string
    reminderTimestamp: Date | string
  }>
}
