'use client'

import { useEffect } from 'react'

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? ''
const RELOAD_KEY = 'study-planner:build-reload-at'
const RELOAD_COOLDOWN_MS = 60_000

/**
 * Garante que a aba em execução usa o mesmo build que o servidor.
 *
 * Cada deploy do Next.js gera IDs de Server Actions novos. Uma aba antiga
 * (ou um bundle servido do cache do service worker) manda o ID antigo e o
 * servidor responde "Server Action was not found". Quando detectamos essa
 * divergência, limpamos o cache do SW e recarregamos uma única vez.
 */
export function VersionGuard() {
  useEffect(() => {
    if (!BUILD_ID) return

    let cancelled = false

    async function reloadWithFreshAssets() {
      if (cancelled) return

      const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0')
      if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))

      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((registration) => registration.unregister()))
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
        }
      } catch {
        /* best effort */
      }

      window.location.reload()
    }

    async function check() {
      try {
        const response = await fetch('/api/version', { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json()) as { id?: string }
        const serverId = typeof data.id === 'string' ? data.id : ''
        if (!serverId || serverId === BUILD_ID) return
        await reloadWithFreshAssets()
      } catch {
        // Offline ou rede instável: tenta de novo no próximo gatilho.
      }
    }

    void check()

    const onFocus = () => void check()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    const interval = window.setInterval(check, 60_000)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [])

  return null
}
