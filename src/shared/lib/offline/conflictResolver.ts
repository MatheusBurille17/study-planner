'use client'

import type { Activity } from '@/shared/types/activity'

export interface ConflictSnapshot {
  id: string
  local: Activity
  server: Activity
  winner: 'local' | 'server'
  timestamp: number
}

/** Last-write-wins: vence a versão com updatedAt mais recente. */
export function resolveConflictLastWriteWins(
  local: Activity,
  server: Activity,
): { winner: 'local' | 'server'; data: Activity } {
  return server.updatedAt.getTime() >= local.updatedAt.getTime()
    ? { winner: 'server', data: server }
    : { winner: 'local', data: local }
}

const STORAGE_KEY = 'amanda:conflict-snapshots'

function readSnapshots(): Record<string, ConflictSnapshot> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, ConflictSnapshot>
  } catch {
    return {}
  }
}

function writeSnapshots(snapshots: Record<string, ConflictSnapshot>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
}

export function storeConflictSnapshot(snapshot: ConflictSnapshot): void {
  const snapshots = readSnapshots()
  snapshots[snapshot.id] = snapshot
  writeSnapshots(snapshots)
}

/** Permite desfazer a resolução de conflito restaurando a versão descartada. */
export function undoConflictResolution(id: string): Activity | null {
  const snapshots = readSnapshots()
  const snapshot = snapshots[id]
  if (!snapshot) return null
  const restore = snapshot.winner === 'server' ? snapshot.local : snapshot.server
  delete snapshots[id]
  writeSnapshots(snapshots)
  return restore
}

export function getConflictSnapshot(id: string): ConflictSnapshot | null {
  return readSnapshots()[id] ?? null
}
