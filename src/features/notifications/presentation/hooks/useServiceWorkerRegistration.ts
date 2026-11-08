'use client'

import { useEffect } from 'react'
import {
  registerServiceWorker,
  unregisterServiceWorker,
} from '@/shared/lib/notifications/service-worker-registration'

export function useServiceWorkerRegistration(): void {
  useEffect(() => {
    // Em desenvolvimento o Service Worker cacheia chunks com nomes estáveis,
    // o que pode servir JavaScript antigo e causar erros de hidratação.
    if (process.env.NODE_ENV !== 'production') {
      void unregisterServiceWorker()
      return
    }

    void registerServiceWorker()
  }, [])
}
