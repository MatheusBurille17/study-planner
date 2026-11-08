# Progressive Web App (PWA) & Offline-First Patterns for Amanda's Study Planner

## Overview

PWA implementation patterns for Amanda's Study Planner, including service worker setup, offline functionality, web push notifications, and offline-first data synchronization using Supabase.

## When to Use This Skill

Load this skill when:
- Implementing service worker registration
- Setting up offline data sync
- Building offline-capable features
- Implementing push notifications
- Configuring web app manifest
- Debugging offline functionality
- Handling cache strategies
- Implementing background sync

## PWA Core Components

### 1. Web App Manifest

```json
{
  "public/manifest.json"
}
```

```json
{
  "name": "Amanda's Study Planner",
  "short_name": "Study Planner",
  "description": "A centralized study planning and task management application for university students",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icons/192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/192x192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/512x512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["productivity", "education"],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "540x720",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/calendar.png",
      "sizes": "1280x720",
      "form_factor": "wide"
    }
  ]
}
```

### 2. Service Worker Registration

```typescript
// src/shared/lib/notifications/service-worker-registration.ts
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      { scope: '/' }
    );

    console.log('Service Worker registered:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New service worker available, prompt user
          console.log('New version available');
          // Dispatch event to UI
          window.dispatchEvent(
            new CustomEvent('app-update-available', {
              detail: { registration },
            })
          );
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
}

// Register on app startup
export function initializeServiceWorker() {
  if (typeof window !== 'undefined') {
    registerServiceWorker();
  }
}
```

### 3. Service Worker Implementation

```javascript
// public/service-worker.js
const CACHE_NAME = 'amanda-study-v1';
const ASSETS_CACHE = 'amanda-assets-v1';

const urlsToCache = [
  '/',
  '/icons/192x192.png',
  '/icons/512x512.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(ASSETS_CACHE).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== ASSETS_CACHE && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API calls - network first, fallback to cache
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache on network error
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets - cache first, fallback to network
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((response) => {
          // Cache new assets
          if (response.ok) {
            const cache = caches.open(ASSETS_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
      );
    })
  );
});

// Background sync - retry failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-activities') {
    event.waitUntil(syncActivities());
  }

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncActivities() {
  try {
    const response = await fetch('/api/activities/sync', {
      method: 'POST',
    });
    return response.json();
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
    });
    return response.json();
  } catch (error) {
    console.error('Notification sync failed:', error);
    throw error;
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push message received but no data');
    return;
  }

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icons/192x192.png',
    badge: '/icons/192x192.png',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Look for existing window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
```

### 4. Root Layout Configuration

```typescript
// src/app/layout.tsx
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: "Amanda's Study Planner",
  description:
    'A centralized study planning application for university students',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <link rel="apple-touch-icon" href="/icons/192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Study Planner" />
      </head>
      <body>
        <ServiceWorkerInitializer />
        {children}
        <UpdatePrompt />
      </body>
    </html>
  );
}

function ServiceWorkerInitializer() {
  'use client';
  import('use-client');
  const { initializeServiceWorker } = require('@/shared/lib/notifications/service-worker-registration');

  return null;
}

function UpdatePrompt() {
  'use client';
  import('use-client');
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    const handleUpdateAvailable = (event: any) => {
      setRegistration(event.detail.registration);
      setShowUpdate(true);
    };

    window.addEventListener('app-update-available', handleUpdateAvailable);
    return () =>
      window.removeEventListener('app-update-available', handleUpdateAvailable);
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdate(false);
      window.location.reload();
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
      <p className="mb-2">New version available!</p>
      <button
        onClick={handleUpdate}
        className="bg-white text-blue-600 px-3 py-1 rounded font-semibold"
      >
        Update
      </button>
    </div>
  );
}
```

## Offline-First Data Sync

### Local Storage Cache Layer

```typescript
// src/shared/lib/supabase/offlineCache.ts
export class OfflineCache {
  private storageKey = 'amanda-offline-cache';

  // Cache data with timestamp
  async setData<T>(key: string, data: T): Promise<void> {
    const cache = this.getCache();
    cache[key] = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(cache));
  }

  // Get cached data
  async getData<T>(key: string): Promise<T | null> {
    const cache = this.getCache();
    return cache[key]?.data || null;
  }

  // Track pending mutations for sync
  async addPendingMutation(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<void> {
    const mutations = this.getPendingMutations();
    mutations.push({
      id: `${table}-${Date.now()}`,
      type,
      table,
      data,
      timestamp: Date.now(),
    });
    localStorage.setItem('pending-mutations', JSON.stringify(mutations));
  }

  // Get pending mutations
  getPendingMutations() {
    const data = localStorage.getItem('pending-mutations');
    return data ? JSON.parse(data) : [];
  }

  // Clear pending mutations after sync
  clearPendingMutations(): void {
    localStorage.removeItem('pending-mutations');
  }

  private getCache() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : {};
  }
}
```

