'use client'

import Dexie, { type Table } from 'dexie'
import type { Activity } from '@/shared/types/activity'

interface CachedActivity {
  id: string
  userId: string
  data: Activity
  cachedAt: number
  expiresAt: number
}

interface CacheMetadata {
  key: string
  userId: string
  updatedAt: number
}

class ActivityCacheDatabase extends Dexie {
  activities!: Table<CachedActivity, string>
  metadata!: Table<CacheMetadata, string>

  constructor() {
    super('amanda_activity_cache')
    this.version(1).stores({
      activities: 'id, userId, expiresAt',
      metadata: 'key, userId',
    })
  }
}

let database: ActivityCacheDatabase | null = null

function getDatabase(): ActivityCacheDatabase | null {
  if (typeof window === 'undefined') return null
  if (!database) database = new ActivityCacheDatabase()
  return database
}

const TTL_MS = 60 * 60 * 1000 // 1 hora

export async function saveToCache(userId: string, activities: Activity[]): Promise<void> {
  const db = getDatabase()
  if (!db) return
  const now = Date.now()
  const rows: CachedActivity[] = activities.map((activity) => ({
    id: activity.id,
    userId,
    data: activity,
    cachedAt: now,
    expiresAt: now + TTL_MS,
  }))
  await db.transaction('rw', db.activities, db.metadata, async () => {
    if (rows.length) await db.activities.bulkPut(rows)
    await db.metadata.put({ key: `activities:${userId}`, userId, updatedAt: now })
  })
}

export async function getFromCache(userId: string): Promise<Activity[] | null> {
  const db = getDatabase()
  if (!db) return null
  const now = Date.now()
  const rows = await db.activities.where('userId').equals(userId).toArray()
  const valid = rows.filter((row) => row.expiresAt > now)
  if (valid.length === 0) return null
  return valid.map((row) => row.data)
}

export async function clearExpiredCache(): Promise<void> {
  const db = getDatabase()
  if (!db) return
  await db.activities.where('expiresAt').below(Date.now()).delete()
}

export async function clearCache(userId?: string): Promise<void> {
  const db = getDatabase()
  if (!db) return
  if (userId) {
    await db.activities.where('userId').equals(userId).delete()
    await db.metadata.delete(`activities:${userId}`)
  } else {
    await db.activities.clear()
    await db.metadata.clear()
  }
}
