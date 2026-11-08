import type {
  NotificationLog,
  NotificationPreferences,
  PushSubscriptionRecord,
} from '@/shared/types/notification'

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
  deviceInfo?: string
}

export interface NotificationRepository {
  saveSubscription(userId: string, input: PushSubscriptionInput): Promise<PushSubscriptionRecord>
  getActiveSubscriptions(userId: string): Promise<PushSubscriptionRecord[]>
  unsubscribeAll(userId: string): Promise<void>
  getPreferences(userId: string): Promise<NotificationPreferences>
  updatePreferences(
    userId: string,
    input: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>,
  ): Promise<NotificationPreferences>
  logNotification(log: Omit<NotificationLog, 'id'>): Promise<NotificationLog>
  logDelivery(input: {
    notificationId: string
    userId: string
    subscriptionId: string
    attempt: number
    status: 'pending' | 'success' | 'failed'
    errorCode?: number
    errorMessage?: string
    nextRetryAt?: Date
  }): Promise<void>
  getLogs(userId: string, limit?: number): Promise<NotificationLog[]>
  logClick(notificationId: string, userId: string, referrer?: string): Promise<void>
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'updatedAt'> = {
  remindersEnabled: true,
  examsEnabled: true,
  assignmentsEnabled: true,
  tasksEnabled: true,
  taskRemindersHours: 3,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  soundEnabled: true,
  vibrationEnabled: true,
}
