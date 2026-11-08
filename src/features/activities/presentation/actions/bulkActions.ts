'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '../../infrastructure/activityRepository'
import { validateStatusTransition } from '../../domain/stateMachines'
import type { Activity } from '@/shared/types/activity'

export interface BulkActionResult {
  success: boolean
  affected?: number
  error?: { code: string; message: string; failedId?: string }
}

/**
 * Atualiza status em lote. Valida todas as transições antes de aplicar
 * (sem sucesso parcial); se uma falhar, nenhuma é alterada.
 */
export async function bulkUpdateStatusAction(ids: string[], status: string): Promise<BulkActionResult> {
  try {
    const user = await requireUser()
    if (!ids.length) return { success: true, affected: 0 }
    const repository = await getActivityRepository()
    const activities = await Promise.all(ids.map((id) => repository.getById(id, user.id)))

    for (const activity of activities) {
      if (!activity) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Uma das atividades não foi encontrada' } }
      }
      if (activity.type !== 'task' && activity.type !== 'assignment') {
        return { success: false, error: { code: 'INVALID_TYPE', message: 'Atividade sem status editável', failedId: activity.id } }
      }
      const transition = validateStatusTransition(activity.type, activity.status, status)
      if (!transition.valid) {
        return {
          success: false,
          error: { code: 'INVALID_TRANSITION', message: transition.message ?? 'Transição inválida', failedId: activity.id },
        }
      }
    }

    for (let index = 0; index < ids.length; index += 1) {
      const activity = activities[index] as Activity
      await repository.update({
        ...activity,
        status,
        updatedAt: new Date(Math.max(Date.now(), activity.updatedAt.getTime() + 1)),
      } as Activity)
    }

    revalidatePath('/dashboard')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    return { success: true, affected: ids.length }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar em lote' } }
  }
}

/** Move várias atividades para a lixeira. */
export async function bulkDeleteAction(ids: string[]): Promise<BulkActionResult> {
  try {
    const user = await requireUser()
    if (!ids.length) return { success: true, affected: 0 }
    const repository = await getActivityRepository()
    for (const id of ids) {
      await repository.softDelete(id, user.id)
    }
    revalidatePath('/dashboard')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    revalidatePath('/activities/trash')
    return { success: true, affected: ids.length }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao excluir em lote' } }
  }
}
