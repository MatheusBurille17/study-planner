import type { Activity } from '@/shared/types/activity'

export type ConflictResolution = 'reload' | 'discard' | 'keep-local'

export interface ConflictInfo<T = Activity> {
  serverData: T
  clientData: Partial<T>
  serverUpdatedAt: Date
  clientExpectedUpdatedAt: Date
}

/** Conflito quando o servidor foi atualizado depois da versão esperada pelo cliente. */
export function isConflict(serverUpdatedAt: Date, clientExpectedUpdatedAt: Date): boolean {
  return serverUpdatedAt.getTime() > clientExpectedUpdatedAt.getTime()
}

export function resolveConflictWithReload<T>(serverData: T): { action: 'reload'; data: T } {
  return { action: 'reload', data: serverData }
}

export function resolveConflictWithDiscard<T>(serverData: T): { action: 'discard'; data: T } {
  return { action: 'discard', data: serverData }
}

export function resolveConflictWithKeepLocal<T>(
  clientData: T,
  serverData: T,
): { action: 'keep-local'; data: T } {
  // Mantém os dados locais, mas usa o servidor como base para campos read-only.
  return { action: 'keep-local', data: { ...serverData, ...clientData } }
}

export function describeConflict(conflict: ConflictInfo): string {
  return `A atividade foi alterada em outro dispositivo em ${conflict.serverUpdatedAt.toLocaleString('pt-BR')}.`
}