### Offline-First Hook

```typescript
// src/shared/hooks/useOfflineQuery.ts
import { useEffect, useState } from 'react';
import { useOnline } from './useOnline';
import { OfflineCache } from '@/shared/lib/supabase/offlineCache';

interface UseOfflineQueryOptions<T> {
  queryKey: string;
  queryFn: () => Promise<T>;
  cacheTime?: number;
}

export function useOfflineQuery<T>({
  queryKey,
  queryFn,
  cacheTime = 5 * 60 * 1000, // 5 minutes
}: UseOfflineQueryOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isOnline = useOnline();
  const cache = new OfflineCache();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (isOnline) {
          // Fetch from server
          const result = await queryFn();
          setData(result);

          // Cache result
          await cache.setData(queryKey, result);
        } else {
          // Use cached data
          const cached = await cache.getData<T>(queryKey);
          if (cached) {
            setData(cached);
          } else {
            setError(new Error('No cached data available'));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));

        // Fall back to cache on error
        const cached = await cache.getData<T>(queryKey);
        if (cached) {
          setData(cached);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOnline, queryKey]);

  return { data, isLoading, error };
}
```

### Online Status Hook

```typescript
// src/shared/hooks/useOnline.ts
import { useEffect, useState } from 'react';

export function useOnline(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

## Web Push Notifications

### VAPID Keys Setup

```bash
# Generate VAPID keys (run once)
npx web-push generate-vapid-keys
```

```env
# .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key>
VAPID_PRIVATE_KEY=<private_key>
```

### Push Notification Service

```typescript
// src/shared/lib/notifications/pushService.ts
import webpush from 'web-push';

export class PushService {
  constructor() {
    webpush.setVapidDetails(
      'mailto:support@studyplanner.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
  }

  async sendNotification(
    subscription: PushSubscription,
    payload: {
      title: string;
      body: string;
      icon?: string;
      data?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        subscription as any,
        JSON.stringify(payload)
      );
    } catch (error) {
      if ((error as any).statusCode === 410) {
        // Subscription expired or invalid
        // Remove from database
        throw new Error('Subscription expired');
      }
      throw error;
    }
  }

  async sendBatch(
    subscriptions: PushSubscription[],
    payload: Parameters<typeof this.sendNotification>[1]
  ): Promise<void> {
    await Promise.all(
      subscriptions.map((sub) =>
        this.sendNotification(sub, payload).catch((err) => {
          console.error('Failed to send to subscription:', err);
        })
      )
    );
  }
}
```

### Push Notification Subscription

```typescript
// src/shared/lib/notifications/pushHelper.ts
export async function subscribeToPushNotifications(): Promise<
  PushSubscription | null
> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // Create new subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    // Send to server to store
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to subscribe on server');
    }

    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });
    }
  } catch (error) {
    console.error('Unsubscribe failed:', error);
  }
}
```

### Subscribe Route Handler

```typescript
// src/app/api/notifications/subscribe/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscription } = await request.json();

  const { error } = await supabase
    .from('notification_subscriptions')
    .upsert({
      user_id: authData.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      is_active: true,
    });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
```

## Performance Checklist

- [ ] Manifest.json configured with correct metadata
- [ ] Service worker registered and working
- [ ] Offline functionality tested (DevTools offline mode)
- [ ] Installable on mobile home screen (iOS/Android)
- [ ] Initial load < 3 seconds (measured with Lighthouse)
- [ ] Works offline (critical paths accessible)
- [ ] Push notifications working
- [ ] Cache strategy optimized (assets cache first, API network first)
- [ ] Bundle size < 250KB (gzipped)
- [ ] Web app manifest has all required icons

## Testing Offline Functionality

1. **DevTools Testing:**
   - Open DevTools → Application → Service Workers
   - Check "Offline" checkbox
   - Test app functionality

2. **Network Throttling:**
   - DevTools → Network tab
   - Select "Slow 3G" or "Offline"
   - Verify app behavior

3. **Lighthouse Audit:**
   - DevTools → Lighthouse
   - Run PWA audit
   - Check all criteria

## References

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Supabase Real-time](https://supabase.com/docs/guides/realtime)
