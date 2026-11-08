import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseUrl, isSupabaseConfigured } from './config'

/**
 * Cliente com service role. Use apenas em código de servidor confiável
 * (Edge Functions, scripts de manutenção).
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  return createClient(getSupabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
