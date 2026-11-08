'use server'

import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getDashboardDataForUser } from '../../application/getDashboardData'
import type { DashboardData } from '../../application/getDashboardSummary'

export interface DashboardActionResult {
  success: boolean
  data?: DashboardData
  error?: { code: string; message: string }
}

/**
 * Server Action: retorna dados do dashboard para o usuário atual.
 * Usa cache de 60s; `fresh: true` força nova consulta ao banco.
 */
export async function getDashboardDataAction(options?: {
  fresh?: boolean
}): Promise<DashboardActionResult> {
  try {
    const user = await requireUser()
    const data = await getDashboardDataForUser(user.id, user.name, options)
    return { success: true, data }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    console.error('[getDashboardDataAction]', error)
    return { success: false, error: { code: 'FETCH_FAILED', message: 'Não foi possível carregar o dashboard' } }
  }
}
