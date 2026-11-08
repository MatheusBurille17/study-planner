# PWA & Offline-First - Design

## Overview

The PWA & Offline-First feature transforms Amanda's Study Planner into a fully functional Progressive Web Application with comprehensive offline capabilities. The system enables students to work seamlessly without internet connectivity, install the app on home screens across all devices, and synchronize changes intelligently when connectivity is restored.

### Core Responsibilities
1. Register and manage Service Worker lifecycle
2. Implement versioned caching strategies (Cache-First for assets, Stale-While-Revalidate for API)
3. Persist application data in IndexedDB for offline access
4. Queue and synchronize offline changes to server
5. Manage Web App Manifest and PWA installability
6. Detect offline/online state and trigger appropriate actions
7. Display offline indicators and user feedback
8. Handle conflict resolution when offline changes conflict with server updates
9. Manage push notification subscriptions
10. Provide graceful degradation for unsupported features offline

---

## Architecture

### System Flow - Offline Scenario

```
User Creates Activity
    ↓
Offline?
    ├─ YES: Save to IndexedDB, add to syncQueue
    │   ├─ Display "Saved locally - will sync when online"
    │   └─ Update pending changes count
    └─ NO: Send to server normally
    
User Reconnects
    ↓
Detect Online Event
    ↓
Start Sync Queue Processing
    ├─ For each entry (FIFO):
    │   ├─ Send to API
    │   ├─ If success: remove from queue
    │   └─ If failure: retry with backoff (3 times)
    └─ After all synced: Display success message
    
User Receives Push Notification
    ↓
Service Worker Push Event
    ├─ Extract payload
    ├─ Display notification
    └─ On click: Open app to correct page
```

### Component Architecture

```
FRONTEND
├── Service Worker (public/service-worker.js)
│   ├── Install handler (pre-cache assets)
│   ├── Activate handler (clean old caches)
│   ├── Fetch handler (cache strategies)
│   ├── Push handler (display notifications)
│   └── Notification click handler (navigation)
│
├── IndexedDB Manager (src/shared/lib/offline/indexeddb.ts)
│   ├── Database initialization
│   ├── CRUD operations for entities
│   ├── Sync queue management
│   └── Round-trip integrity checks
│
├── Offline Manager (src/shared/lib/offline/offlineManager.ts)
│   ├── Online/offline state tracking
│   ├── Sync queue processing
│   ├── Conflict resolution
│   └── Health check verification
│
├── Hooks & Context
│   ├── useOfflineState() - access offline state
│   ├── useSync() - trigger/monitor sync
│   └── OfflineContext - provide state to components
│
├── Components
│   ├── OfflineIndicator (banner with status)
│   ├── NotificationPermissionPrompt (request push permission)
│   ├── InstallPrompt (suggest app installation)
│   └── SyncStatusPanel (show pending changes)
│
├── Server Actions
│   ├── syncActivityChanges.ts
│   ├── syncSubjectChanges.ts
│   └── handleConflictResolution.ts
│
└── Web App Manifest (public/manifest.json)
    └── Icons (public/icons/)

BACKEND (Supabase)
├── Sync endpoints
│   ├── POST /api/sync/activities
│   ├── POST /api/sync/subjects
│   └── POST /api/sync/conflicts
├── Notification subscriptions
│   ├── GET /api/notifications/subscription
│   ├── POST /api/notifications/subscribe
│   └── DELETE /api/notifications/unsubscribe
└── Health check
    └── HEAD /api/health
```

---

## Data Models

### IndexedDB Schema

#### Database: `amanda_study_planner` (version: 1)

**Object Store: `activities`**
```typescript
{
  id: string (keyPath, UUID)
  userId: string (indexed)
  title: string
  description?: string
  subjectId?: string
  type: 'task' | 'exam' | 'assignment'
  dueDate?: string (ISO format)
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in-progress' | 'completed'
  estimatedTimeMinutes?: number
  tags?: string[]
  synced: boolean (indexed, default: false)
  syncedAt?: string (ISO format)
  createdAt: string (ISO format)
  updatedAt: string (ISO format)
}

Indexes:
  - userId (for user-specific queries)
  - status (for filtering by status)
  - dueDate (for sorting)
  - synced (for finding unsync'd changes)
```

**Object Store: `subjects`**
```typescript
{
  id: string (keyPath, UUID)
  userId: string (indexed)
  name: string
  code?: string
  color?: string
  professor?: string
  createdAt: string (ISO format)
  updatedAt: string (ISO format)
}

Indexes:
  - userId (for user-specific queries)
```

