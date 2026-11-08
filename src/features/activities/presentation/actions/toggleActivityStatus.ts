'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '../../infrastructure/activityRepository'
import type { Activity } from '@/shared/types/activity'

/** Alterna/atualiza o status de uma tarefa ou trabalho. */
export async function toggleActivityStatusAction(
  id: string,
  status: string,
): Promise<{ success: boolean; activity?: Activity; error?: { code: string; message: string } }> {
  try {
    const user = await requireUser()
    const repository = await getActivityRepository()
    const existing = await repository.getById(id, user.id)
    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Atividade não encontrada' } }
    }
    if (existing.type !== 'task' && existing.type !== 'assignment') {
      return { success: false, error: { code: 'INVALID_TYPE', message: 'Esta atividade não possui status' } }
    }

    const updated = {
      ...existing,
      status,
      updatedAt: new Date(),
      ...(existing.type === 'assignment' && status === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
      ...(existing.type === 'assignment' && status === 'GRADED' ? { gradedAt: new Date() } : {}),
    } as Activity

    const saved = await repository.update(updated)
    revalidatePath('/dashboard')
    revalidatePath('/activities')
    revalidatePath('/calendar')
    return { success: true, activity: saved }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar status' } }
  }
}
