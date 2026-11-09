'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '@/features/activities/infrastructure/activityRepository'
import { createActivitySchema, updateActivitySchema } from '@/features/activities/presentation/schemas/createActivitySchema'
import { CreateActivityUseCase } from '@/features/activities/application/useCases/createActivity'
import { buildActivityUpdate } from '@/features/activities/application/useCases/buildActivityUpdate'
import { isConflict } from '@/features/activities/application/useCases/detectConflict'
import type { Activity } from '@/shared/types/activity'

export interface SyncEntry {
  id: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  entityId: string
  entityData?: unknown
}

export interface SyncEntryResult {
  id: string
  status: 'synced' | 'conflict' | 'failed'
  data?: Activity
  error?: string
}

/**
 * Sincroniza operações de atividades acumuladas offline.
 * Resolução de conflito: last-write-wins por updatedAt.
 */
export async function syncActivityChangesAction(entries: SyncEntry[]): Promise<{
  success: boolean
  results: SyncEntryResult[]
  synced: number
  conflicts: number
  failed: number
}> {
  const results: SyncEntryResult[] = []
  try {
    const user = await requireUser()
    const repository = await getActivityRepository()

    for (const entry of entries) {
      try {
        if (entry.operation === 'DELETE') {
          await repository.softDelete(entry.entityId, user.id)
          results.push({ id: entry.id, status: 'synced' })
          continue
        }

        if (entry.operation === 'CREATE') {
          const parsed = createActivitySchema.safeParse(entry.entityData)
          if (!parsed.success) {
            results.push({ id: entry.id, status: 'failed', error: parsed.error.errors[0]?.message })
            continue
          }
          const created = await new CreateActivityUseCase(repository).execute({ ...parsed.data, userId: user.id })
          if (!created.success || !created.activity) {
            results.push({ id: entry.id, status: 'failed', error: created.error?.message })
            continue
          }
          results.push({ id: entry.id, status: 'synced', data: created.activity })
          continue
        }

        const parsed = updateActivitySchema.safeParse(entry.entityData)
        if (!parsed.success) {
          results.push({ id: entry.id, status: 'failed', error: parsed.error.errors[0]?.message })
          continue
        }
        const existing = await repository.getById(entry.entityId, user.id)
        if (!existing) {
          results.push({ id: entry.id, status: 'failed', error: 'Atividade não encontrada' })
          continue
        }

        const expectedRaw = (entry.entityData as { expectedUpdatedAt?: string }).expectedUpdatedAt
        const expectedUpdatedAt = expectedRaw ? new Date(expectedRaw) : undefined
        if (
          expectedUpdatedAt &&
          !Number.isNaN(expectedUpdatedAt.getTime()) &&
          isConflict(existing.updatedAt, expectedUpdatedAt)
        ) {
          // Servidor vence quando a versão local se baseou em dados antigos.
          results.push({ id: entry.id, status: 'conflict', data: existing })
          continue
        }

        const updated = await repository.update(
          buildActivityUpdate({
            existing,
            data: parsed.data,
            userId: user.id,
          }),
        )
        results.push({ id: entry.id, status: 'synced', data: updated })
      } catch (error) {
        results.push({
          id: entry.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erro ao sincronizar',
        })
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/activities')
    revalidatePath('/calendar')
    const synced = results.filter((result) => result.status === 'synced').length
    const conflicts = results.filter((result) => result.status === 'conflict').length
    const failed = results.filter((result) => result.status === 'failed').length
    return { success: failed === 0, results, synced, conflicts, failed }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        results: entries.map((entry) => ({ id: entry.id, status: 'failed', error: 'Não autenticado' })),
        synced: 0,
        conflicts: 0,
        failed: entries.length,
      }
    }
    return {
      success: false,
      results: entries.map((entry) => ({ id: entry.id, status: 'failed', error: 'Erro interno' })),
      synced: 0,
      conflicts: 0,
      failed: entries.length,
    }
  }
}
