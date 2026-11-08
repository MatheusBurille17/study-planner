import { isSupabaseConfigured } from '@/shared/lib/supabase/config'
import type { IAuthRepository } from '../domain/repository'
import { SupabaseAuthService } from './supabaseAuthService'
import { DemoAuthService } from './demoAuthService'

const demoAuthService = new DemoAuthService()
const supabaseAuthService = new SupabaseAuthService()

/** Retorna o serviço de autenticação adequado ao ambiente. */
export function getAuthService(): IAuthRepository {
  return isSupabaseConfigured() ? supabaseAuthService : demoAuthService
}
