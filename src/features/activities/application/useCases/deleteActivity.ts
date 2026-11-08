import type { ActivityRepository } from '../../domain/repository'

export interface DeleteActivityOutput {
  success: boolean
  error?: { code: string; message: string }
}

/** Remove uma atividade do usuário (idempotente). */
export async function deleteActivity(
  repository: ActivityRepository,
  id: string,
  userId: string,
): Promise<DeleteActivityOutput> {
  try {
    await repository.delete(id, userId)
    return { success: true }
  } catch {
    return {
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Não foi possível excluir a atividade' },
    }
  }
}
