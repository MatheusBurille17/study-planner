import type { Priority, TaskStatus, ActivityType } from './activity'

export type NotificationKind = 'exam' | 'assignment' | 'task'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'clicked'

export interface PushSubscriptionRecord {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  isActive: boolean
  deviceInfo?: string
  createdAt: Date
  updatedAt: Date
}

export interface NotificationPreferences {
  userId: string
  remindersEnabled: boolean
  examsEnabled: boolean
  assignmentsEnabled: boolean
  tasksEnabled: boolean
  taskRemindersHours: number
  quietHoursStart?: string
  quietHoursEnd?: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  updatedAt: Date
}

export interface NotificationLog {
  id: string
  userId: string
  activityId?: string
  activityType?: string
  title: string
  body: string
  sentAt: Date
  status: NotificationStatus
  error?: string
}

export interface ActivityFilter {
  types?: ActivityType[]
  priorities?: Priority[]
  statuses?: (TaskStatus | string)[]
  subjectIds?: string[]
  search?: string
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'title'
  sortOrder?: 'asc' | 'desc'
  /** Máximo de linhas carregadas na consulta (paginação no nível do banco). */
  limit?: number
  /** Deslocamento inicial para paginação. */
  offset?: number
}
