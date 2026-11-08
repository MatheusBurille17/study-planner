'use client'

import { subscribeToNotifications } from '../actions/notificationActions'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index)
  }
  return output
}

export interface BrowserSubscriptionResult {
  success: boolean
  error?: string
  simulated?: boolean
}

/**
 * Solicita permissão, cria a inscrição push no navegador e a envia ao servidor.
 * Sem chave VAPID (modo demo), retorna simulated=true.
 */
export async function subscribeBrowserToPush(): Promise<BrowserSubscriptionResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Este navegador não suporta notificações push' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { success: false, error: 'Permissão de notificação não concedida' }
  }

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    const json = existing.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (json.endpoint && json.keys?.p256dh && json.keys.auth) {
      await subscribeToNotifications({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      })
      return { success: true }
    }
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    return {
      success: true,
      simulated: true,
      error: 'Chave VAPID não configurada — notificações simuladas neste ambiente.',
    }
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      return { success: false, error: 'Inscrição push inválida' }
    }
    const result = await subscribeToNotifications({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    })
    if (!result.success) return { success: false, error: result.error?.message }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao criar inscrição push',
    }
  }
}

export async function unsubscribeBrowserPush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  await subscription?.unsubscribe()
}
