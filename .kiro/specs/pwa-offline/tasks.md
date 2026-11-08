# Implementation Plan: PWA & Offline-First System

## Overview

This plan breaks down the PWA & Offline-First system into 7 implementation phases. Each task is designed to be completable in 2-4 hours and builds incrementally toward a fully functional offline-capable Progressive Web Application. The system enables students to work seamlessly offline, synchronize changes when connectivity is restored, and install the app on home screens across all devices.

## Implementation Phases

- **Phase 1: Web App Manifest & Icons** - PWA configuration, icons, meta tags
- **Phase 2: Service Worker - Install & Activate** - Service Worker lifecycle, asset caching
- **Phase 3: Service Worker - Fetch & Caching** - Cache-First and Stale-While-Revalidate strategies
- **Phase 4: IndexedDB - Setup** - Database initialization, schema creation
- **Phase 5: IndexedDB - Data Operations** - CRUD operations, sync queue management
- **Phase 6: Offline Manager & UI** - State tracking, indicators, installation prompts
- **Phase 7: Sync & Conflict Resolution** - Queue processing, sync logic, conflict handling

---

## Phase 1: Web App Manifest & Icons

### Task 1.1: Create Web App Manifest

**Requirement:** Requirement 1

**Objective:** Set up PWA manifest and configure installability metadata

**Subtasks:**

- [x] Create `public/manifest.json` with required properties:
  - name, short_name, description
  - start_url, scope, display
  - theme_color, background_color
  - icons array with 192x192 and 512x512
  - screenshots array (optional, for app stores)

- [x] Create `public/icons/` directory and add icons:
  - Download or generate icon-192x192.png
  - Download or generate icon-512x512.png
  - Download or generate badge-72x72.png (for notifications)
  - Ensure all are optimized PNG files
  - Total icon size < 500KB

- [x] Update `src/app/layout.tsx` to reference manifest:
  - Add `<link rel="manifest" href="/manifest.json">`
  - Add `<meta name="theme-color" content="#3B82F6">`
  - Add `<meta name="mobile-web-app-capable" content="yes">`
  - Add `<apple-mobile-web-app-capable>`
  - Add Apple-specific icons for iOS

- [x] Create `.env.local` variables (if needed):
  - Store manifest properties as environment variables
  - Make manifest dynamic if needed

- [x] Validate manifest:
  - Test with PWA validator tools (Lighthouse, WebPageTest)
  - Verify manifest is valid JSON
  - Verify all properties are correct
  - Test on mobile browsers (Android Chrome, iOS Safari)

**Acceptance Criteria:**
- manifest.json is valid and complete
- All icons present and optimized
- Manifest referenced correctly in HTML
- PWA installation prompt appears on supported browsers
- No validation errors from PWA validators
- Icons display correctly on home screen

**Time Estimate:** 1-2 hours

---

### Task 1.2: Configure Meta Tags and Theme

**Requirement:** Requirement 1, 18

**Objective:** Add all necessary meta tags for PWA compatibility across browsers

**Subtasks:**

- [x] Add Chrome/Android specific meta tags:
  - `theme-color` for browser address bar
  - Status bar styling
  - Fullscreen display mode hints

- [x] Add Apple/iOS specific meta tags:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - `apple-mobile-web-app-title`
  - Apple touch icons (180x180)

- [x] Add Windows/Desktop meta tags:
  - `msapplication-TileColor`
  - `msapplication-TileImage`

- [x] Create offline fallback page:
  - Create `public/offline.html`
  - Simple HTML page for when offline
  - No external dependencies

- [x] Test across browsers:
  - Chrome/Android
  - Firefox
  - Safari/iOS
  - Edge/Windows

**Acceptance Criteria:**
- All meta tags present
- Theme colors apply correctly
- Icons display on home screen
- Offline fallback page works
- No console errors or warnings
- App name displays correctly on home screen

**Time Estimate:** 1 hour

---

## Phase 2: Service Worker - Install & Activate

### Task 2.1: Create Service Worker File

