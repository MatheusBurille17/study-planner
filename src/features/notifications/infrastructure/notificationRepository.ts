import { createSupabaseServerClient } from '@/shared/lib/supabase/server'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'
import type { NotificationRepository } from '../domain/repository'
import { demoNotificationRepository } from './demoNotificationRepository'
import { SupabaseNotificationRepository } from './supabaseNotificationRepository'

export async function getNotificationRepository(): Promise<NotificationRepository> {
  if (isSupabaseConfigured()) {
    const client = await createSupabaseServerClient()
    if (client) return new SupabaseNotificationRepository(client)
  }
  return demoNotificationRepository
}
