'use client'

import type { UpdateActivityInput } from '@/features/activities/presentation/schemas/updateActivitySchema'
import {
  addToSyncQueue,
  deleteSyncQueueEntry,
  getPendingSyncQueue,
  getSyncQueue,
  updateSyncQueueEntry,
  type SyncQueueEntry,
} from '@/shared/lib/offline/indexeddb'

export type OfflineActionType = 'UPDATE' | 'DELETE'
export type OfflineQueueStatus = 'PENDING' | 'SYNCED' | 'FAILED'

export interface OfflineQueueItem {
  id: string
  userId?: string
  action: OfflineActionType
  activityId: string
  payload?: UpdateActivityInput | { activityId: string }
  status: OfflineQueueStatus
  attempts: number
  createdAt: string
  syncedAt?: string
  lastError?: string
}

function mapEntry(entry: SyncQueueEntry): OfflineQueueItem {
  return {
    id: entry.id,
    userId: entry.userId || undefined,
    action: entry.operation === 'DELETE' ? 'DELETE' : 'UPDATE',
    activityId: entry.entityId,
    payload: entry.entityData as UpdateActivityInput,
    status: entry.status === 'SYNCED' ? 'SYNCED' : entry.status === 'FAILED' ? 'FAILED' : 'PENDING',
    attempts: entry.attemptCount,
    createdAt: entry.timestamp,
    lastError: entry.error,
  }
}

export async function addToQueue(
  action: OfflineActionType,
  activityId: string,
  payload?: UpdateActivityInput | { activityId: string },
): Promise<OfflineQueueItem | null> {
  const entry = await addToSyncQueue(action, 'activity', activityId, payload)
  return entry ? mapEntry(entry) : null
}

export async function getQueueItems(): Promise<OfflineQueueItem[]> {
  const entries = await getSyncQueue()
  return entries.filter((entry) => entry.operation !== 'CREATE').map(mapEntry)
}

export async function getPendingQueueItems(): Promise<OfflineQueueItem[]> {
  const entries = await getPendingSyncQueue()
  return entries.filter((entry) => entry.operation !== 'CREATE').map(mapEntry)
}

export async function markAsSynced(itemId: string): Promise<void> {
  await updateSyncQueueEntry(itemId, { status: 'SYNCED' })
}

export async function markAsFailed(itemId: string, error: string): Promise<void> {
  await updateSyncQueueEntry(itemId, { status: 'FAILED', error })
}

export async function removeFromQueue(itemId: string): Promise<void> {
  await deleteSyncQueueEntry(itemId)
}
