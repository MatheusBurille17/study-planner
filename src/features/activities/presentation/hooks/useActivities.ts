'use client'

import { useQuery } from '@tanstack/react-query'
import type { Activity } from '@/shared/types/activity'
import type { ActivityFilter } from '@/shared/types/notification'
import { getActivitiesAction, getActivityAction, getSubjectsAction } from '../actions/getActivities'

export function useActivities(filter?: ActivityFilter) {
  return useQuery({
    queryKey: ['activities', filter ?? null],
    queryFn: async () => {
      const result = await getActivitiesAction(filter)
      if (!result.success) throw new Error(result.error?.message ?? 'Erro ao carregar atividades')
      return result.data ?? []
    },
    staleTime: 60_000,
  })
}

export function useActivity(id: string) {
  return useQuery<Activity>({
    queryKey: ['activities', id],
    queryFn: async () => {
      const result = await getActivityAction(id)
      if (!result.success || !result.data) throw new Error(result.error?.message ?? 'Atividade não encontrada')
      return result.data
    },
    enabled: Boolean(id),
  })
}

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const result = await getSubjectsAction()
      if (!result.success) throw new Error(result.error?.message ?? 'Erro ao carregar disciplinas')
      return result.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}
