'use client'

import {
  getPendingQueueItems,
  markAsFailed,
  markAsSynced,
} from '@/features/activities/infrastructure/offlineQueue'
import { syncOfflineQueueAction } from '../actions/syncOfflineQueue'

/** Sincroniza edições/exclusões offline em FIFO, com status por item. */
export async function syncOfflineEdits(): Promise<{ synced: number; failed: number; conflicts: number }> {
  const items = await getPendingQueueItems()
  if (items.length === 0) return { synced: 0, failed: 0, conflicts: 0 }

  const result = await syncOfflineQueueAction(
    items.map((item) => ({
      id: item.id,
      action: item.action,
      activityId: item.activityId,
      payload: item.payload,
    })),
  )

  for (const id of result.synced) {
    await markAsSynced(id)
  }
  for (const failure of result.failed) {
    await markAsFailed(failure.id, failure.error)
  }
  for (const conflict of result.conflicts) {
    await markAsFailed(conflict.id, 'Conflito: atividade alterada em outro dispositivo')
  }

  if (result.synced.length > 0) {
    window.dispatchEvent(new CustomEvent('activity:changed'))
    window.dispatchEvent(
      new CustomEvent('offline:queue-synced', {
        detail: { synced: result.synced.length, failed: result.failed.length, conflicts: result.conflicts.length },
      }),
    )
  }

  return {
    synced: result.synced.length,
    failed: result.failed.length,
    conflicts: result.conflicts.length,
  }
}

export function registerOfflineQueueSync(): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handler = () => {
    void syncOfflineEdits()
  }
  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}
