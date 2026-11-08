'use client'

import type { Activity } from '@/shared/types/activity'
import {
  getPendingCount,
  getPendingSyncQueue,
  getOfflineDatabase,
  updateSyncQueueEntry,
} from '@/shared/lib/offline/indexeddb'
import { createActivityAction } from '@/features/activities/presentation/actions/createActivity'
import { syncOfflineQueueAction } from '@/features/activities/presentation/actions/syncOfflineQueue'

const BACKOFF_SECONDS = [30, 60, 120]

export interface ProcessQueueResult {
  processed: number
  synced: number
  failed: number
}

/** Processa a fila FIFO, aplicando retry com backoff exponencial. */
export async function processSyncQueue(): Promise<ProcessQueueResult> {
  const entries = await getPendingSyncQueue()
  const result: ProcessQueueResult = { processed: 0, synced: 0, failed: 0 }
  if (entries.length === 0) return result

  for (const entry of entries) {
    result.processed += 1
    await updateSyncQueueEntry(entry.id, { status: 'SYNCING' })
    try {
      if (entry.operation === 'CREATE' && entry.entityType === 'activity') {
        const response = await createActivityAction(entry.entityData)
        if (!response.success) throw new Error(response.error?.message ?? 'Falha ao criar')
        const db = getOfflineDatabase()
        if (db) {
          await db.activities.update(entry.entityId, {
            synced: true,
            syncedAt: new Date().toISOString(),
            ...(response.activity ? { id: response.activity.id, data: response.activity } : {}),
          })
        }
      } else {
        const response = await syncOfflineQueueAction([
          {
            id: entry.id,
            action: entry.operation === 'DELETE' ? 'DELETE' : 'UPDATE',
            activityId: entry.entityId,
            payload: entry.entityData,
          },
        ])
        if (!response.success || response.failed.length > 0 || response.conflicts.length > 0) {
          throw new Error(
            response.failed[0]?.error ?? (response.conflicts.length ? 'Conflito de versão' : 'Falha ao sincronizar'),
          )
        }
      }

      await updateSyncQueueEntry(entry.id, {
        status: 'SYNCED',
        attemptCount: entry.attemptCount,
        error: undefined,
      })
      result.synced += 1
    } catch (error) {
      const attempts = entry.attemptCount + 1
      const failed = attempts > BACKOFF_SECONDS.length
      const nextRetryAt = failed
        ? undefined
        : new Date(Date.now() + BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)] * 1000).toISOString()
      await updateSyncQueueEntry(entry.id, {
        status: failed ? 'FAILED' : 'PENDING',
        attemptCount: attempts,
        nextRetryAt,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
      result.failed += 1
    }
  }

  if (result.synced > 0) {
    window.dispatchEvent(new CustomEvent('offline:queue-synced', { detail: result }))
    window.dispatchEvent(new CustomEvent('activity:changed'))
  }
  return result
}

export async function pendingChangesCount(): Promise<number> {
  return getPendingCount()
}

export function lastWriteWins(local: Activity, server: Activity): Activity {
  return server.updatedAt.getTime() >= local.updatedAt.getTime() ? server : local
}
