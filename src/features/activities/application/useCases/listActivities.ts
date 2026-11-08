import type { Activity } from '@/shared/types/activity'
import type { ActivityFilter } from '@/shared/types/notification'
import type { ActivityRepository } from '../../domain/repository'
import { filterActivities } from '../../domain/filters'

/** Lista atividades do usuário aplicando filtros e ordenação. */
export async function listActivities(
  repository: ActivityRepository,
  userId: string,
  filter?: ActivityFilter,
): Promise<Activity[]> {
  const activities = await repository.getByUserId(userId, filter)
  return filter ? filterActivities(activities, filter) : activities
}
