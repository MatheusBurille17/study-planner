import type { ActivityRepository, SubjectRepository } from '@/features/activities/domain/repository'
import type { Subject } from '@/shared/types/subject'
import { buildDashboardSummary, type DashboardSummary } from '../domain/dashboardRules'

export interface DashboardData extends DashboardSummary {
  subjects: Subject[]
  userName?: string
}

/** Caso de uso: buscar todas as atividades e montar o resumo do dashboard. */
export async function getDashboardSummary(
  userId: string,
  activityRepository: ActivityRepository,
  subjectRepository: SubjectRepository,
  userName?: string,
): Promise<DashboardData> {
  const [activities, subjects] = await Promise.all([
    activityRepository.getByUserId(userId),
    subjectRepository.list(userId),
  ])
  return {
    ...buildDashboardSummary(activities),
    subjects,
    userName,
  }
}
