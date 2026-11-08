'use server'

import { z } from 'zod'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getActivityRepository, getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import { getCalendarData } from '../../application/useCases/getCalendarData'
import type { CalendarResponse } from '@/shared/types/calendarModels'

const calendarInputSchema = z.object({
  view: z.enum(['month', 'week', 'day']).default('month'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional(),
  filters: z
    .object({
      types: z.array(z.enum(['task', 'exam', 'assignment'])).optional(),
      subjectId: z.string().uuid('Disciplina inválida').optional(),
    })
    .optional(),
})

export interface CalendarActionResult {
  success: boolean
  data?: CalendarResponse
  error?: { code: string; message: string }
}

/** Server Action: dados do calendário com validação e autenticação. */
export async function getCalendarDataAction(input: unknown): Promise<CalendarActionResult> {
  try {
    const parsed = calendarInputSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Filtros inválidos' },
      }
    }

    const user = await requireUser()
    const reference = parsed.data.date ? new Date(`${parsed.data.date}T12:00:00`) : new Date()
    if (Number.isNaN(reference.getTime())) {
      return { success: false, error: { code: 'INVALID_DATE', message: 'Data inválida' } }
    }

    const [activityRepository, subjectRepository] = await Promise.all([
      getActivityRepository(),
      getSubjectRepository(),
    ])
    const data = await getCalendarData(
      user.id,
      parsed.data.view,
      reference,
      parsed.data.filters ?? {},
      activityRepository,
      subjectRepository,
    )
    return { success: true, data }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessão expirada. Entre novamente.' } }
    }
    console.error('[getCalendarDataAction]', error)
    return { success: false, error: { code: 'FETCH_FAILED', message: 'Não foi possível carregar o calendário' } }
  }
}
