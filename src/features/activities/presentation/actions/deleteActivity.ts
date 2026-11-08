'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '../../infrastructure/activityRepository'

export interface DeleteActivityResult {
  success: boolean
  recoveryDeadline?: string
  error?: { code: string; message: string }
}

/** Move a atividade para a lixeira (soft delete idempotente). */
export async function deleteActivityAction(id: string): Promise<DeleteActivityResult> {
  try {
    const user = await requireUser()
    if (!id) return { success: false, error: { code: 'INVALID_ID', message: 'Atividade inválida' } }

    const repository = await getActivityRepository()
    await repository.softDelete(id, user.id)

    revalidatePath('/dashboard')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    revalidatePath('/activities/trash')
    revalidatePath('/calendar')

    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)
    return { success: true, recoveryDeadline: deadline.toISOString() }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao mover para a lixeira' } }
  }
}

export const softDeleteActivityAction = deleteActivityAction
