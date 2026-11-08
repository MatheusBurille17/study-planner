'use client'

import type { CreateActivityDTO } from '@/features/activities/application/dto/CreateActivityDTO'
import type { Activity } from '@/shared/types/activity'
import { createActivityAction } from '@/features/activities/presentation/actions/createActivity'
import {
  addToSyncQueue,
  getActivitiesByUser,
  getPendingSyncQueue,
  getSyncQueue,
  saveActivity,
  updateSyncQueueEntry,
} from '@/shared/lib/offline/indexeddb'

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED'

export interface OfflineActivity {
  id: string
  payload: CreateActivityDTO
  title: string
  type: string
  createdAt: string
  status: SyncStatus
  attempts: number
  lastError?: string
}

/** Cria um registro local mínimo para exibição enquanto offline. */
function buildLocalActivity(payload: CreateActivityDTO, id: string): Activity {
  const now = new Date()
  const base = {
    id,
    userId: '',
    title: payload.title ?? 'Nova atividade',
    description: payload.description,
    subjectId: payload.subjectId,
    createdAt: now,
    updatedAt: now,
    reminders: [],
    synced: false,
  }
  if (payload.type === 'task') {
    return {
      ...base,
      type: 'task',
      title: payload.title ?? 'Nova tarefa',
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      dueTime: payload.dueTime,
      priority: payload.priority ?? ('MEDIUM' as never),
      status: payload.status ?? ('TODO' as never),
      estimatedTimeMinutes: payload.estimatedTimeMinutes,
      tags: payload.tags,
    } as Activity
  }
  if (payload.type === 'exam') {
    return {
      ...base,
      type: 'exam',
      title: payload.title ?? 'Nova prova',
      date: payload.date ? new Date(payload.date) : now,
      time: payload.time,
      examType: payload.examType ?? ('WRITTEN' as never),
      content: payload.content,
      location: payload.location,
      notes: payload.notes,
    } as Activity
  }
  return {
    ...base,
    type: 'assignment',
    title: payload.title ?? 'Novo trabalho',
    description: payload.description ?? '',
    dueDate: payload.dueDate ? new Date(payload.dueDate) : now,
    dueTime: payload.dueTime,
    assignmentType: payload.assignmentType ?? ('WRITTEN' as never),
    criteria: payload.criteria,
    status: payload.status ?? ('PENDING' as never),
  } as Activity
}

export async function saveActivityOffline(input: {
  payload: CreateActivityDTO
  title: string
  type: string
  userId?: string
}): Promise<OfflineActivity | null> {
  const id = `local-${crypto.randomUUID()}`
  await saveActivity(buildLocalActivity(input.payload, id))
  const entry = await addToSyncQueue('CREATE', 'activity', id, input.payload, input.userId ?? '')
  if (!entry) return null

  const record: OfflineActivity = {
    id,
    payload: input.payload,
    title: input.title,
    type: input.type,
    createdAt: entry.timestamp,
    status: 'PENDING',
    attempts: 0,
  }
  window.dispatchEvent(new CustomEvent('offline:activity-saved', { detail: record }))
  return record
}

export async function listPendingActivities(): Promise<OfflineActivity[]> {
  const entries = await getSyncQueue()
  return entries
    .filter((entry) => entry.operation === 'CREATE')
    .map((entry) => ({
      id: entry.entityId,
      payload: entry.entityData as CreateActivityDTO,
      title: (entry.entityData as CreateActivityDTO).title ?? 'Atividade',
      type: (entry.entityData as CreateActivityDTO).type,
      createdAt: entry.timestamp,
      status: entry.status === 'SYNCED' ? 'SYNCED' : entry.status === 'FAILED' ? 'FAILED' : 'PENDING',
      attempts: entry.attemptCount,
      lastError: entry.error,
    }))
}

export async function listOfflineActivities(userId?: string): Promise<Activity[]> {
  if (!userId) return []
  return getActivitiesByUser(userId)
}

/** Sincroniza criações offline em ordem FIFO. */
export async function syncPendingActivities(): Promise<{ synced: number; failed: number }> {
  const entries = (await getPendingSyncQueue()).filter(
    (entry) => entry.operation === 'CREATE' && entry.entityType === 'activity',
  )
  let synced = 0
  let failed = 0

  for (const entry of entries) {
    try {
      const result = await createActivityAction(entry.entityData)
      if (!result.success) throw new Error(result.error?.message ?? 'Erro ao sincronizar')
      await updateSyncQueueEntry(entry.id, { status: 'SYNCED', error: undefined })
      synced += 1
      window.dispatchEvent(
        new CustomEvent('offline:activity-synced', { detail: { id: entry.entityId, activity: result.activity } }),
      )
    } catch (error) {
      const attempts = entry.attemptCount + 1
      await updateSyncQueueEntry(entry.id, {
        status: attempts >= 3 ? 'FAILED' : 'PENDING',
        attemptCount: attempts,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
      failed += 1
    }
  }

  return { synced, failed }
}

export function registerOnlineSync(): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handler = () => {
    void syncPendingActivities()
  }
  window.addEventListener('online', handler)
  if (navigator.onLine) void syncPendingActivities()
  return () => window.removeEventListener('online', handler)
}