**Requirement:** Requirement 2, 18

**Objective:** Create Service Worker with install and activate handlers

**Subtasks:**

- [x] Create `public/service-worker.js`:
  - Implement `install` event handler
  - Implement `activate` event handler
  - Implement cache versioning logic
  - Implement error handling

- [x] Implement install handler:
  - Create versioned cache (`assets-cache-v1`)
  - Pre-cache critical assets (HTML, JS bundles, CSS, icons)
  - List all assets to cache
  - Handle cache errors gracefully

- [x] Implement activate handler:
  - Get all cache names
  - Delete old versioned caches (keep only current version)
  - Clean up orphaned caches
  - Log cache cleanup for debugging

- [x] Add version management:
  - Define current cache version constant
  - Use version in cache naming
  - Document how to bump version on new deployments

- [x] Create unit tests:
  - Test install event caches assets
  - Test activate event deletes old caches
  - Test error handling during install/activate

**Acceptance Criteria:**
- Service Worker installs successfully
- Critical assets are pre-cached
- Old caches are cleaned up on activation
- No console errors during installation
- Cache appears in DevTools Application tab
- Works across browser refreshes

**Time Estimate:** 2-3 hours

---

### Task 2.2: Register Service Worker from App

**Requirement:** Requirement 2

**Objective:** Create registration logic and client component

**Subtasks:**

- [x] Create `src/shared/lib/offline/service-worker-registration.ts`:
  - Implement `registerServiceWorker()` function
  - Check `navigator.serviceWorker` support
  - Handle registration success
  - Handle registration errors
  - Check for updates periodically

- [x] Create `src/features/notifications/presentation/hooks/useServiceWorkerRegistration.ts`:
  - Custom React hook for registration
  - Use `useEffect` on app mount
  - Handle browser compatibility

- [x] Create `src/features/notifications/presentation/components/ServiceWorkerInitializer.tsx`:
  - Client component that registers SW
  - Mount in root layout
  - No UI, just registration logic

- [x] Update `src/app/layout.tsx`:
  - Import ServiceWorkerInitializer
  - Mount component in main layout
  - Ensure it runs only on client side

- [x] Create unit tests:
  - Test successful registration
  - Test error handling
  - Test browser support detection
  - Test update checking

**Acceptance Criteria:**
- Service Worker registers on app load
- Registration appears in DevTools
- No console errors
- Works on all modern browsers
- Graceful fallback on unsupported browsers
- Update check works

**Time Estimate:** 2 hours

---

## Phase 3: Service Worker - Fetch & Caching

### Task 3.1: Implement Cache-First Strategy for Assets

**Requirement:** Requirement 3

**Objective:** Handle static asset requests with Cache-First strategy

**Subtasks:**

- [x] Implement fetch event listener in Service Worker:
  - Detect asset requests (CSS, JS, images, fonts)
  - Use `url.pathname` pattern matching
  - Implement Cache-First logic

- [x] Implement Cache-First algorithm:
  1. Check if request is in assets cache
  2. If found, return cached version
  3. If not found, fetch from network
  4. Cache the response
  5. Return response

- [x] Handle errors gracefully:
  - If network fails and no cache, return offline fallback
  - Log errors but don't throw
  - Ensure response always returned or fallback

- [x] Add cache invalidation:
  - On activate, delete old asset caches
  - New version numbers trigger new cache
  - No need for individual asset versioning

- [x] Create unit tests:
  - Test cache hit returns immediately
  - Test cache miss fetches and caches
  - Test network failure returns cache
  - Test fallback on no cache available

- [x] Create integration tests:
  - Test assets load from cache offline
  - Test new assets cached on first load
  - Test cache cleaned on activation

**Acceptance Criteria:**
- Assets served from cache when available
- Assets fetched and cached on first load
- Offline access works with cached assets
- Cache strategy efficient (no unnecessary network requests)
- Old caches cleaned up properly
- No console errors

**Time Estimate:** 2-3 hours

---

