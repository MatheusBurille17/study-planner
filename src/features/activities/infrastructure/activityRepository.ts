import { createSupabaseServerClient } from '@/shared/lib/supabase/server'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'
import type { ActivityRepository, SubjectRepository } from '../domain/repository'
import {
  demoActivityRepository,
  demoSubjectRepository,
} from './demoActivityRepository'
import {
  SupabaseActivityRepository,
  SupabaseSubjectRepository,
} from './supabaseActivityRepository'

/** Escolhe repositório Supabase (se configurado) ou local. */
export async function getActivityRepository(): Promise<ActivityRepository> {
  if (isSupabaseConfigured()) {
    const client = await createSupabaseServerClient()
    if (client) return new SupabaseActivityRepository(client)
  }
  return demoActivityRepository
}

export async function getSubjectRepository(): Promise<SubjectRepository> {
  if (isSupabaseConfigured()) {
    const client = await createSupabaseServerClient()
    if (client) return new SupabaseSubjectRepository(client)
  }
  return demoSubjectRepository
}
