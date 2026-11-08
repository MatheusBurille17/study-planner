'use client'

import { useEffect, useState } from 'react'
import { offlineManager, type OfflineState } from '@/shared/lib/offline/offlineManager'

/** Conectividade + fila pendente, com health check e sincronização. */
export function useConnectivity(): OfflineState {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    pendingChanges: 0,
    syncState: 'idle',
  })

  useEffect(() => {
    void offlineManager.start()
    const unsubscribe = offlineManager.subscribe(setState)
    return () => {
      unsubscribe()
      offlineManager.stop()
    }
  }, [])

  return state
}