### Task 3.2: Implement Stale-While-Revalidate Strategy for API

**Requirement:** Requirement 4

**Objective:** Handle API requests with Stale-While-Revalidate strategy

**Subtasks:**

- [x] Implement Stale-While-Revalidate logic:
  1. Return cached response immediately (even if stale)
  2. Fetch fresh data in background
  3. Update cache with fresh data
  4. Notify client of fresh data via message

- [x] Create API cache detection:
  - Identify API requests (`/api/...`)
  - Create `api-cache-v1` cache
  - Use 5-minute TTL

- [x] Implement background fetch:
  - Use `fetch()` in fetch event handler
  - Don't wait for response
  - Update cache when response arrives

- [x] Add cache invalidation:
  - Remove API cache entries older than 5 minutes
  - On TTL expiration, re-fetch on next request
  - Allow manual cache bypass with query param

- [x] Create client-side notification:
  - Use `MessageChannel` or `postMessage()`
  - Notify when fresh data available
  - UI can show "updated" indicator

- [x] Create unit tests:
  - Test cached response returned immediately
  - Test fresh data fetched in background
  - Test cache updated with fresh data
  - Test TTL expiration triggers refetch

**Acceptance Criteria:**
- Cached API responses returned immediately
- Fresh data fetched and cached in background
- Old cache automatically refreshed
- No long waits for stale data
- Client notified of fresh data
- Works correctly with network failures

**Time Estimate:** 2-3 hours

---

## Phase 4: IndexedDB - Setup

### Task 4.1: Create IndexedDB Database Manager

**Requirement:** Requirement 5

**Objective:** Set up IndexedDB database with schema and initialization

**Subtasks:**

- [x] Create `src/shared/lib/offline/indexeddb.ts`:
  - Implement IndexedDBManager class
  - Define database name: `amanda_study_planner`
  - Define database version: 1
  - Implement database initialization

- [x] Create object stores:
  - Create `activities` store with keyPath `id`
  - Create `subjects` store with keyPath `id`
  - Create `syncQueue` store with keyPath `id`
  - Define indexes for each store

- [x] Implement `activities` store schema:
  - Indexes: userId, status, dueDate, synced
  - Support all Activity properties
  - Include sync metadata (synced, syncedAt)

- [x] Implement `subjects` store schema:
  - Indexes: userId
  - Support all Subject properties

- [x] Implement `syncQueue` store schema:
  - Indexes: userId, status, timestamp, operation
  - Store operation, entityType, entityData
  - Track attempts and retry timing

- [x] Add error handling:
  - Handle quota exceeded errors
  - Handle transaction errors
  - Graceful fallback if IndexedDB unavailable

- [x] Create unit tests:
  - Test database initialization
  - Test schema creation
  - Test index creation
  - Test error handling

**Acceptance Criteria:**
- Database initializes successfully
- All stores and indexes created
- No schema errors
- Error handling works
- Database persists across sessions
- DevTools shows database structure

**Time Estimate:** 2 hours

---

### Task 4.2: Implement CRUD Operations

**Requirement:** Requirement 5

**Objective:** Implement create, read, update, delete operations for all entities

**Subtasks:**

- [x] Implement activity operations:
  - `saveActivity(activity)` - create or update
  - `getActivity(id)` - get single
  - `getActivitiesByUser(userId)` - get all for user
  - `getActivitiesByStatus(userId, status)` - filter
  - `deleteActivity(id)` - delete

- [x] Implement subject operations:
  - `saveSubject(subject)`
  - `getSubject(id)`
  - `getSubjectsByUser(userId)`
  - `deleteSubject(id)`

- [x] Implement sync queue operations:
  - `addToSyncQueue(operation, entityType, entityData)`
  - `getSyncQueue(userId)`
  - `updateSyncQueueEntry(id, updates)`
  - `deleteSyncQueueEntry(id)`
  - `getSyncQueueByStatus(userId, status)`

- [x] Add transaction handling:
  - Wrap operations in transactions
  - Handle transaction errors
  - Ensure ACID properties

