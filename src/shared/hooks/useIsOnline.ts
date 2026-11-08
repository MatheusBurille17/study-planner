'use client'

import { useEffect, useState } from 'react'
import { registerOnlineSync, syncPendingActivities } from '@/features/activities/presentation/lib/offlineSync'
import { registerOfflineQueueSync, syncOfflineEdits } from '@/features/activities/presentation/lib/offlineQueueSync'

/** Detecta conectividade com fallback para health check. */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const goOnline = () => {
      setIsOnline(true)
      void syncPendingActivities()
      void syncOfflineEdits()
    }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    const unregister = registerOnlineSync()
    const unregisterQueue = registerOfflineQueueSync()
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      unregister()
      unregisterQueue()
    }
  }, [])

  return isOnline
}
