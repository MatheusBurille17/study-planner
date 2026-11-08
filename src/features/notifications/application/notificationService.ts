import type { Activity } from '@/shared/types/activity'
import type { NotificationPreferences, PushSubscriptionRecord } from '@/shared/types/notification'
import type { NotificationRepository } from '../domain/repository'
import { formatNotificationMessage } from '../domain/notificationFormatter'
import { shouldSendNotification } from '../domain/rules'
import { sendPushNotification } from '../infrastructure/pushService'

export interface DeliveryResult {
  activityId: string
  sent: number
  failed: number
  simulated: number
  skipped?: string
  title?: string
  body?: string
}

/**
 * Entrega um lembrete para todas as subscriptions ativas do usuário.
 * Aplica preferências, quiet hours e logging de auditoria.
 */
export async function deliverReminder(input: {
  activity: Activity
  subjectName?: string
  preferences: NotificationPreferences
  subscriptions: PushSubscriptionRecord[]
  repository: NotificationRepository
  now?: Date
}): Promise<DeliveryResult> {
  const now = input.now ?? new Date()
  const decision = shouldSendNotification(input.activity, input.preferences, now)
  if (!decision.send) {
    return { activityId: input.activity.id, sent: 0, failed: 0, simulated: 0, skipped: decision.reason }
  }

  const message = formatNotificationMessage(input.activity, input.subjectName, now)
  const log = await input.repository.logNotification({
    userId: input.activity.userId,
    activityId: input.activity.id,
    activityType: input.activity.type,
    title: message.title,
    body: message.body,
    sentAt: now,
    status: 'pending',
  })

  let sent = 0
  let failed = 0
  let simulated = 0

  for (const subscription of input.subscriptions) {
    const result = await sendPushNotification(subscription, {
      title: message.title,
      body: message.body,
      tag: `activity-${input.activity.id}`,
      sound: input.preferences.soundEnabled,
      vibration: input.preferences.vibrationEnabled,
      data: {
        activityId: input.activity.id,
        activityType: input.activity.type,
        url: `/activities/${input.activity.id}`,
      },
    })

    if (result.success) {
      sent += 1
      if (result.simulated) simulated += 1
    } else {
      failed += 1
    }

    await input.repository.logDelivery({
      notificationId: log.id,
      userId: input.activity.userId,
      subscriptionId: subscription.id,
      attempt: 1,
      status: result.success ? 'success' : 'failed',
      errorCode: result.statusCode,
      errorMessage: result.error,
      nextRetryAt:
        !result.success && result.statusCode && result.statusCode >= 500
          ? new Date(now.getTime() + 5 * 60 * 1000)
          : undefined,
    })
  }

  return {
    activityId: input.activity.id,
    sent,
    failed,
    simulated,
    title: message.title,
    body: message.body,
  }
}