- [x] Add indexing support:
  - Query by userId efficiently
  - Filter by status efficiently
  - Sort by date efficiently

- [x] Create unit tests:
  - Test save/retrieve activity
  - Test update activity
  - Test delete activity
  - Test queries with indexes
  - Test error handling

- [x] Create integration tests:
  - Test round-trip: create → retrieve → verify
  - Test multiple records
  - Test concurrent operations

**Acceptance Criteria:**
- All CRUD operations work correctly
- Indexes used for efficient queries
- Transactions ensure data consistency
- No data loss or corruption
- Error handling works
- Tests pass

**Time Estimate:** 2-3 hours

---

## Phase 5: IndexedDB - Sync Queue

### Task 5.1: Create Sync Queue Management

**Requirement:** Requirement 6

**Objective:** Implement sync queue for offline changes

**Subtasks:**

- [x] Create sync queue entry interface:
  - id, userId, operation, entityType
  - entityId, entityData
  - timestamp, status, attemptCount, nextRetryAt, error

- [x] Implement queue operations:
  - Add entry when creating/updating/deleting offline
  - Get pending entries for processing
  - Update entry status (pending → syncing → synced/failed)
  - Track retry attempts and backoff timing

- [x] Implement FIFO processing:
  - Sort by timestamp (oldest first)
  - Process one entry at a time
  - Skip retries if nextRetryAt not reached

- [x] Add retry logic:
  - On failure: schedule retry with exponential backoff
  - Attempt 1: immediate
  - Attempt 2: 30 seconds later
  - Attempt 3: 60 seconds later
  - Attempt 4: 120 seconds later
  - After 3 failures: mark as failed, stop retrying

- [x] Create unit tests:
  - Test add entry to queue
  - Test FIFO ordering
  - Test retry scheduling
  - Test status transitions
  - Test error handling

**Acceptance Criteria:**
- Queue processes entries in order
- Retry logic works correctly
- No entries lost
- Status transitions correct
- Backoff timing accurate
- Tests pass with 100% coverage

**Time Estimate:** 2 hours

---

## Phase 6: Offline Manager & UI

### Task 6.1: Create Offline Manager

**Requirement:** Requirement 8

**Objective:** Implement offline state detection and sync coordination

**Subtasks:**

- [x] Create `src/shared/lib/offline/offlineManager.ts`:
  - Implement OfflineManager class
  - Track online/offline state
  - Listen to online/offline events
  - Perform health checks

- [x] Implement online/offline detection:
  - Listen to `window.online` and `window.offline` events
  - Debounce rapid changes (500ms)
  - Periodically verify with HEAD /api/health
  - Maintain isOnline state

- [x] Implement sync coordination:
  - On online: trigger sync queue processing
  - On offline: update UI indicators
  - Coordinate between multiple tabs (optional: use BroadcastChannel)

- [x] Add health check:
  - Every 30 seconds when offline: HEAD /api/health
  - If succeeds: trigger online event
  - Verify actual connectivity beyond navigator.onLine

- [x] Create listener pattern:
  - Register listeners for state changes
  - Notify on online/offline/sync-failed
  - Allow multiple listeners

- [x] Create unit tests:
  - Test online/offline detection
  - Test debouncing
  - Test health check
  - Test listener notification
  - Test error handling

**Acceptance Criteria:**
- Online/offline state detected accurately
- State changes trigger appropriate actions
- Health check verifies connectivity
- Listeners notified of changes
- Error handling works
- No false positives

**Time Estimate:** 2 hours

---

### Task 6.2: Create Offline Indicator Component

**Requirement:** Requirement 7

**Objective:** Build UI component to show offline status

**Subtasks:**

- [x] Create `src/shared/components/OfflineIndicator.tsx`:
  - Display when offline
  - Show banner at top of page
  - Show status message
  - Show pending changes count
  - Allow dismissal (temporary)

