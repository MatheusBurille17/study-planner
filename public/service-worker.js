/* Amanda's Study Planner — Service Worker (PWA, offline e push) */
const VERSION = 'v3'
const ASSET_CACHE = `assets-${VERSION}`
const API_CACHE = `api-${VERSION}`
const OFFLINE_URL = '/offline'

const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== ASSET_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  )
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(ASSET_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_URL)
      if (offline) return offline
    }
    return new Response('Você está offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }
  event.respondWith(networkFirst(request))
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Study Planner', body: event.data ? event.data.text() : 'Você tem um lembrete.' }
  }

  const title = payload.title || 'Study Planner'
  const options = {
    body: payload.body || 'Você tem um lembrete acadêmico.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    tag: payload.tag || 'study-planner',
    renotify: true,
    data: {
      url: payload.url || payload.data?.url || '/dashboard',
      activityId: payload.data?.activityId,
      activityType: payload.data?.activityType,
      notificationId: payload.notificationId,
    },
    vibrate: payload.vibration === false ? undefined : [120, 60, 120],
    silent: payload.sound === false,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const data = event.notification.data || {}
  const targetUrl = data.url || '/dashboard'

  event.waitUntil(
    (async () => {
      if (data.notificationId) {
        try {
          await fetch('/api/notifications/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: data.notificationId, referrer: targetUrl }),
          })
        } catch {
          /* offline: ignora */
        }
      }

      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(targetUrl)
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-activities' || event.tag === 'sync-offline-queue') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_REQUESTED', tag: event.tag }))
      }),
    )
  }
})
