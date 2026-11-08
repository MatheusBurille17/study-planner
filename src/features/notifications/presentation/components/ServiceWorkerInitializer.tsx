'use client'

import { useServiceWorkerRegistration } from '../hooks/useServiceWorkerRegistration'

/** Monta o registro do Service Worker no layout raiz. */
export function ServiceWorkerInitializer() {
  useServiceWorkerRegistration()
  return null
}