**Object Store: `syncQueue`**
```typescript
{
  id: string (keyPath, UUID - generated locally)
  userId: string (indexed)
  operation: 'create' | 'update' | 'delete' (indexed)
  entityType: 'activity' | 'subject'
  entityId?: string (for updates/deletes)
  entityData: object (full entity data)
  timestamp: number (indexed, Date.now())
  status: 'pending' | 'syncing' | 'failed' (indexed)
  attemptCount: number (default: 0)
  nextRetryAt?: number (for exponential backoff)
  error?: string (error message if failed)
}

Indexes:
  - userId (for user-specific queue)
  - status (find pending/failed)
  - timestamp (for FIFO processing)
  - operation (for operation filtering)
```

### Service Worker Cache Structure

```
assets-cache-v1
├── /                    (index.html)
├── /_next/static/      (JavaScript bundles)
├── /styles/            (CSS files)
├── /icons/             (App icons)
└── /fonts/             (Font files)

api-cache-v1
├── /api/activities     (Activities list)
├── /api/activities/[id] (Activity details)
├── /api/subjects       (Subjects list)
├── /api/calendar/...   (Calendar events)
└── /api/dashboard/...  (Dashboard data)
```

---

## Components and Interfaces

### 1. Service Worker

**Location:** `public/service-worker.js`

**Install Event:**
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('assets-cache-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/_next/static/...',
        '/styles/...',
        '/icons/icon-192x192.png'
        // ... other critical assets
      ])
    })
  )
})
```

**Activate Event:**
```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          // Delete old versioned caches
          if (!name.includes('-v1')) {
            return caches.delete(name)
          }
        })
      )
    })
  )
})
```

**Fetch Event - Cache-First for Assets:**
```javascript
self.addEventListener('fetch', (event) => {
  if (isAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request)
          .then((response) => {
            return caches.open('assets-cache-v1').then((cache) => {
              cache.put(event.request, response.clone())
              return response
            })
          })
      }).catch(() => caches.match('/offline.html'))
    )
  }
})
```

**Fetch Event - Stale-While-Revalidate for API:**
```javascript
self.addEventListener('fetch', (event) => {
  if (isApiRequest(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              caches.open('api-cache-v1').then((cache) => {
                cache.put(event.request, response.clone())
              })
            }
            return response
          })
        
        // Return cached immediately, fetch in background
        return cachedResponse || fetchPromise
      })
    )
  }
})
```

**Push Event:**
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'notification',
    data: data.data || {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})
```

**Notification Click Event:**
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data
  let path = '/app/calendar'
  
  if (data.activityType === 'exam') path = '/app/calendar'
  if (data.activityType === 'assignment') path = '/app/activities'
  if (data.activityType === 'task') path = '/app/activities'
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/' && 'focus' in clientList[i])
          return clientList[i].focus()
      }
      return clients.openWindow(path)
    })
  )
})
```

### 2. IndexedDB Manager

**Location:** `src/shared/lib/offline/indexeddb.ts`

```typescript
export class IndexedDBManager {
  private db: IDBDatabase
  private dbName = 'amanda_study_planner'
  private dbVersion = 1

  async init(): Promise<void> {
    // Initialize database connection
    // Create/upgrade schema as needed
  }

  async saveActivity(activity: Activity): Promise<void> {
    const tx = this.db.transaction(['activities'], 'readwrite')
    const store = tx.objectStore('activities')
    await store.put(activity)
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    const tx = this.db.transaction(['activities'], 'readonly')
    return tx.objectStore('activities').get(id)
  }

  async getActivitiesByUser(userId: string): Promise<Activity[]> {
    const tx = this.db.transaction(['activities'], 'readonly')
    const index = tx.objectStore('activities').index('userId')
    return index.getAll(userId)
  }

  async addToSyncQueue(
    operation: 'create' | 'update' | 'delete',
    entityType: string,
    entityData: any
  ): Promise<string> {
    const entry = {
      id: crypto.randomUUID(),
      userId: getCurrentUserId(),
      operation,
      entityType,
      entityData,
      timestamp: Date.now(),
      status: 'pending',
      attemptCount: 0
    }
    
    const tx = this.db.transaction(['syncQueue'], 'readwrite')
    await tx.objectStore('syncQueue').add(entry)
    return entry.id
  }

  async getSyncQueue(userId: string): Promise<SyncQueueEntry[]> {
    const tx = this.db.transaction(['syncQueue'], 'readonly')
    const index = tx.objectStore('syncQueue').index('userId')
    return index.getAll(userId)
  }

  async updateSyncQueueEntry(id: string, updates: Partial<SyncQueueEntry>): Promise<void> {
    const tx = this.db.transaction(['syncQueue'], 'readwrite')
    const store = tx.objectStore('syncQueue')
    const entry = await store.get(id)
    await store.put({ ...entry, ...updates })
  }
}
```

### 3. Offline Manager

**Location:** `src/shared/lib/offline/offlineManager.ts`

```typescript
export class OfflineManager {
  private isOnline = navigator.onLine
  private syncInProgress = false
  private syncQueue: SyncQueueEntry[] = []
  private listeners: OfflineListener[] = []

