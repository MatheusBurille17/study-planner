'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '../../infrastructure/activityRepository'
import { updateActivitySchema } from '../schemas/createActivitySchema'
import { isConflict } from '../../application/useCases/detectConflict'
import { validateStatusTransition } from '../../domain/stateMachines'
import type { Activity, CreateActivityResult } from '@/shared/types/activity'

/**
 * Atualiza atividade existente com validação dupla, detecção de conflito
 * (optimistic concurrency) e validação de transição de status.
 * Campos read-only (id, userId, createdAt) nunca são alterados.
 */
export async function updateActivityAction(input: unknown): Promise<CreateActivityResult> {
  try {
    const user = await requireUser()
    const raw = input as { id?: string; expectedUpdatedAt?: string }
    if (!raw.id) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'ID da atividade é obrigatório' } }
    }

    const parsed = updateActivitySchema.safeParse(input)
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

    const data = parsed.data
    const repository = await getActivityRepository()
    const existing = await repository.getById(raw.id, user.id)
    if (!existing || existing.isDeleted) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Atividade não encontrada' } }
    }

    if (raw.expectedUpdatedAt) {
      const expected = new Date(raw.expectedUpdatedAt)
      if (!Number.isNaN(expected.getTime()) && isConflict(existing.updatedAt, expected)) {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Esta atividade foi alterada em outro dispositivo. Escolha como continuar.',
            serverData: existing,
            clientData: data as Partial<Activity>,
          },
        }
      }
    }

    if ('status' in data && 'status' in existing && data.status && data.status !== existing.status) {
      const transition = validateStatusTransition(existing.type, existing.status, data.status)
      if (!transition.valid) {
        return {
          success: false,
          error: { code: 'INVALID_TRANSITION', message: transition.message ?? 'Transição inválida', field: 'status' },
        }
      }
    }

    // Garante monotonicidade de updatedAt mesmo com clock skew.
    const nextUpdatedAt = new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1))

    const merged: Activity = {
      ...existing,
      ...data,
      id: existing.id,
      userId: user.id,
      type: existing.type,
      createdAt: existing.createdAt,
      updatedAt: nextUpdatedAt,
    } as Activity

    const saved = await repository.update(merged)
    revalidatePath('/dashboard')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    revalidatePath(`/activities/${existing.id}`)
    revalidatePath('/calendar')
    return { success: true, activity: saved }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    console.error('[updateActivityAction]', error)
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar atividade' } }
  }
}