- [x] Implement status display:
  - "📡 Offline - Changes will sync when online"
  - "📡 Offline - You have X pending changes"
  - "📡 Syncing your changes..."
  - "✓ All changes synced" (3 seconds then disappear)
  - "⚠️ Failed to sync. Retrying..." with retry button

- [x] Create connectivity hook:
  - Create `src/shared/hooks/useConnectivity.ts`
  - Return `{ isOnline: boolean, pendingChanges: number }`
  - Subscribe to state changes
  - Update component on changes

- [x] Add styling:
  - Banner at top (sticky)
  - Warning colors (orange/amber for offline)
  - Success colors (green for synced)
  - Error colors (red for failed)
  - Responsive on mobile/tablet/desktop

- [x] Integrate into layout:
  - Import in `src/app/(main)/layout.tsx`
  - Mount at top of layout
  - Only visible when offline or syncing

- [x] Create unit tests:
  - Test display when offline
  - Test hide when online
  - Test pending changes count
  - Test status transitions
  - Test keyboard accessibility

- [x] Create E2E tests:
  - Test appears on network disconnect
  - Test disappears on reconnect
  - Test shows correct status

**Acceptance Criteria:**
- Component displays correctly
- Shows appropriate status messages
- Updates in real-time
- Responsive on all devices
- Accessible (keyboard, screen readers)
- No performance impact

**Time Estimate:** 2-3 hours

---

### Task 6.3: Create Installation Prompt Component

**Requirement:** Requirement 9

**Objective:** Build UI for PWA installation

**Subtasks:**

- [x] Create `src/shared/components/InstallPrompt.tsx`:
  - Capture `beforeinstallprompt` event
  - Store event for later use
  - Display "Install App" button when available
  - Handle install flow

- [x] Implement install flow:
  - On button click: call `event.prompt()`
  - Show native install dialog
  - Listen to `appinstalled` event
  - Hide button after install

- [x] Add platform detection:
  - Detect Android vs iOS vs Desktop
  - For iOS: show manual instructions
  - For Android/Desktop: use native prompt

- [x] Create iOS fallback:
  - Create `src/shared/components/IOSInstallGuide.tsx`
  - Show instructions for "Add to Home Screen"
  - Show when beforeinstallprompt not available

- [x] Add styling:
  - Banner or button design
  - Use app colors
  - Responsive layout
  - Clear CTA text

- [x] Create unit tests:
  - Test event capture
  - Test button display/hide
  - Test install prompt trigger

- [x] Create E2E tests:
  - Test installation on Android
  - Test manual instructions on iOS
  - Test success message

**Acceptance Criteria:**
- Install prompt appears when criteria met
- Installation works on Android
- Manual instructions show on iOS
- Button hides after install
- Responsive and accessible
- Works across browsers

**Time Estimate:** 2 hours

---

## Phase 7: Sync & Conflict Resolution

### Task 7.1: Implement Sync Logic

**Requirement:** Requirement 6, 16

**Objective:** Implement sync queue processing with API calls

**Subtasks:**

- [x] Create `src/features/activities/presentation/actions/syncActivityChanges.ts`:
  - Send sync queue entry to `/api/sync/activities`
  - Handle create/update/delete operations
  - Include auth headers
  - Return result (success/failure)

- [x] Create `src/features/subjects/presentation/actions/syncSubjectChanges.ts`:
  - Similar to activity sync
  - Handle subject sync operations

- [x] Implement sync processor:
  - Create `src/shared/lib/offline/syncProcessor.ts`
  - Process sync queue one entry at a time
  - Call appropriate sync action
  - Update queue entry status
  - Handle errors and retries

- [x] Create conflict detection:
  - Compare local and server `updatedAt` timestamps
  - Detect conflicts on sync
  - Apply last-write-wins strategy

- [x] Add user notifications:
  - Notify on sync start
  - Notify on sync success
  - Notify on sync failure
  - Show conflict resolution messages

- [x] Create error handling:
  - Catch network errors
  - Catch API errors
  - Catch validation errors
  - Display user-friendly messages