  init(): void {
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())
    
    // Periodic health check
    setInterval(() => this.healthCheck(), 30000)
  }

  private async handleOnline(): Promise<void> {
    this.isOnline = true
    this.notifyListeners('online')
    await this.processSyncQueue()
  }

  private handleOffline(): void {
    this.isOnline = false
    this.notifyListeners('offline')
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress) return
    
    this.syncInProgress = true
    const queue = await this.getUnsyncedChanges()
    
    for (const entry of queue) {
      try {
        await this.syncEntry(entry)
      } catch (error) {
        await this.handleSyncFailure(entry, error)
        break // Stop on first failure
      }
    }
    
    this.syncInProgress = false
  }

  private async syncEntry(entry: SyncQueueEntry): Promise<void> {
    await updateSyncQueueEntry(entry.id, { status: 'syncing' })
    
    try {
      switch (entry.entityType) {
        case 'activity':
          await this.syncActivityChange(entry)
          break
        case 'subject':
          await this.syncSubjectChange(entry)
          break
      }
      
      await updateSyncQueueEntry(entry.id, { status: 'synced' })
      await deleteSyncQueueEntry(entry.id)
    } catch (error) {
      throw error
    }
  }

  private async handleSyncFailure(entry: SyncQueueEntry, error: Error): Promise<void> {
    const nextAttempt = entry.attemptCount + 1
    if (nextAttempt >= 3) {
      await updateSyncQueueEntry(entry.id, {
        status: 'failed',
        error: error.message
      })
      this.notifyListeners('sync-failed', { entry, error })
    } else {
      const backoffMs = [30000, 60000, 120000][nextAttempt - 1]
      await updateSyncQueueEntry(entry.id, {
        status: 'pending',
        attemptCount: nextAttempt,
        nextRetryAt: Date.now() + backoffMs
      })
    }
  }

  private async healthCheck(): Promise<void> {
    if (this.isOnline) return
    
    try {
      await fetch('/api/health', { method: 'HEAD' })
      this.handleOnline()
    } catch {
      // Still offline
    }
  }

  isCurrentlyOffline(): boolean {
    return !this.isOnline
  }

  addListener(listener: OfflineListener): void {
    this.listeners.push(listener)
  }

  private notifyListeners(event: string, data?: any): void {
    this.listeners.forEach(l => l(event, data))
  }
}

