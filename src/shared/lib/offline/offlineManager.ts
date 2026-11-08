'use client'

import { getPendingCount } from '@/shared/lib/offline/indexeddb'
import { processSyncQueue } from '@/shared/lib/offline/syncProcessor'

export type OfflineSyncState = 'idle' | 'syncing' | 'synced' | 'failed'

export interface OfflineState {
  isOnline: boolean
  pendingChanges: number
  syncState: OfflineSyncState
  lastSyncAt?: number
}

type Listener = (state: OfflineState) => void

function debounce<T extends (...args: never[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

/**
 * Coordena conectividade, health check e sincronização.
 * Health check a cada 30s quando offline; debounce de 500ms em eventos.
 */
class OfflineManager {
  private state: OfflineState = { isOnline: true, pendingChanges: 0, syncState: 'idle' }
  private listeners = new Set<Listener>()
  private started = false
  private healthTimer: ReturnType<typeof setInterval> | null = null

  private notify(): void {
    for (const listener of this.listeners) listener(this.state)
  }

  getState(): OfflineState {
    return this.state
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  async start(): Promise<void> {
    if (this.started || typeof window === 'undefined') return
    this.started = true
    this.state = { ...this.state, isOnline: navigator.onLine, pendingChanges: await getPendingCount() }
    this.notify()

    window.addEventListener('online', this.onOnline)
    window.addEventListener('offline', this.onOffline)
    window.addEventListener('offline:queue-synced', this.refreshPending)
    this.healthTimer = setInterval(() => {
      if (!this.state.isOnline) void this.healthCheck()
    }, 30_000)

    if (this.state.isOnline && this.state.pendingChanges > 0) void this.sync()
  }

  stop(): void {
    if (typeof window === 'undefined') return
    this.started = false
    window.removeEventListener('online', this.onOnline)
    window.removeEventListener('offline', this.onOffline)
    window.removeEventListener('offline:queue-synced', this.refreshPending)
    if (this.healthTimer) clearInterval(this.healthTimer)
    this.healthTimer = null
  }

  private refreshPending = async (): Promise<void> => {
    const pendingChanges = await getPendingCount()
    this.state = { ...this.state, pendingChanges }
    this.notify()
  }

  private onOnline = debounce(async () => {
    this.state = { ...this.state, isOnline: true }
    this.notify()
    await this.sync()
  }, 500) as () => void

  private onOffline = debounce(() => {
    this.state = { ...this.state, isOnline: false }
    this.notify()
  }, 500) as () => void

  private async healthCheck(): Promise<void> {
    try {
      const response = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' })
      if (response.ok) {
        this.state = { ...this.state, isOnline: true }
        this.notify()
        await this.sync()
      }
    } catch {
      // Continua offline.
    }
  }

  async sync(): Promise<void> {
    if (!this.state.isOnline || this.state.syncState === 'syncing') return
    const pendingChanges = await getPendingCount()
    if (pendingChanges === 0) {
      this.state = { ...this.state, pendingChanges: 0, syncState: 'idle' }
      this.notify()
      return
    }

    this.state = { ...this.state, syncState: 'syncing' }
    this.notify()
    try {
      const result = await processSyncQueue()
      this.state = {
        ...this.state,
        pendingChanges: await getPendingCount(),
        syncState: result.failed > 0 ? 'failed' : 'synced',
        lastSyncAt: Date.now(),
      }
      this.notify()
      if (result.failed === 0) {
        setTimeout(() => {
          this.state = { ...this.state, syncState: 'idle' }
          this.notify()
        }, 3000)
      }
    } catch {
      this.state = { ...this.state, syncState: 'failed', pendingChanges: await getPendingCount() }
      this.notify()
    }
  }
}

export const offlineManager = new OfflineManager()
