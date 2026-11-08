'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getNotificationRepository } from '../../infrastructure/notificationRepository'
import { subscribeSchema, notificationPreferencesSchema } from '../schemas/notificationSchemas'
import type { NotificationPreferences, PushSubscriptionRecord } from '@/shared/types/notification'
import { isPushConfigured } from '../../infrastructure/pushService'

export interface NotificationActionResult {
  success: boolean
  message?: string
  error?: { code: string; message: string }
  data?: unknown
}

/** Registra (ou reativa) uma inscrição push do navegador. */
export async function subscribeToNotifications(input: unknown): Promise<NotificationActionResult> {
  try {
    const user = await requireUser()
    const parsed = subscribeSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      }
    }

    const headerStore = await headers()
    const repository = await getNotificationRepository()
    const subscription = await repository.saveSubscription(user.id, {
      ...parsed.data,
      deviceInfo: parsed.data.deviceInfo ?? headerStore.get('user-agent') ?? undefined,
    })

    revalidatePath('/settings/notifications')
    return { success: true, message: 'Notificações ativadas neste dispositivo', data: { id: subscription.id } }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao registrar inscrição' } }
  }
}

/** Desativa todas as inscrições (mantém histórico para auditoria). */
export async function unsubscribeFromNotifications(): Promise<NotificationActionResult> {
  try {
    const user = await requireUser()
    const repository = await getNotificationRepository()
    await repository.unsubscribeAll(user.id)
    revalidatePath('/settings/notifications')
    return { success: true, message: 'Notificações desativadas' }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao desativar notificações' } }
  }
}

/** Atualiza preferências parciais de notificação. */
export async function updateNotificationPreferences(
  input: unknown,
): Promise<NotificationActionResult & { data?: NotificationPreferences }> {
  try {
    const user = await requireUser()
    const parsed = notificationPreferencesSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Preferências inválidas' },
      }
    }

    const repository = await getNotificationRepository()
    const preferences = await repository.updatePreferences(user.id, parsed.data)
    revalidatePath('/settings/notifications')
    return { success: true, data: preferences }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar preferências' } }
  }
}

export async function getNotificationPreferencesAction(): Promise<
  NotificationActionResult & { data?: NotificationPreferences }
> {
  try {
    const user = await requireUser()
    const repository = await getNotificationRepository()
    return { success: true, data: await repository.getPreferences(user.id) }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar preferências' } }
  }
}

export async function getActiveSubscriptionsAction(): Promise<
  NotificationActionResult & { data?: PushSubscriptionRecord[] }
> {
  try {
    const user = await requireUser()
    const repository = await getNotificationRepository()
    return { success: true, data: await repository.getActiveSubscriptions(user.id) }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar inscrições' } }
  }
}

/** Envia notificação de teste imediatamente (ou simula em modo demo). */
export async function sendTestNotificationAction(): Promise<NotificationActionResult> {
  try {
    const user = await requireUser()
    const repository = await getNotificationRepository()
    const [preferences, subscriptions] = await Promise.all([
      repository.getPreferences(user.id),
      repository.getActiveSubscriptions(user.id),
    ])

    const now = new Date()
    const title = 'Study Planner: teste'
    const body = 'Tudo certo! Você receberá lembretes de provas, entregas e tarefas por aqui.'

    const log = await repository.logNotification({
      userId: user.id,
      title,
      body,
      sentAt: now,
      status: 'pending',
    })

    if (subscriptions.length === 0) {
      if (!isPushConfigured()) {
        await repository.logNotification({
          userId: user.id,
          title,
          body: `${body} (simulado — modo demo sem VAPID)`,
          sentAt: now,
          status: 'sent',
        })
        return {
          success: true,
          message: 'Notificação de teste simulada. Configure as chaves VAPID para envio real.',
        }
      }
      return {
        success: false,
        error: { code: 'NO_SUBSCRIPTION', message: 'Nenhuma inscrição ativa. Ative as notificações neste dispositivo primeiro.' },
      }
    }

    let sent = 0
    for (const subscription of subscriptions) {
      const { sendPushNotification } = await import('../../infrastructure/pushService')
      const result = await sendPushNotification(subscription, {
        title,
        body,
        tag: 'test-notification',
        sound: preferences.soundEnabled,
        vibration: preferences.vibrationEnabled,
        data: { url: '/settings/notifications' },
      })
      await repository.logDelivery({
        notificationId: log.id,
        userId: user.id,
        subscriptionId: subscription.id,
        attempt: 1,
        status: result.success ? 'success' : 'failed',
        errorCode: result.statusCode,
        errorMessage: result.error,
      })
      if (result.success) sent += 1
    }

    await repository.logNotification({
      userId: user.id,
      title,
      body,
      sentAt: now,
      status: sent > 0 ? 'sent' : 'failed',
      error: sent > 0 ? undefined : 'Nenhum envio concluído',
    })

    if (sent === 0) {
      return { success: false, error: { code: 'SEND_FAILED', message: 'Não foi possível enviar a notificação de teste' } }
    }
    return { success: true, message: `Notificação de teste enviada para ${sent} dispositivo(s)` }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao enviar notificação de teste' } }
  }
}

export async function logNotificationClickAction(
  notificationId: string,
  referrer?: string,
): Promise<NotificationActionResult> {
  try {
    const user = await requireUser()
    const repository = await getNotificationRepository()
    await repository.logClick(notificationId, user.id, referrer)
    return { success: true }
  } catch {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao registrar clique' } }
  }
}
