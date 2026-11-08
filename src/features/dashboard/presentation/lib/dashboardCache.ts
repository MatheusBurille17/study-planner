'use client'

import type { DashboardData } from '../../application/getDashboardSummary'

const CACHE_KEY = 'amanda:dashboard-cache'
const TTL_MS = 60 * 60 * 1000 // 1 hora

interface CachedDashboard {
  data: DashboardData
  cachedAt: number
  expiresAt: number
}

export function saveDashboardCache(data: DashboardData): void {
  if (typeof window === 'undefined') return
  try {
    const now = Date.now()
    const payload: CachedDashboard = { data, cachedAt: now, expiresAt: now + TTL_MS }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Storage cheio/indisponível: ignora silenciosamente.
  }
}

export function readDashboardCache(): { data: DashboardData; cachedAt: number; expired: boolean } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedDashboard
    if (!parsed?.data) return null
    return { data: parsed.data, cachedAt: parsed.cachedAt, expired: Date.now() > parsed.expiresAt }
  } catch {
    return null
  }
}

export function clearDashboardCache(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CACHE_KEY)
}
