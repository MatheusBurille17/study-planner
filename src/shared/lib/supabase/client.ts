'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from './config'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
  }
  return browserClient
}
