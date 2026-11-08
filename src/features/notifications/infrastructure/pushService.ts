import webpush from 'web-push'
import type { PushSubscriptionRecord } from '@/shared/types/notification'

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  sound?: boolean
  vibration?: boolean
}

export interface PushResult {
  success: boolean
  simulated: boolean
  statusCode?: number
  error?: string
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

let configured = false

function ensureVapid(): void {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:amanda@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  )
  configured = true
}

/** Envia Web Push. Sem VAPID configurado, simula entrega (modo demo). */
export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<PushResult> {
  if (!isPushConfigured()) {
    return { success: true, simulated: true }
  }

  ensureVapid()
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        ...payload,
        icon: payload.icon ?? '/icons/icon-192x192.png',
        badge: payload.badge ?? '/icons/badge-72x72.png',
        data: { ...payload.data, url: payload.data?.url ?? '/dashboard' },
      }),
      { TTL: 60 * 60 * 24, urgency: 'high' },
    )
    return { success: true, simulated: false, statusCode: 201 }
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : undefined
    return {
      success: false,
      simulated: false,
      statusCode,
      error: error instanceof Error ? error.message : 'Erro ao enviar push',
    }
  }
}
