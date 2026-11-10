import { cache } from 'react'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from './config'

/**
 * Reutiliza o cliente dentro da mesma requisição (layout + página + casos de
 * uso). O React libera a instância ao fim de cada request, então não há
 * compartilhamento de sessão entre usuários.
 */
export const createSupabaseServerClient = cache(async (): Promise<SupabaseClient | null> => {
  if (!isSupabaseConfigured()) return null
  const cookieStore = await cookies()

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components não podem escrever cookies; middleware cuida do refresh.
        }
      },
    },
  })
})
