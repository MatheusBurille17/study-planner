import {
  getActivityRepository,
  getSubjectRepository,
} from '@/features/activities/infrastructure/activityRepository'
import { getDashboardSummary, type DashboardData } from './getDashboardSummary'
import { readDashboardCache, writeDashboardCache } from './dashboardCache'

/**
 * Retorna o resumo do dashboard com cache curto por usuário.
 *
 * `fresh: true` ignora o cache — usado em refresh manual e logo após
 * mutations, para o usuário nunca ver um estado desatualizado.
 */
export async function getDashboardDataForUser(
  userId: string,
  userName?: string,
  options?: { fresh?: boolean },
): Promise<DashboardData> {
  if (!options?.fresh) {
    const cached = readDashboardCache(userId)
    if (cached) return cached
  }

  const [activityRepository, subjectRepository] = await Promise.all([
    getActivityRepository(),
    getSubjectRepository(),
  ])
  const data = await getDashboardSummary(userId, activityRepository, subjectRepository, userName)
  return writeDashboardCache(userId, data)
}