- [x] Create unit tests:
  - Test successful sync
  - Test sync with conflict
  - Test retry logic
  - Test error handling

**Acceptance Criteria:**
- Sync processes queue correctly
- API calls include all data
- Conflicts detected and resolved
- Retries work
- User notified appropriately
- No data loss or duplication

**Time Estimate:** 2-3 hours

---

### Task 7.2: Implement Conflict Resolution

**Requirement:** Requirement 16

**Objective:** Handle conflicts when offline changes conflict with server updates

**Subtasks:**

- [x] Implement last-write-wins strategy:
  - Compare `updatedAt` timestamps
  - Keep version with later timestamp
  - Discard other version

- [x] Implement undo functionality:
  - Store user's offline changes
  - Allow restore if conflict
  - Create `undoConflictResolution()` function

- [x] Handle specific conflict scenarios:
  - Offline edit + server update: keep server version, notify user
  - Offline delete + server update: keep server version
  - Offline create + server conflict: re-create with new ID

- [x] Create conflict handler:
  - Create `src/shared/lib/offline/conflictResolver.ts`
  - Detect conflicts
  - Apply resolution strategy
  - Log conflicts for debugging

- [x] Implement recovery:
  - On conflict: fetch latest version from server
  - Update local copy
  - Notify user with option to undo

- [x] Create user messaging:
  - Notification component for conflicts
  - "Your offline changes were overwritten..."
  - Option to restore or accept

- [x] Create unit tests:
  - Test last-write-wins logic
  - Test specific conflict scenarios
  - Test undo functionality
  - Test notification generation

**Acceptance Criteria:**
- Conflicts detected correctly
- Resolution applied consistently
- Users notified appropriately
- Undo works correctly
- No data loss
- Tests pass

**Time Estimate:** 2-3 hours

---

### Task 7.3: Create Offline Activity Operations

**Requirement:** Requirement 12

**Objective:** Implement offline activity creation and editing

**Subtasks:**

- [x] Update activity create flow:
  - Check if online
  - If offline: save to IndexedDB only
  - Add to sync queue
  - Show "Saved locally" message
  - Mark with offline indicator

- [x] Update activity edit flow:
  - Check if online
  - If offline: update IndexedDB only
  - Update sync queue entry
  - Mark as dirty for sync

- [x] Update activity delete flow:
  - Check if online
  - If offline: mark for deletion locally
  - Add delete operation to sync queue
  - Hide from UI (soft delete)

- [x] Add offline indicators:
  - Show small icon on offline activities
  - Label "Offline" or sync icon
  - Update UI when synced

- [x] Create sync process:
  - On online: process activity changes
  - Create activities on server if new
  - Update activities on server if modified
  - Remove from local if deleted
  - Clear offline indicators after sync

- [x] Create unit tests:
  - Test offline create
  - Test offline update
  - Test offline delete
  - Test indicators display
  - Test sync clears indicators

**Acceptance Criteria:**
- Activities created offline
- Activities updated offline
- Activities deleted offline
- Offline indicators display
- Sync works correctly
- No data loss

**Time Estimate:** 2-3 hours

---

### Task 7.4: Create Data Integrity Tests

**Requirement:** Requirement 17

**Objective:** Verify round-trip data integrity

**Subtasks:**

- [x] Create `__tests__/shared/lib/offline/dataIntegrity.test.ts`:
  - Test round-trip: create → IndexedDB → sync → fetch → verify
  - Test all Activity properties preserved
  - Test all Subject properties preserved
  - Test arrays preserved
  - Test dates preserved as ISO strings
  - Test nulls preserved

- [x] Implement test scenarios:
  - Activity with all properties
  - Activity with minimal properties
  - Activity with null values
  - Activity with arrays (tags)
  - Activity with dates
  - Multiple activities

- [x] Verify no data transformation:
  - No unexpected type conversions
  - No data truncation
  - No missing properties
  - No extra properties

- [x] Create property-based tests:
  - Generate random activities
  - Round-trip through sync
  - Verify properties match