export type OfflineListener = (event: string, data?: any) => void
```

### 4. React Hooks

**Location:** `src/shared/hooks/useOfflineState.ts`

```typescript
export function useOfflineState() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(0)
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return { isOffline, pendingChanges }
}
```

### 5. UI Components

**OfflineIndicator Component**
- Location: `src/shared/components/OfflineIndicator.tsx`
- Shows banner with current status
- Updates based on online/offline state
- Shows pending changes count
- Allows manual retry

**InstallPrompt Component**
- Location: `src/shared/components/InstallPrompt.tsx`
- Captures `beforeinstallprompt` event
- Shows "Install App" button when available
- Handles installation flow
- Shows success message after install

### 6. Web App Manifest

**Location:** `public/manifest.json`

```json
{
  "name": "Amanda's Study Planner",
  "short_name": "Study Planner",
  "description": "Study planning and task management for university students",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/screenshot-1.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

---

## Caching Strategies

### Cache-First for Static Assets

**When to Use:**
- HTML, CSS, JavaScript files
- Images, fonts
- App icons
- Static resources that change infrequently

**Flow:**
1. Check cache first
2. If found, return cached version
3. If not found, fetch from network and cache
4. If network fails, return cached or fallback

**Invalidation:**
- Versioned cache names (`assets-cache-v1`)
- On Service Worker activation, delete old versions
- New deployments automatically get new cache version

### Stale-While-Revalidate for API Responses

**When to Use:**
- Activity lists
- Subject lists
- Calendar events
- Dashboard data
- Any dynamic data that can tolerate brief staleness

**Flow:**
1. Return cached version immediately (even if stale)
2. Fetch fresh data from network in background
3. Update cache with fresh data
4. Notify client that fresh data is available

**TTL:** 5 minutes

**Invalidation:**
- Manual refresh bypasses cache
- TTL expiration on next request
- Server update triggers client-side refresh

---

## Conflict Resolution

### Strategy: Last-Write-Wins with User Notification

**Scenario 1: Offline Edit + Server Update**
1. User edits Activity offline
2. Activity is updated on server by another device
3. On sync, timestamps are compared
4. Server version (newer `updatedAt`) takes precedence
5. User is notified: "Your changes were overwritten by updates from another device"
6. Optional: User can undo to restore their version

**Scenario 2: Offline Delete + Server Update**
1. User deletes Activity offline
2. Activity is updated on server
3. On sync, deletion is not applied
4. Server version is preserved
5. User sees activity reappear with latest server version

**Scenario 3: Offline Create + Server Conflict**
1. User creates Activity offline with client-generated ID
2. Server has Activity with same ID (unlikely)
3. On sync, client ID is discarded
4. Activity is re-created with server-assigned ID
5. Old client-created record is cleaned up

---

## Performance Considerations

### Service Worker Performance

**Cache Hit Performance:**
- Assets: < 100ms (immediate from cache)
- API responses: < 200ms (cached + background fetch)

**Cold Load Performance:**
- First load: < 3 seconds (network requests)
- Subsequent loads: < 1 second (from cache)

### IndexedDB Performance

**Query Performance:**
- Single record lookup: < 50ms
- Multi-record query (< 500): < 200ms
- Indexed queries (status, userId): < 100ms

**Storage Limits:**
- Typical user data: < 10MB
- Max IndexedDB quota: Usually 50MB+ (browser-dependent)
- Cache API quota: Usually 50MB+ (browser-dependent)

### Sync Performance

**Queue Processing:**
- Per activity: < 1 second (API call + DB update)
- Batch of 100: < 5 seconds
- Total timeout: 25 seconds (leave 5s buffer before function timeout)

---

## Security Considerations

### Data Privacy

- IndexedDB data stays on user's device (never sent to server unless explicitly synced)
- Service Worker cache is same-origin only (other sites cannot access)
- No sensitive data (passwords, tokens) stored in cache or IndexedDB
- Sync must use HTTPS and include auth tokens
- Offline data must be user-specific (cannot access another user's data)

### Cache Versioning

- Old caches automatically deleted on activation
- Cache key strategy prevents stale data from being used indefinitely
- Browser quota limits prevent cache from growing unbounded

### Quota Management

- Monitor cache size
- Implement LRU (Least Recently Used) cleanup if quota exceeded
- Clear cache on user logout

---

## Testing Strategy

### Unit Tests

- IndexedDB CRUD operations
- Sync queue processing logic
- Offline state transitions
- Cache strategy selection

### Integration Tests

- Service Worker with fetch events
- IndexedDB with application data flows
- Sync queue with API endpoints
- Offline/online transitions with UI updates

### E2E Tests

- Complete offline workflow (create → offline → sync)
- Installation prompt flow
- Offline access verification
- Conflict resolution scenarios

### Property-Based Tests

- Round-trip data integrity (all data types)
- Sync queue FIFO ordering
- Cache versioning correctness
- Quota management effectiveness

---

## Implementation Sequence

1. **Web App Manifest & Icons** - Basic PWA setup
2. **Service Worker - Install & Activate** - Cache setup
3. **Service Worker - Fetch & Caching** - Cache-First and Stale-While-Revalidate
4. **IndexedDB - Setup** - Database initialization
5. **IndexedDB - CRUD Operations** - Data persistence
6. **Offline Manager** - State tracking and sync queue
7. **UI Components** - Offline indicators, install prompts
8. **Sync Logic** - Queue processing and conflict resolution
9. **Push Notifications** - Subscription and delivery
10. **Testing & Optimization** - Full test coverage and performance

---

## Correctness Properties

### Property 1: Cache Versioning Cleanup
For any deployment with a new cache version, all old versioned caches must be deleted during Service Worker activation.

### Property 2: Sync Queue FIFO Ordering
For any sync queue with multiple pending entries, entries must be processed in timestamp order (oldest first).

### Property 3: IndexedDB Round-Trip Integrity
For any data stored in IndexedDB, synced to server, and re-fetched, all properties must match exactly (types, arrays, dates, nulls).

### Property 4: Offline-First Data Consistency
For any user, offline data must be kept separate and synced only after explicit connectivity restoration.

### Property 5: Conflict Resolution Determinism
For any conflict scenario, the system must apply the same resolution rule consistently (last-write-wins).

### Property 6: Service Worker Installation
For any app load, if Service Worker is supported, registration must complete without errors.

### Property 7: Push Notification Integrity
For any push notification sent, it must include all required fields (title, body, icon, tag, data).

### Property 8: Offline State Accuracy
For any network state change, `navigator.onLine` must be updated within 500ms and UI must reflect change.

### Property 9: Cache Invalidation TTL
For any API response with 5-minute TTL, cache must be considered stale after 5 minutes.

### Property 10: Subscription RLS
For any push subscription, users must only see/modify their own subscriptions (Row-Level Security).
