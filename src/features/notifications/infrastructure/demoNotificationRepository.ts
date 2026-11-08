import type {
  NotificationLog,
  NotificationPreferences,
  PushSubscriptionRecord,
} from '@/shared/types/notification'
import type { NotificationRepository, PushSubscriptionInput } from '../domain/repository'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../domain/repository'
import { mutateDemoDatabase, readDemoDatabase } from '@/shared/lib/demo/store'

function revivePreference(row: Record<string, unknown>): NotificationPreferences {
  return {
    ...(row as unknown as NotificationPreferences),
    updatedAt: new Date(String(row.updatedAt)),
  }
}

/** Repositório local de notificações (modo demo). */
export class DemoNotificationRepository implements NotificationRepository {
  async saveSubscription(userId: string, input: PushSubscriptionInput): Promise<PushSubscriptionRecord> {
    const now = new Date().toISOString()
    const record = await mutateDemoDatabase((db) => {
      const existing = db.pushSubscriptions.find(
        (subscription) => subscription.userId === userId && subscription.endpoint === input.endpoint,
      )
      if (existing) {
        existing.p256dh = input.keys.p256dh
        existing.auth = input.keys.auth
        existing.isActive = true
        existing.updatedAt = now
        existing.deviceInfo = input.deviceInfo ?? existing.deviceInfo
        return existing
      }
      const created = {
        id: crypto.randomUUID(),
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        isActive: true,
        deviceInfo: input.deviceInfo,
        createdAt: now,
        updatedAt: now,
      }
      db.pushSubscriptions.push(created)
      return created
    })
    return {
      ...(record as unknown as PushSubscriptionRecord),
      createdAt: new Date(String(record.createdAt)),
      updatedAt: new Date(String(record.updatedAt)),
    }
  }

  async getActiveSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    const db = await readDemoDatabase()
    return db.pushSubscriptions
      .filter((subscription) => subscription.userId === userId && subscription.isActive)
      .map((subscription) => ({
        ...(subscription as unknown as PushSubscriptionRecord),
        createdAt: new Date(String(subscription.createdAt)),
        updatedAt: new Date(String(subscription.updatedAt)),
      }))
  }

  async unsubscribeAll(userId: string): Promise<void> {
    await mutateDemoDatabase((db) => {
      db.pushSubscriptions
        .filter((subscription) => subscription.userId === userId)
        .forEach((subscription) => {
          subscription.isActive = false
          subscription.updatedAt = new Date().toISOString()
        })
    })
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const db = await readDemoDatabase()
    const existing = db.notificationPreferences.find((preference) => preference.userId === userId)
    if (existing) return revivePreference(existing)

    const now = new Date().toISOString()
    const created = await mutateDemoDatabase((database) => {
      const found = database.notificationPreferences.find((preference) => preference.userId === userId)
      if (found) return found
      const record = {
        userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        updatedAt: now,
      }
      database.notificationPreferences.push(record)
      return record
    })
    return revivePreference(created)
  }

  async updatePreferences(
    userId: string,
    input: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>,
  ): Promise<NotificationPreferences> {
    await this.getPreferences(userId)
    const updated = await mutateDemoDatabase((db) => {
      const row = db.notificationPreferences.find((preference) => preference.userId === userId)
      if (!row) throw new Error('Preferências não encontradas')
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) row[key] = value
      }
      row.updatedAt = new Date().toISOString()
      return row
    })
    return revivePreference(updated)
  }

  async logNotification(log: Omit<NotificationLog, 'id'>): Promise<NotificationLog> {
    const record = {
      id: crypto.randomUUID(),
      ...log,
      sentAt: log.sentAt.toISOString(),
    }
    await mutateDemoDatabase((db) => {
      db.notificationLogs.push(record as unknown as Record<string, unknown>)
    })
    return { ...log, id: record.id }
  }

  async logDelivery(input: {
    notificationId: string
    userId: string
    subscriptionId: string
    attempt: number
    status: 'pending' | 'success' | 'failed'
    errorCode?: number
    errorMessage?: string
    nextRetryAt?: Date
  }): Promise<void> {
    await mutateDemoDatabase((db) => {
      db.notificationDelivery.push({
        id: crypto.randomUUID(),
        notification_id: input.notificationId,
        user_id: input.userId,
        subscription_id: input.subscriptionId,
        attempt: input.attempt,
        status: input.status,
        error_code: input.errorCode,
        error_message: input.errorMessage,
        next_retry_at: input.nextRetryAt?.toISOString(),
        created_at: new Date().toISOString(),
      })
    })
  }

  async getLogs(userId: string, limit = 50): Promise<NotificationLog[]> {
    const db = await readDemoDatabase()
    return db.notificationLogs
      .filter((log) => log.userId === userId)
      .slice(-limit)
      .reverse()
      .map((log) => ({
        ...(log as unknown as NotificationLog),
        sentAt: new Date(String(log.sentAt)),
      }))
  }

  async logClick(notificationId: string, userId: string, referrer?: string): Promise<void> {
    await mutateDemoDatabase((db) => {
      db.notificationDelivery.push({
        id: crypto.randomUUID(),
        notificationId,
        userId,
        clickedAt: new Date().toISOString(),
        referrer,
      })
    })
  }
}

export const demoNotificationRepository = new DemoNotificationRepository()
