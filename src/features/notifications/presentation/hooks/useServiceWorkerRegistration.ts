'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/shared/lib/notifications/service-worker-registration'

export function useServiceWorkerRegistration(): void {
  useEffect(() => {
    /*
     * Em desenvolvimento o Service Worker não intercepta requisições (o
     * próprio SW ignora localhost), mas precisa ficar registrado para que
     * notificações push possam ser ativadas e testadas localmente.
     */
    void registerServiceWorker()
  }, [])
}
