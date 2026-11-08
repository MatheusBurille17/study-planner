'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '../../infrastructure/activityRepository'
import type { Activity } from '@/shared/types/activity'

export interface RestoreActivityResult {
  success: boolean
  activity?: Activity
  error?: { code: string; message: string }
}

/** Restaura atividade da lixeira. */
export async function restoreActivityAction(id: string): Promise<RestoreActivityResult> {
  try {
    const user = await requireUser()
    const repository = await getActivityRepository()
    const restored = await repository.restore(id, user.id)
    revalidatePath('/dashboard')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    revalidatePath('/activities/trash')
    return { success: true, activity: restored }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao restaurar atividade' } }
  }
}

/** Remove permanentemente (sem possibilidade de restauração). */
export async function permanentlyDeleteActivityAction(id: string): Promise<RestoreActivityResult> {
  try {
    const user = await requireUser()
    const repository = await getActivityRepository()
    await repository.permanentDelete(id, user.id)
    revalidatePath('/activities/trash')
    return { success: true }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao excluir permanentemente' } }
  }
}