**Acceptance Criteria:**
- All data preserved exactly
- No transformation or loss
- Types preserved
- Dates formatted correctly
- Tests pass with 100% coverage

**Time Estimate:** 2 hours

---

## Implementation Checklist

- [x] Phase 1: Web App Manifest & Icons (2-3 hours)
- [x] Phase 2: Service Worker - Install & Activate (4-5 hours)
- [x] Phase 3: Service Worker - Fetch & Caching (4-6 hours)
- [x] Phase 4: IndexedDB - Setup (4-5 hours)
- [x] Phase 5: IndexedDB - Sync Queue (2 hours)
- [x] Phase 6: Offline Manager & UI (6-8 hours)
- [x] Phase 7: Sync & Conflict Resolution (8-11 hours)

**Total Estimated Time:** 30-41 hours (1.5-2.5 weeks for 1 developer, 3-5 days for 2 developers)

---

## Testing Summary

### Unit Tests Required
- Service Worker caching logic
- IndexedDB CRUD operations
- Sync queue processing
- Offline state detection
- Data serialization/deserialization
- Conflict resolution logic
- Round-trip data integrity

### Integration Tests Required
- Service Worker with application fetch events
- IndexedDB with activity creation/editing
- Sync queue with API endpoints
- Offline/online transitions with UI
- Offline activity creation and sync
- Push notification subscription and delivery

### E2E Tests Required
- Complete offline workflow (create → offline → sync → verify)
- Installation prompt → install → standalone mode
- Offline access (disconnect → view data → verify)
- Conflict resolution (offline changes + server changes → sync → verify)
- Long offline period (offline 2+ hours → sync all → verify)

### Database Tests Required
- IndexedDB schema correctness
- Transaction integrity
- Index performance
- Quota management

---

## Property-Based Testing

Create property-based tests for:

1. **Property 1: Cache Versioning**
   - Any old cache must be deleted on activation
   - Any new cache must be available after install

2. **Property 2: Sync Queue FIFO**
   - Any queue entries must be processed in timestamp order
   - No entry skipped unless failed with max retries

3. **Property 3: Round-Trip Integrity**
   - Any data stored → synced → fetched must match exactly
   - All types preserved (dates, arrays, nulls)

4. **Property 4: Conflict Resolution**
   - Any conflict must apply last-write-wins consistently
   - No data lost during resolution

5. **Property 5: Offline-First Consistency**
   - Any offline change must be queued for sync
   - No offline data lost until synced

---

## Deployment & Verification

After implementation:

1. **Pre-deployment Checklist:**
   - [x] All unit tests pass (>90% coverage)
   - [x] All integration tests pass
   - [x] All E2E tests pass
   - [x] Linting passes (ESLint)
   - [x] Type checking passes (TypeScript strict)
   - [x] Service Worker tested offline
   - [x] IndexedDB tested in browsers
   - [x] Cache strategies tested
   - [x] Performance benchmarks met

2. **Deployment Steps:**
   - Deploy manifest and icons to Vercel
   - Deploy Service Worker to Vercel
   - Deploy offline-related code to Vercel
   - Monitor Service Worker updates
   - Test PWA installation on mobile

3. **Post-deployment Verification:**
   - Test full offline workflow in production
   - Verify installation works on Android/iOS/Desktop
   - Verify push notifications work
   - Monitor error rates
   - Check IndexedDB usage
   - Verify cache hits/misses
   - Test sync correctness

---

## Notes for Developers

- Service Worker updates require page reload or manual update check
- IndexedDB quota varies by browser (usually 50MB+)
- Test offline by throttling network in DevTools
- Remember to HTTPS for Service Worker (required except localhost)
- Test on actual mobile devices, not just DevTools
- Push notifications require user permission (handled by Spec 7)
- Cache versioning strategy prevents stale data
- Round-trip integrity crucial for trust in offline-first
- Conflict resolution last-write-wins keeps it simple
- Undo functionality appreciated by users but optional
