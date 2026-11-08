'use server'

import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository, getSubjectRepository } from '../../infrastructure/activityRepository'
import { filterActivities } from '../../domain/filters'
import type { Activity } from '@/shared/types/activity'
import type { ActivityFilter } from '@/shared/types/notification'

export interface GetActivitiesResult {
  success: boolean
  data?: Activity[]
  error?: { code: string; message: string }
}

/** Lista atividades do usuário, com filtros opcionais. */
export async function getActivitiesAction(filter?: ActivityFilter): Promise<GetActivitiesResult> {
  try {
    const user = await requireUser()
    const repository = await getActivityRepository()
    const activities = await repository.getByUserId(user.id, filter)
    return { success: true, data: filter ? filterActivities(activities, filter) : activities }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar atividades' } }
  }
}

/** Carrega disciplinas para os formulários. */
export async function getSubjectsAction() {
  try {
    const user = await requireUser()
    const repository = await getSubjectRepository()
    const subjects = await repository.list(user.id)
    return { success: true as const, data: subjects }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false as const, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false as const, error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar disciplinas' } }
  }
}

/** Busca uma atividade específica. */
export async function getActivityAction(id: string) {
  try {
    const user = await requireUser()
    const repository = await getActivityRepository()
    const activity = await repository.getById(id, user.id)
    if (!activity) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Atividade não encontrada' } }
    }
    return { success: true as const, data: activity }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false as const, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false as const, error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar atividade' } }
  }
}

/** Versão paginada com metadados (Spec 3). */
export async function getActivitiesPaginatedAction(input: unknown) {
  try {
    const user = await requireUser()
    const { filterCriteriaSchema } = await import('../schemas/filterSchema')
    const { applyFilterCriteria, paginate, validateFilterCombination } = await import(
      '../../application/useCases/filterActivities'
    )
    const parsed = filterCriteriaSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false as const,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Filtros inválidos' },
      }
    }
    const validation = validateFilterCombination(parsed.data)
    if (!validation.valid) {
      return { success: false as const, error: { code: 'INVALID_FILTER', message: validation.error } }
    }

    const repository = await getActivityRepository()
    const activities = await repository.getByUserId(user.id)
    const filtered = applyFilterCriteria(activities, parsed.data)
    const page = paginate(filtered, parsed.data.page, parsed.data.limit)

    return {
      success: true as const,
      data: {
        activities: page.items,
        total: page.total,
        page: page.page,
        limit: page.limit,
        hasMore: page.hasMore,
      },
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false as const, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false as const, error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar atividades' } }
  }
}
