'use client'

import Dexie, { type Table } from 'dexie'
import type { CalendarResponse } from '@/shared/types/calendarModels'

export const CALENDAR_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hora

interface CalendarCacheEntry {
  key: string
  data: CalendarResponse
  timestamp: number
  expiresAt: number
}

class CalendarCacheDatabase extends Dexie {
  entries!: Table<CalendarCacheEntry, string>

  constructor() {
    super('amanda_calendar_cache')
    this.version(1).stores({
      entries: 'key, expiresAt',
    })
  }
}

let database: CalendarCacheDatabase | null = null

function getDatabase(): CalendarCacheDatabase | null {
  if (typeof window === 'undefined') return null
  if (!database) database = new CalendarCacheDatabase()
  return database
}

export async function cacheCalendarData(
  key: string,
  data: CalendarResponse,
  ttl = CALENDAR_CACHE_TTL_MS,
): Promise<void> {
  const db = getDatabase()
  if (!db) return
  const now = Date.now()
  await db.entries.put({ key, data, timestamp: now, expiresAt: now + ttl })
}

export async function getCachedCalendarData(
  key: string,
): Promise<{ data: CalendarResponse; timestamp: number; expired: boolean } | null> {
  const db = getDatabase()
  if (!db) return null
  const entry = await db.entries.get(key)
  if (!entry) return null
  return { data: entry.data, timestamp: entry.timestamp, expired: isCacheExpired(entry) }
}

export function isCacheExpired(entry: { expiresAt: number }, now = Date.now()): boolean {
  return entry.expiresAt <= now
}

export async function clearExpiredCache(): Promise<void> {
  const db = getDatabase()
  if (!db) return
  await db.entries.where('expiresAt').below(Date.now()).delete()
}

export async function invalidateCalendarCache(prefix?: string): Promise<void> {
  const db = getDatabase()
  if (!db) return
  if (!prefix) {
    await db.entries.clear()
    return
  }
  const keys = await db.entries.toCollection().primaryKeys()
  const matching = keys.filter((key) => String(key).startsWith(prefix))
  await db.entries.bulkDelete(matching)
}
