'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSupabaseBrowserClient } from '@/shared/lib/supabase/client'

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

    const supabase = getSupabaseBrowserClient()
    let channel: { unsubscribe: () => void } | null = null
    if (supabase) {
      channel = supabase
        .channel(`activities:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${userId}` },
          () => scheduleRefresh(),
        )
        .subscribe()
    }

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
