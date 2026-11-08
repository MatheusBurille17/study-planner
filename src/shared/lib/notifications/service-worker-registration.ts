'use client'

export interface ServiceWorkerRegistrationResult {
  supported: boolean
  registration: ServiceWorkerRegistration | null
  error?: string
}

/** Registra o Service Worker, com fallback silencioso em navegadores incompatíveis. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { supported: false, registration: null, error: 'Service Worker não suportado' }
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw:update-available'))
        }
      })
    })
    return { supported: true, registration }
  } catch (error) {
    return {
      supported: true,
      registration: null,
      error: error instanceof Error ? error.message : 'Falha ao registrar Service Worker',
    }
  }
}

export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
}
