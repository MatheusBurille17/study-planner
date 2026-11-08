import type { Activity } from '@/shared/types/activity'
import type { ActivityRepository } from '../../domain/repository'

/** Busca uma atividade por id, isolada por usuário. */
export async function getActivity(
  repository: ActivityRepository,
  id: string,
  userId: string,
): Promise<Activity | null> {
  return repository.getById(id, userId)
}
