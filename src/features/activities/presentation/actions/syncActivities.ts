'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository } from '../../infrastructure/activityRepository'
import type { Activity } from '@/shared/types/activity'

/** Sincroniza dados frescos para um conjunto de ids (batch de eventos Realtime). */
export async function syncActivityData(ids: string[]): Promise<{
  success: boolean
  data?: Activity[]
  error?: { code: string; message: string }
}> {
  try {
    const user = await requireUser()
    const repository = await getActivityRepository()
    const activities = await Promise.all(ids.map((id) => repository.getById(id, user.id)))
    return { success: true, data: activities.filter((activity): activity is Activity => Boolean(activity)) }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao sincronizar atividades' } }
  }
}

/** Invalida caches de renderização após eventos em lote. */
export async function batchInvalidateCache(ids: string[]): Promise<{ success: boolean; count: number }> {
  revalidatePath('/dashboard')
  revalidatePath('/activities')
  revalidatePath('/assessments')
  revalidatePath('/calendar')
  ids.forEach((id) => revalidatePath(`/activities/${id}`))
  return { success: true, count: ids.length }
}
