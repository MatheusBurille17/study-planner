'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '../../infrastructure/activityRepository'
import { updateActivitySchema } from '../schemas/updateActivitySchema'
import type { Activity } from '@/shared/types/activity'

export interface OfflineQueuePayloadItem {
  id: string
  action: 'UPDATE' | 'DELETE'
  activityId: string
  payload?: unknown
}

export interface OfflineQueueSyncResult {
  success: boolean
  synced: string[]
  failed: Array<{ id: string; error: string }>
  conflicts: Array<{ id: string; serverData: Activity }>
}

/**
 * Sincroniza itens da fila offline. Operações são idempotentes:
 * reaplicar UPDATE/DELETE com os mesmos dados produz o mesmo estado.
 */
export async function syncOfflineQueueAction(items: OfflineQueuePayloadItem[]): Promise<OfflineQueueSyncResult> {
  const result: OfflineQueueSyncResult = { success: true, synced: [], failed: [], conflicts: [] }
  try {
    const user = await requireUser()
    const repository = await getActivityRepository()

    for (const item of items) {
      try {
        if (item.action === 'DELETE') {
          await repository.softDelete(item.activityId, user.id)
          result.synced.push(item.id)
          continue
        }

        const parsed = updateActivitySchema.safeParse(item.payload)
        if (!parsed.success) {
          result.failed.push({ id: item.id, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' })
          continue
        }
        const existing = await repository.getById(item.activityId, user.id)
        if (!existing) {
          result.failed.push({ id: item.id, error: 'Atividade não encontrada' })
          continue
        }

        const raw = item.payload as { expectedUpdatedAt?: string }
        if (
          raw.expectedUpdatedAt &&
          existing.updatedAt.getTime() > new Date(raw.expectedUpdatedAt).getTime()
        ) {
          result.conflicts.push({ id: item.id, serverData: existing })
          continue
        }

        const merged: Activity = {
          ...existing,
          ...parsed.data,
          id: existing.id,
          userId: user.id,
          type: existing.type,
          createdAt: existing.createdAt,
          updatedAt: new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1)),
        } as Activity
        await repository.update(merged)
        result.synced.push(item.id)
      } catch (error) {
        result.failed.push({
          id: item.id,
          error: error instanceof Error ? error.message : 'Erro ao sincronizar',
        })
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    return result
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, synced: [], failed: items.map((item) => ({ id: item.id, error: 'Não autenticado' })), conflicts: [] }
    }
    return { success: false, synced: [], failed: items.map((item) => ({ id: item.id, error: 'Erro interno' })), conflicts: [] }
  }
}
