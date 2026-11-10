'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'

/** Agrupa rajadas de eventos em um único refresh (evita baixar a lista N vezes). */
const REALTIME_DEBOUNCE_MS = 1_500
/** Fallback sem Realtime: 5 min e apenas com a aba visível (economia de egress). */
const FALLBACK_REFRESH_MS = 5 * 60_000

/**
 * Sincronização em tempo real (Spec 2/3).
 * - Supabase Realtime quando configurado (com debounce)
 * - Evento local `activity:changed` em modo demo
 * - Polling de 5 min como fallback/contingência (somente com a aba visível)
 */
export function useActivityRealtime(userId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let lastRefreshAt = 0

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['activities'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    }

    const refresh = () => {
      lastRefreshAt = Date.now()
      invalidate()
      window.dispatchEvent(new CustomEvent('activity:changed'))
    }

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        refresh()
      }, REALTIME_DEBOUNCE_MS)
    }

    /*
     * O SDK do Supabase (~190 kB) só é necessário quando o Realtime está
     * configurado. Importá-lo sob demanda mantém as telas de listagem leves e
     * acelera a hidratação — inclusive no modo demonstração, em que não há
     * conexão Realtime alguma.
     */
    let supabase: SupabaseClient | null = null
    let channel: { unsubscribe: () => void } | null = null

    const setupRealtime = async () => {
      if (!isSupabaseConfigured()) return
      const { getSupabaseBrowserClient } = await import('@/shared/lib/supabase/client')
      if (cancelled) return
      supabase = getSupabaseBrowserClient()
      if (!supabase) return
      channel = supabase
        .channel(`activities:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${userId}` },
          () => scheduleRefresh(),
        )
        .subscribe()
    }
    void setupRealtime()

    // Eventos locais (disparados pelas mutations) só invalidam o cache.
    // Se reemitisse `activity:changed` aqui, o listener entraria em loop.
    const onLocalChange = () => {
      lastRefreshAt = Date.now()
      invalidate()
    }
    window.addEventListener('activity:changed', onLocalChange)

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRefreshAt < FALLBACK_REFRESH_MS - 1_000) return
      refresh()
    }, FALLBACK_REFRESH_MS)

    return () => {
      cancelled = true
      window.removeEventListener('activity:changed', onLocalChange)
      window.clearInterval(interval)
      if (debounceTimer) clearTimeout(debounceTimer)
      if (channel) channel.unsubscribe()
      if (supabase && channel) {
        void supabase.removeChannel(channel as never)
      }
    }
  }, [userId, queryClient])
}
