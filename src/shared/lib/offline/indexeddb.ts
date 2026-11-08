'use client'

import Dexie, { type Table } from 'dexie'
import type { Activity } from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE'
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED'

export interface OfflineActivityRecord {
  id: string
  userId: string
  data: Activity
  status: string
  dueDate?: string
  synced: boolean
  syncedAt?: string
  updatedAt: string
}

export interface OfflineSubjectRecord {
  id: string
  userId: string
  data: Subject
  synced: boolean
  syncedAt?: string
}

export interface SyncQueueEntry {
  id: string
  userId: string
  operation: SyncOperation
  entityType: 'activity' | 'subject'
  entityId: string
  entityData: unknown
  timestamp: string
  status: SyncStatus
  attemptCount: number
  nextRetryAt?: string
  error?: string
}

class OfflineDatabase extends Dexie {
  activities!: Table<OfflineActivityRecord, string>
  subjects!: Table<OfflineSubjectRecord, string>
  syncQueue!: Table<SyncQueueEntry, string>

  constructor() {
    super('amanda_study_planner')
    this.version(1).stores({
      activities: 'id, userId, status, dueDate, synced, [userId+status]',
      subjects: 'id, userId, synced',
      syncQueue: 'id, userId, status, timestamp, operation, entityType',
    })
  }
}

let database: OfflineDatabase | null = null
let unavailable = false

export function getOfflineDatabase(): OfflineDatabase | null {
  if (typeof window === 'undefined' || unavailable) return null
  if (!database) {
    try {
      database = new OfflineDatabase()
    } catch {
      unavailable = true
      return null
    }
  }
  return database
}

export async function initDatabase(): Promise<boolean> {
  const db = getOfflineDatabase()
  if (!db) return false
  try {
    await db.open()
    return true
  } catch {
    unavailable = true
    return false
  }
}

function toRecord(activity: Activity): OfflineActivityRecord {
  const dueDate =
    activity.type === 'task' || activity.type === 'assignment'
      ? activity.dueDate?.toISOString()
      : activity.type === 'exam'
        ? activity.date?.toISOString()
        : undefined
  return {
    id: activity.id,
    userId: activity.userId,
    data: activity,
    status: 'status' in activity ? String(activity.status) : activity.type,
    dueDate,
    synced: Boolean(activity.synced),
    syncedAt: activity.synced ? new Date().toISOString() : undefined,
    updatedAt: activity.updatedAt.toISOString(),
  }
}

export async function saveActivity(activity: Activity): Promise<void> {
  const db = getOfflineDatabase()
  if (!db) return
  await db.activities.put(toRecord(activity))
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  const db = getOfflineDatabase()
  if (!db) return
  await db.activities.bulkPut(activities.map(toRecord))
}

export async function getActivity(id: string): Promise<Activity | null> {
  const db = getOfflineDatabase()
  if (!db) return null
  const record = await db.activities.get(id)
  return record?.data ?? null
}

export async function getActivitiesByUser(userId: string): Promise<Activity[]> {
  const db = getOfflineDatabase()
  if (!db) return []
  const rows = await db.activities.where('userId').equals(userId).toArray()
  return rows.map((row) => row.data)
}

export async function getActivitiesByStatus(userId: string, status: string): Promise<Activity[]> {
  const db = getOfflineDatabase()
  if (!db) return []
  const rows = await db.activities.where('[userId+status]').equals([userId, status]).toArray().catch(async () => {
    const all = await db.activities.where('userId').equals(userId).toArray()
    return all.filter((row) => row.status === status)
  })
  return rows.map((row) => row.data)
}

export async function deleteActivityOffline(id: string): Promise<void> {
  const db = getOfflineDatabase()
  if (!db) return
  await db.activities.delete(id)
}

export async function saveSubject(subject: Subject): Promise<void> {
  const db = getOfflineDatabase()
  if (!db) return
  await db.subjects.put({
    id: subject.id,
    userId: subject.userId,
    data: subject,
    synced: true,
    syncedAt: new Date().toISOString(),
  })
}

export async function getSubject(id: string): Promise<Subject | null> {
  const db = getOfflineDatabase()
  if (!db) return null
  return (await db.subjects.get(id))?.data ?? null
}

export async function getSubjectsByUser(userId: string): Promise<Subject[]> {
  const db = getOfflineDatabase()
  if (!db) return []
  const rows = await db.subjects.where('userId').equals(userId).toArray()
  return rows.map((row) => row.data)
}

export async function deleteSubjectOffline(id: string): Promise<void> {
  const db = getOfflineDatabase()
  if (!db) return
  await db.subjects.delete(id)
}

export async function addToSyncQueue(
  operation: SyncOperation,
  entityType: 'activity' | 'subject',
  entityId: string,
  entityData: unknown,
  userId = '',
): Promise<SyncQueueEntry | null> {
  const db = getOfflineDatabase()
  if (!db) return null
  const entry: SyncQueueEntry = {
    id: `sync-${crypto.randomUUID()}`,
    userId,
    operation,
    entityType,
    entityId,
    entityData,
    timestamp: new Date().toISOString(),
    status: 'PENDING',
    attemptCount: 0,
  }
  await db.syncQueue.put(entry)
  return entry
}

export async function getSyncQueue(userId?: string): Promise<SyncQueueEntry[]> {
  const db = getOfflineDatabase()
  if (!db) return []
  const rows = userId
    ? await db.syncQueue.where('userId').equals(userId).toArray()
    : await db.syncQueue.toArray()
  return rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function getSyncQueueByStatus(userId: string, status: SyncStatus): Promise<SyncQueueEntry[]> {
  const db = getOfflineDatabase()
  if (!db) return []
  const rows = await db.syncQueue.where('status').equals(status).toArray()
  return rows
    .filter((entry) => !entry.userId || entry.userId === userId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function getPendingSyncQueue(): Promise<SyncQueueEntry[]> {
  const db = getOfflineDatabase()
  if (!db) return []
  const rows = await db.syncQueue.where('status').equals('PENDING').toArray()
  return rows
    .filter((entry) => !entry.nextRetryAt || new Date(entry.nextRetryAt).getTime() <= Date.now())
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function updateSyncQueueEntry(
  id: string,
  updates: Partial<SyncQueueEntry>,
): Promise<void> {
  const db = getOfflineDatabase()
  if (!db) return
  await db.syncQueue.update(id, updates)
}

export async function deleteSyncQueueEntry(id: string): Promise<void> {
  const db = getOfflineDatabase()
  if (!db) return
  await db.syncQueue.delete(id)
}

export async function getPendingCount(): Promise<number> {
  const db = getOfflineDatabase()
  if (!db) return 0
  return db.syncQueue.where('status').equals('PENDING').count()
}

export async function clearOfflineDatabase(): Promise<void> {
  const db = getOfflineDatabase()
  if (!db) return
  await Promise.all([db.activities.clear(), db.subjects.clear(), db.syncQueue.clear()])
}
