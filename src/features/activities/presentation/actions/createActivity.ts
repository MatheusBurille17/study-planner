'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { createActivitySchema } from '../schemas/createActivitySchema'
import { CreateActivityUseCase } from '../../application/useCases/createActivity'
import { getActivityRepository } from '../../infrastructure/activityRepository'
import type { CreateActivityResult } from '@/shared/types/activity'

/**
 * Server Action de criação de atividade.
 * Valida novamente no servidor (double validation) e garante autenticação.
 */
export async function createActivityAction(input: unknown): Promise<CreateActivityResult> {
  try {
    const user = await requireUser()
    const parsed = createActivitySchema.safeParse(input)

    if (!parsed.success) {
      const first = parsed.error.errors[0]
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: first?.message ?? 'Dados inválidos',
          field: first?.path.join('.'),
        },
      }
    }

    const repository = await getActivityRepository()
    const useCase = new CreateActivityUseCase(repository)
    const result = await useCase.execute({ ...parsed.data, userId: user.id })

    if (result.success) {
      revalidatePath('/dashboard')
      revalidatePath('/activities')
      revalidatePath('/assessments')
      revalidatePath('/calendar')
    }

    return result
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      }
    }
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message ?? 'Dados inválidos' },
      }
    }
    console.error('[createActivityAction]', error)
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar atividade. Tente novamente.' },
    }
  }
}
