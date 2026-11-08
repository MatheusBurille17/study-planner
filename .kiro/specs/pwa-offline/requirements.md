# PWA & Offline-First Feature Requirements

## Introduction

The PWA & Offline-First feature transforms Amanda's Study Planner into a Progressive Web Application (PWA) with robust offline capabilities. This feature enables students to access their study plans anywhere, install the app on their home screen like a native app, and continue working seamlessly even without internet connectivity. The feature encompasses Service Worker caching strategies, IndexedDB for local data persistence, intelligent synchronization when connectivity is restored, and full PWA installability across devices.

## Glossary

- **Progressive Web App (PWA):** Web application with capabilities like installation, offline support, and push notifications
- **Service Worker:** Background JavaScript worker thread enabling offline functionality, caching, and push notifications
- **Offline-First:** Application designed to work primarily offline with synchronization when connectivity is available
- **Cache:** Stored copy of resources (HTML, CSS, JS, API responses) for offline access
- **Cache Strategy:** Policy determining how resources are cached and served (network-first, cache-first, stale-while-revalidate)
- **IndexedDB:** Client-side database for storing large amounts of structured data (used for offline data persistence)
- **Web App Manifest:** JSON file defining app name, icons, display mode, and theme colors
- **Installability:** Ability to install app on home screen/dock on iOS, Android, Windows, macOS, etc.
- **Synchronization (Sync):** Process of uploading local changes back to server when connectivity is restored
- **Background Sync API:** Web API enabling deferred synchronization of data to server
- **Service Worker Lifecycle:** States of Service Worker (installing, installed, activating, activated, redundant)
- **Assets:** Static resources (HTML, CSS, JS, images, fonts) that can be cached
- **API Response Cache:** Caching of dynamic data from API endpoints for offline access
- **Stale Data:** Cached data that is older than a specified TTL (Time To Live)
- **User:** Authenticated student using the application
- **VAPID Keys:** Encryption keys used for Web Push notifications
- **Push Notification:** Message sent to user's device via Web Push API
- **Notification Badge:** Icon shown in notification center for app identification
- **Installation Prompt:** Browser prompt asking user to install PWA to home screen
- **Installability Criteria:** Requirements met for PWA to be installable (manifest, Service Worker, HTTPS, etc.)
- **Offline State:** Application running without network connectivity
- **Online State:** Application running with active network connectivity
- **Sync Queue:** Queue of offline changes waiting to be synchronized when connectivity returns

## Requirements

### Requirement 1: Create Web App Manifest

**User Story:** As a student, I want to install Amanda's Study Planner as an app on my home screen, so that I can access it like a native application.

#### Acceptance Criteria

1. THE application SHALL include a `manifest.json` file in the `public/` directory
2. THE manifest.json SHALL define the following properties:
   - `name`: "Amanda's Study Planner" (full application name)
   - `short_name`: "Study Planner" (home screen display name, max 12 characters)
   - `description`: "Study planning and task management for university students"
   - `start_url`: "/" (entry point after installation)
   - `scope`: "/" (scope of PWA)
   - `display`: "standalone" (hide browser UI)
   - `theme_color`: "#3B82F6" (app header color)
   - `background_color`: "#FFFFFF" (app background color)
3. THE manifest.json SHALL include at least 2 icon definitions:
   - `192x192` icon (icon-192x192.png or similar)
   - `512x512` icon (icon-512x512.png or similar)
   - Each icon SHALL have `type`: "image/png" and `purpose`: "any"
4. THE icons SHALL be placed in the `public/icons/` directory
5. THE icons SHALL be optimized PNG files with transparent backgrounds
6. THE root `index.html` (layout.tsx) SHALL include a `<link rel="manifest" href="/manifest.json">` tag
7. THE root `index.html` SHALL include theme color meta tag: `<meta name="theme-color" content="#3B82F6">`
8. THE manifest.json SHALL be valid according to W3C PWA specification and pass PWA validator tools

#### Success Criteria

- manifest.json is properly formatted and valid JSON
- All required properties are present and correctly configured
- Icons are 192x192 and 512x512 pixels at minimum
- Icons are optimized and total size < 500KB
- manifest.json is referenced in HTML head
- PWA installation prompt appears on compatible browsers
- App installs with correct name and icon

---

### Requirement 2: Register and Activate Service Worker

**User Story:** As a system, I want to register a Service Worker to enable offline functionality, so that the app can work without network connectivity.

#### Acceptance Criteria

1. THE application SHALL include a Service Worker file at `public/service-worker.js`
2. THE Service Worker registration code SHALL be called from the main application (from a client component or layout)
3. WHEN the application loads, THE Service Worker registration SHALL attempt to register the Service Worker
4. WHEN the Service Worker successfully registers, THE console SHALL log "Service Worker registered successfully"
5. IF Service Worker registration fails, THE console SHALL log the error but not crash the application
6. WHEN a new Service Worker is deployed, THE Service Worker SHALL enter the "installing" lifecycle state
7. WHEN the Service Worker is installed, IT SHALL enter the "installed" state and wait for activation
8. WHEN the user closes all tabs/windows with the app (or manually activates), THE new Service Worker SHALL activate and become the active Service Worker
9. WHEN the Service Worker activates, IT SHALL clean up old caches from previous versions (cache versioning)
10. THE Service Worker registration code SHALL handle browser compatibility (check for `navigator.serviceWorker` support)

#### Success Criteria

- Service Worker registers successfully on browser load
- Service Worker lifecycle events (install, activate) fire correctly
- Old caches are cleaned up on new deployments
- Browser DevTools Service Worker tab shows registered worker as active
- No errors in browser console during registration
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)

---

### Requirement 3: Implement Cache Strategy for Static Assets

**User Story:** As a system, I want to cache static assets (HTML, CSS, JS) using a Cache-First strategy, so that the app loads from cache when available.

#### Acceptance Criteria

1. THE Service Worker SHALL implement a Cache-First strategy for static assets (HTML, CSS, JS, fonts, images)
2. THE Service Worker SHALL name the asset cache "assets-cache-v1" (versioned for invalidation)
3. WHEN the Service Worker installs, IT SHALL pre-cache essential assets:
   - `index.html` (root page)
   - Main application JavaScript bundles
   - CSS files
   - Font files (if applicable)
4. WHEN the browser requests a cached static asset, THE Service Worker SHALL:
   - Check if the asset exists in the assets cache
   - If cached, return the cached version immediately
   - If not cached, fetch from network, cache it, and return it
5. WHEN the network fails, THE Service Worker SHALL return cached assets if available
6. WHEN the network fails and no cached version exists, THE Service Worker SHALL return a fallback response (e.g., offline page or cached fallback)
7. WHEN a new version of the app is deployed (version change), THE old assets cache SHALL be cleaned up and replaced with new assets
8. THE cache versioning strategy SHALL use `assets-cache-v1`, `assets-cache-v2`, etc., with automatic cleanup of old versions

#### Success Criteria

- Static assets are cached and served from cache on subsequent loads
- First load fetches from network and caches assets
- Subsequent loads serve from cache when offline
- Cache is correctly versioned and old versions are cleaned up
- New app deployments update the cache with new assets
- Browser DevTools Application tab shows assets in cache

---

### Requirement 4: Implement Cache Strategy for API Responses

**User Story:** As a system, I want to cache API responses with a Stale-While-Revalidate strategy, so that the app shows cached data while fetching fresh data from the server.

#### Acceptance Criteria

1. THE Service Worker SHALL implement a Stale-While-Revalidate cache strategy for API endpoints
2. THE Service Worker SHALL name the API cache "api-cache-v1" (versioned for invalidation)
3. WHEN the browser requests an API endpoint (e.g., `/api/activities`, `/api/exams`), THE Service Worker SHALL:
   - Return the cached response immediately if available (even if stale)
   - Simultaneously fetch fresh data from the network in the background
   - Update the cache with the fresh data
4. WHEN the network request returns a response, THE Service Worker SHALL update the cache and notify the client (via message or event) that fresh data is available
5. WHEN the network fails, THE Service Worker SHALL return cached API responses if available
6. WHEN the network fails and no cached response exists, THE Service Worker SHALL return an appropriate error response (e.g., "Offline - data unavailable")
7. THE API response cache SHALL have a TTL (Time To Live) of 5 minutes before being considered "stale"
8. THE Service Worker SHALL cache responses for GET requests only (not POST, PUT, DELETE)
9. THE Service Worker SHALL include a `X-From-Cache` header in responses served from cache for debugging/transparency

#### Success Criteria

- API responses are cached and served from cache when offline
- Fresh data is fetched in background and cache is updated
- Client is notified when fresh data is available
- Cache is automatically invalidated after TTL
- Network failures return cached data instead of errors
- Cache is correctly versioned and old caches are cleaned up

---

### Requirement 5: Implement IndexedDB for Local Data Persistence

**User Story:** As a system, I want to store application data in IndexedDB, so that the app has persistent offline storage for user activities and changes.

#### Acceptance Criteria

1. THE application SHALL use IndexedDB to store the following entity types:
   - **activities** (Tasks, Exams, Assignments)
   - **subjects** (Disciplines)
   - **syncQueue** (pending changes to sync)
2. THE IndexedDB database name SHALL be "amanda_study_planner"
3. THE IndexedDB database version SHALL be 1 (incrementable for schema updates)
4. THE IndexedDB database SHALL include object stores for:
   - `activities`: Stores Activity objects with keyPath `id`
   - `subjects`: Stores Subject objects with keyPath `id`
   - `syncQueue`: Stores pending synchronization tasks with keyPath `id` and indexed by `status` and `timestamp`
5. WHEN data is fetched from the server, THE data SHALL be stored in IndexedDB for offline access
6. WHEN the application is offline, THE application SHALL query IndexedDB instead of making network requests
7. THE IndexedDB store for `activities` SHALL include indexes for:
   - `userId` (for user-specific queries)
   - `status` (for filtering by status)
   - `dueDate` (for sorting by due date)
8. THE IndexedDB store for `subjects` SHALL include an index for `userId`
9. WHEN data is updated in IndexedDB, THE update SHALL not block the UI thread (use transactions correctly)
10. THE IndexedDB implementation SHALL handle quota errors gracefully and inform the user if storage is full

#### Success Criteria

- IndexedDB database creates successfully on first load
- All entity types are stored with correct schema
- Offline queries return data from IndexedDB
- Index queries perform efficiently
- No UI blocking during IndexedDB operations
- Storage quota errors are handled appropriately

---

### Requirement 6: Synchronize Offline Changes When Connectivity Restored

**User Story:** As a student, I want my offline changes to be automatically synchronized to the server when connectivity is restored, so that my changes are not lost and stay in sync across devices.

#### Acceptance Criteria

1. WHEN a user creates, updates, or deletes an Activity while offline, THE change SHALL be added to the `syncQueue` in IndexedDB
2. THE sync queue entry SHALL include: `id` (unique), `operation` (create/update/delete), `entityType` (activity/subject), `entityData` (the data), `timestamp`, `status` (pending/syncing/failed)
3. WHEN the application detects that connectivity is restored (online event), THE application SHALL automatically begin synchronizing the sync queue
4. WHEN synchronizing, THE application SHALL process sync queue entries one at a time in FIFO order (oldest first)
5. FOR each sync queue entry, THE application SHALL:
   - Change status to "syncing"
   - Attempt to send the change to the server via API
   - If successful, mark the entry as "synced" and remove it from the queue
   - If failed, keep the entry in the queue, mark as "failed", and stop processing further entries
6. WHEN a sync operation fails, THE application SHALL retry the failed operation after 30 seconds, up to 3 times total
7. WHEN all retries fail, THE application SHALL display a notification to the user: "Unable to sync your changes. Please check your connection or contact support."
8. WHEN all sync queue entries are successfully synced, THE application SHALL display a subtle notification: "Changes synced successfully"
9. THE sync queue SHALL persist across browser sessions (stored in IndexedDB)
10. WHEN a user manually refreshes or reopens the app, THE sync queue SHALL continue processing from where it left off

#### Success Criteria

- Offline changes are captured in sync queue
- Sync queue is persisted in IndexedDB
- Changes are automatically synced when connectivity is restored
- Sync processes entries in correct order (FIFO)
- Retry logic works up to 3 attempts
- User is notified of sync status
- Sync queue survives browser closes and reopens

---

### Requirement 7: Display Offline Mode Indicator

**User Story:** As a student, I want to see a clear indicator when I'm offline, so that I understand when my changes might not be synchronized immediately.

#### Acceptance Criteria

1. WHEN the application detects offline state, THE application SHALL display an offline indicator banner at the top of the page
2. THE offline indicator SHALL display: "📡 Offline - Changes will sync when you're back online"
3. THE offline indicator background SHALL use a warning color (orange or amber) to be distinct but not alarming
4. THE offline indicator SHALL include a close button (X) allowing the user to dismiss it temporarily
5. WHEN connectivity is restored, THE offline indicator SHALL automatically disappear
6. WHEN the user is offline and makes changes, THE offline indicator SHALL update to show: "📡 Offline - You have X pending changes"
7. THE pending changes count SHALL update in real-time as the user makes more changes
8. WHEN sync begins after connectivity is restored, THE offline indicator SHALL change to: "📡 Syncing your changes..."
9. WHEN sync completes successfully, THE offline indicator SHALL show: "✓ All changes synced" for 3 seconds then disappear
10. WHEN sync fails, THE offline indicator SHALL show: "⚠️ Failed to sync. Retrying..." with a manual retry button

#### Success Criteria

- Offline indicator displays when offline
- Indicator displays correct status messages
- Indicator auto-dismisses when online
- Pending changes count is accurate
- Sync status transitions display correctly
- User can manually retry failed syncs
- Indicator is not intrusive but clearly visible

---

### Requirement 8: Implement Smart Offline/Online Detection

**User Story:** As a system, I want to accurately detect when the app goes offline and online, so that I can trigger appropriate sync and cache strategies.

#### Acceptance Criteria

1. THE application SHALL use the `navigator.onLine` property as the primary indicator of network state
2. THE application SHALL listen to the `online` and `offline` events on the window object
3. WHEN the `offline` event fires, THE application SHALL:
   - Set internal offline flag to true
   - Display offline indicator banner
   - Stop attempting to make network requests
   - Switch to serving cached/local data
4. WHEN the `online` event fires, THE application SHALL:
   - Set offline flag to false
   - Hide offline indicator banner
   - Attempt to sync pending changes
   - Refresh critical data from the server
5. THE offline detection SHALL use a debounce of 500ms to avoid rapid state flipping due to network fluctuations
6. THE application SHALL periodically verify connectivity with a lightweight network test (e.g., HEAD request to `/health` endpoint) every 30 seconds when offline
7. WHEN the health check succeeds while marked offline, THE application SHALL consider it back online and trigger sync
8. WHEN the health check fails while marked online, THE application SHALL consider it offline
9. THE offline state SHALL be made available to all components via a context or state management mechanism

#### Success Criteria

- Offline state is accurately detected
- Online state is accurately detected
- Rapid flipping between states is debounced
- Health check verifies connectivity periodically
- All components can access current offline state
- No false positives or negatives in state detection

---

### Requirement 9: Implement Installation Prompt and App Installation

**User Story:** As a student, I want to install Amanda's Study Planner on my home screen, so that I can access it like a native app on my phone and desktop.

#### Acceptance Criteria

1. WHEN the PWA installability criteria are met (manifest valid, Service Worker active, HTTPS, etc.), THE browser SHALL trigger the `beforeinstallprompt` event
2. THE application SHALL listen to the `beforeinstallprompt` event and store the event object for later use
3. THE application SHALL display an "Install App" button or banner when the install prompt is available
4. WHEN the user clicks the "Install App" button, THE application SHALL call `event.prompt()` to show the native install dialog
5. WHEN the user confirms installation in the native dialog, THE application SHALL listen to the `appinstalled` event
6. AFTER installation completes, THE application SHALL hide the "Install App" button and optionally show a "Thanks for installing!" message
7. THE installed app SHALL launch with `display: "standalone"` mode (no browser UI)
8. THE installed app SHALL show the app name and icon as defined in manifest.json
9. THE installed app launcher icon SHALL be 192x192 or 512x512 pixels (as specified in manifest)
10. ON iOS, the application SHALL include a fallback add-to-home-screen banner since `beforeinstallprompt` is not supported, with instructions to tap Share and "Add to Home Screen"

#### Success Criteria

- Install prompt appears when installability criteria are met
- User can click install button to trigger native install dialog
- App installs with correct name and icon
- Installed app runs in standalone mode
- Installation works on iOS (with manual instructions)
- Installation works on Android (with prompt)
- Installation works on desktop (Windows, macOS)

---

### Requirement 10: Implement Offline Fallback Pages

**User Story:** As a system, I want to show appropriate fallback pages when offline, so that users understand what they can and cannot do without connectivity.

#### Acceptance Criteria

1. WHEN the user navigates to a page that requires network connectivity while offline, THE application SHALL display an offline fallback page
2. THE offline fallback page SHALL include:
   - A message: "You're offline and cannot access this page right now"
   - A list of what IS available offline (dashboard with cached data, activities list with cached activities)
   - A list of what IS NOT available offline (sync operations, new creation without cache)
   - A "Try Again" button to retry the page load
   - A "Go to Dashboard" button to return to the cached dashboard
3. WHEN the user is offline but the requested page has cached data, THE application SHALL display the cached version with a subtle "Offline - cached data" indicator
4. WHEN the user attempts to create a new Activity while offline, THE application SHALL show a confirmation dialog: "You're offline. This will be saved locally and synced when you're back online. Continue?" with OK/Cancel buttons
5. WHEN the user confirms, THE Activity SHALL be saved to IndexedDB and sync queue, and a success message displayed: "Saved locally - will sync when online"
6. WHEN the user attempts to delete an Activity while offline, THE application SHALL show a similar confirmation dialog before proceeding
7. THE offline fallback UI SHALL be simple and not require any resource that is not already cached

#### Success Criteria

- Offline fallback pages display appropriate messages
- Users understand what is and isn't available offline
- Retry mechanism works when connectivity is restored
- Local creation works and displays confirmation messages
- Fallback pages do not require uncached resources
- User can easily navigate back to available content

---

### Requirement 11: Implement Background Sync for Push Notifications

**User Story:** As a system, I want to subscribe users to push notifications for reminders, so that users receive alerts even when the browser is closed.

#### Acceptance Criteria

1. THE application SHALL implement Web Push API for receiving push notifications
2. THE application SHALL use VAPID (Voluntary Application Server Identification) keys for push authentication
3. THE VAPID keys SHALL be generated and stored securely in environment variables (public key on client, private key on server only)
4. WHEN a user first loads the app, THE application SHALL request permission to show notifications (if not already granted)
5. WHEN the user grants notification permission, THE Service Worker SHALL subscribe to push notifications by calling `registration.pushManager.subscribe()`
6. WHEN subscribing, THE Service Worker SHALL send the subscription endpoint and keys to the server to store in the database
7. THE application SHALL store push subscription info in a `notification_subscriptions` table (or similar) with columns: `userId`, `endpoint`, `p256dh`, `auth`, `created_at`
8. WHEN the server needs to send a reminder, IT SHALL retrieve the user's subscription from the database and send a Web Push message using the VAPID keys
9. WHEN a push message arrives, THE Service Worker SHALL listen to the `push` event and display a notification using `registration.showNotification()`
10. WHEN the user clicks the notification, THE Service Worker SHALL listen to the `notificationclick` event and navigate to the relevant page (e.g., activity details)

#### Success Criteria

- VAPID keys are properly generated and secured
- Push subscriptions are created and stored server-side
- Users see notification permission prompt
- Push notifications are received and displayed
- Clicking notifications navigates to correct page
- Notifications work even when browser is closed
- Push messages are encrypted and secure

---

### Requirement 12: Implement Offline-Capable Activity Creation

**User Story:** As a student, I want to create activities while offline, so that I don't lose work if my connection drops.

#### Acceptance Criteria

1. WHEN a user creates an Activity (Task, Exam, or Assignment) while offline, THE form submission SHALL:
   - Validate the input locally (using same validation rules as online)
   - If validation fails, display error and do not save
   - If validation passes, save to IndexedDB
2. WHEN an Activity is saved offline, THE application SHALL:
   - Add it to the `activities` table in IndexedDB with a `synced: false` flag
   - Add an entry to the `syncQueue` with operation: "create"
   - Display a success message: "Activity saved locally - will sync when online"
3. WHEN offline activities are displayed in the Activities List or Dashboard, THEY SHALL show a subtle indicator (e.g., small sync icon or "offline" badge) to distinguish them from server-synced activities
4. WHEN the user edits an offline-created Activity, THE edits SHALL be saved to IndexedDB and marked for sync
5. WHEN connectivity is restored, THE offline Activity SHALL be synced to the server with proper conflict resolution:
   - If the server already has an activity with the same ID (unlikely but possible), use server version
   - If the server doesn't have it, create it on the server
   - After sync, update the `synced: true` flag and remove from sync queue
6. AFTER an offline-created Activity is synced to the server, IT SHALL no longer display the offline indicator
7. IF the user deletes an offline-created Activity before sync, IT SHALL not attempt to delete on the server (no deletion record sent)

#### Success Criteria

- Activities can be created offline with validation
- Offline activities are saved to IndexedDB
- Offline indicator displays on offline activities
- Offline activities sync correctly when online
- Edits to offline activities are persisted
- Deletion of unsync'd offline activities works correctly
- No data loss or duplication occurs

---

### Requirement 13: Implement Read-Only Mode for Certain Features Offline

**User Story:** As a system, I want to disable certain features when offline, so that users understand what requires network connectivity.

#### Acceptance Criteria

1. WHEN the application is offline, THE following features SHALL be disabled:
   - **Subject/Discipline creation** (read-only access to existing subjects)
   - **Notification subscription changes** (read-only access to notification settings)
   - **Profile/Settings changes** (read-only access to settings)
2. WHEN a user attempts to use a disabled feature while offline, THE application SHALL display a tooltip or message: "This feature requires an internet connection"
3. WHEN the application is offline, THE following features SHALL be enabled (with local sync):
   - **Activity creation/editing/deletion** (Tasks, Exams, Assignments)
   - **Activity status changes** (mark as completed, change priority)
   - **Dashboard/Calendar viewing** (cached data)
   - **Activities List viewing** (cached data)
4. WHEN a disabled feature becomes enabled (after going online), THE UI controls SHALL be re-enabled automatically
5. THE offline state and feature availability SHALL be clearly communicated to the user

#### Success Criteria

- Disabled features show appropriate messages
- Users cannot accidentally perform offline-unsupported operations
- Enabled features work seamlessly offline
- Feature availability updates when connectivity changes
- Clear indication of what works offline and what doesn't

---

### Requirement 14: Implement Offline Performance Optimization

**User Story:** As a system, I want the offline app to perform efficiently, so that users have a smooth experience even with limited local resources.

#### Acceptance Criteria

1. THE offline app initialization (Service Worker activation and IndexedDB setup) SHALL take less than 1 second
2. WHEN querying IndexedDB for activities, THE query SHALL complete in less than 200ms for a typical user (< 500 activities)
3. WHEN displaying cached data from IndexedDB, THE UI SHALL render within 1 second
4. THE IndexedDB storage usage SHALL not exceed 10MB for typical user data (activities, subjects, sync queue)
5. WHEN the app is offline, THE background sync process SHALL not drain battery excessively (use efficient sleep/wake patterns)
6. THE Service Worker cache size SHALL not exceed 50MB for static assets and API responses
7. WHEN the app goes offline, THE initial load of cached Dashboard data SHALL be instant (no noticeable delay)
8. THE sync queue processing SHALL be optimized to batch changes where possible (e.g., multiple activity updates in one request if supported by API)

#### Success Criteria

- Service Worker activates quickly
- IndexedDB queries are fast (< 200ms)
- UI renders quickly from cache
- Storage usage stays within reasonable limits
- Battery drain is minimal
- Cache size is manageable
- Initial offline load is instant
- Sync is efficient and batched

---

### Requirement 15: Implement Cache Invalidation and Update Strategy

**User Story:** As a system, I want to ensure that cached data is updated appropriately, so that users always have timely information.

#### Acceptance Criteria

1. THE application SHALL implement versioned caches: `assets-cache-v1`, `api-cache-v1`, etc.
2. WHEN a new version of the app is deployed, THE Service Worker SHALL automatically update the version number in cache names
3. WHEN the Service Worker activates with a new version, IT SHALL delete all old versioned caches (e.g., delete `assets-cache-v1` if new version is `v2`)
4. THE API response cache SHALL have a TTL (Time To Live) of 5 minutes for most endpoints
5. WHEN the TTL expires, THE cached response SHALL be considered "stale" and a fresh response SHALL be fetched on next request
6. WHEN the user manually refreshes the page, THE application SHALL bypass the API cache and fetch fresh data from the server
7. WHEN the app detects that it has been offline for more than 1 hour, IT SHALL clear the cache on next online connection and fetch fresh data
8. THE cache invalidation strategy SHALL prioritize data freshness over responsiveness (users are willing to wait for fresh data)

#### Success Criteria

- Caches are versioned and old versions cleaned up
- Cache TTL works as expected
- Manual refresh bypasses cache
- Long offline periods trigger cache refresh
- Data freshness is prioritized
- Users get appropriate data at all times

---

### Requirement 16: Implement Offline Data Conflict Resolution

**User Story:** As a system, I want to resolve conflicts when offline changes conflict with server changes, so that data consistency is maintained.

#### Acceptance Criteria

1. WHEN a user makes offline changes to an Activity and the server version has been updated by another device or browser, THE sync operation SHALL detect the conflict
2. THE conflict detection SHALL compare the `updatedAt` timestamp of the local version and server version
3. WHEN a conflict is detected, THE application SHALL use the "last-write-wins" strategy: server version takes precedence (user is shown a notification)
4. THE notification SHALL inform the user: "Your offline changes to [Activity Title] were overwritten by updates from another device. The latest version is displayed now."
5. THE user SHALL have an option to restore their offline changes if desired (undo)
6. WHEN a user deletes an Activity offline and the Activity is updated on the server, THE deletion SHALL not be applied (conflict resolution: keep server version)
7. WHEN a user creates an Activity offline with a specific ID and the server has a different Activity with that ID, THE client-generated ID SHALL be discarded and the Activity SHALL be re-created with a server-assigned ID

#### Success Criteria

- Conflicts are detected correctly
- Last-write-wins strategy is applied consistently
- Users are notified of conflicts
- Data consistency is maintained
- No data duplication occurs
- Undo functionality allows users to restore their changes if needed

---

### Requirement 17: Implement IndexedDB to API Round-Trip Integrity

**User Story:** As a system, I want to ensure that data stored in IndexedDB and synced to the API maintains integrity, so that no data is lost or corrupted.

#### Acceptance Criteria

1. FOR all Activities stored in IndexedDB and later synced to the server, WHEN the data is stored locally, synced to server, and re-fetched from server, THE original and re-fetched data SHALL match exactly (excluding generated server fields like `id` if client-generated)
2. FOR an Activity with all properties (title, description, dueDate, priority, status, estimatedTimeMinutes, tags), WHEN stored in IndexedDB, synced, and re-fetched, ALL properties SHALL match exactly
3. FOR Activities with array properties (tags), WHEN stored in IndexedDB with arrays, synced, and re-fetched, THE arrays SHALL have the same items in the same order
4. FOR Activities with date properties (dueDate, createdAt, updatedAt), WHEN stored as ISO strings in IndexedDB and synced, THE ISO format SHALL be preserved exactly
5. FOR Activities with null/undefined values, WHEN stored in IndexedDB and synced, THE null/undefined values SHALL be preserved (not converted to empty strings or 0)
6. THE round-trip test SHALL verify that no data transformation or loss occurs during the store → sync → fetch cycle

#### Success Criteria

- Round-trip data integrity is verified in tests
- No data is lost during sync
- Data types are preserved (dates, arrays, nulls)
- Data format is preserved (ISO dates, JSON structure)
- All properties are correctly stored and retrieved

---

### Requirement 18: Implement Service Worker Lifecycle Handling

**User Story:** As a system, I want to properly manage Service Worker lifecycle, so that updates are seamlessly deployed without breaking the app.

#### Acceptance Criteria

1. WHEN a new Service Worker is registered, IT SHALL fire the `install` event
2. DURING the `install` event, THE Service Worker SHALL pre-cache essential static assets (HTML, CSS, JS bundles)
3. AFTER installing, THE Service Worker SHALL fire the `activate` event when it becomes the active worker
4. DURING the `activate` event, THE Service Worker SHALL clean up old caches (delete caches with old version numbers)
5. WHEN a new Service Worker is deployed and detected, THE application SHALL NOT automatically refresh the page
6. WHEN a new Service Worker is waiting to activate, THE application SHALL notify the user: "A new version of the app is available. Refresh to update."
7. WHEN the user refreshes or reopens the app, THE new Service Worker SHALL activate and new app version shall load
8. DURING the transition from old to new Service Worker, THE application SHALL handle version mismatches gracefully (no crashes)
9. THE Service Worker update check SHALL happen at least once per day automatically

#### Success Criteria

- Service Worker installs correctly
- Caches are pre-populated during install
- Old caches are cleaned up during activate
- Update notifications display to users
- New versions activate correctly
- No crashes during version transitions
- Users are prompted to update

---

### Requirement 19: Implement Service Worker Error Handling

**User Story:** As a system, I want to handle Service Worker errors gracefully, so that failures do not break the app.

#### Acceptance Criteria

1. WHEN a Service Worker registration fails, THE error SHALL be caught and logged, but the app SHALL continue to function (graceful degradation)
2. WHEN a Service Worker throws an uncaught error, IT SHALL be caught in the error handler and logged for debugging
3. WHEN a fetch event handler throws an error, THE Service Worker SHALL return an appropriate fallback response (cached, offline page, or error response)
4. WHEN IndexedDB operations fail (quota exceeded, transaction error), THE application SHALL:
   - Log the error
   - Notify the user: "Local storage is full or unavailable"
   - Attempt to fall back to in-memory caching
5. WHEN cache operations fail (quota exceeded), THE Service Worker SHALL delete least-recently-used cache entries and retry
6. WHEN a sync operation encounters a network error, THE application SHALL retry up to 3 times with exponential backoff (30s, 60s, 120s)
7. ALL errors SHALL be logged with sufficient context for debugging (timestamp, action, error message, stack trace)
8. ERROR logs SHALL NOT contain sensitive user data (passwords, tokens, personal information)

#### Success Criteria

- Service Worker errors do not crash the app
- Errors are logged appropriately
- Fallback mechanisms work correctly
- Quota errors are handled gracefully
- Retry logic functions properly
- Errors are logged without sensitive data

---

### Requirement 20: Implement Notification Permission Handling

**User Story:** As a system, I want to handle notification permissions appropriately, so that users are not spammed with permission prompts.

#### Acceptance Criteria

1. WHEN the user first loads the app, THE application SHALL request notification permission (unless already granted or denied)
2. IF the user denies notification permission, THE application SHALL not ask again for at least 30 days
3. IF the user grants notification permission, THE Service Worker SHALL subscribe to push notifications and store the subscription server-side
4. WHEN the user revokes notification permission in browser settings, THE application SHALL detect this and delete the stored subscription from the database
5. THE notification permission prompt SHALL be user-friendly: "Stay updated with reminders for your exams and assignments"
6. WHEN a user has not granted notification permission, THE application SHALL offer a Settings option to request permission later
7. WHEN push notifications are sent, THEY SHALL include: title, body, icon (app icon), badge, and tag (for grouping)
8. WHEN a notification is clicked, THE Service Worker SHALL navigate the user to the relevant page (activity details, calendar, etc.)

#### Success Criteria

- Notification permission prompt shows once and respects user choice
- Users can opt-in/opt-out from Settings
- Push subscriptions are managed correctly
- Notifications are formatted appropriately
- Clicking notifications navigates correctly
- No excessive permission prompts

---

## Dependencies

### Spec 1: Authentication & User Management (auth-setup)
- **Dependency:** User must be authenticated to use offline features (offline data is user-specific)
- **Impact:** PWA must check authentication before caching user data to IndexedDB
- **Status:** REQUIRED - Must be completed before PWA implementation

### Spec 2-5: Core Features (Activity Creation, CRUD, List, Calendar, Dashboard)
- **Dependency:** PWA caches and syncs data from these features
- **Impact:** PWA must work with Activity, Exam, Assignment, and Subject data models
- **Data Requirements:** Must cache all activity types and their properties
- **Status:** REQUIRED - Must be completed before PWA implementation

### Spec 6: Notifications & Reminders
- **Dependency:** PWA push notifications are built on Notifications & Reminders feature
- **Impact:** Push notification subscriptions and reminder triggers work together
- **Data Requirements:** Push subscriptions must be stored and managed by both features
- **Status:** REQUIRED - Must be completed before PWA implementation

### Notifications to System
- PWA feature enables offline-first synchronization across all dependent features
- PWA enables push notifications for all reminder-based features
- PWA enables installation and home screen access

---

## Data Requirements

### Service Worker Data
- Service Worker file location: `public/service-worker.js`
- Cache storage: Browser Cache API (persistent, not quota-limited like localStorage)
- IndexedDB database: `amanda_study_planner`
- Sync queue: Stored in IndexedDB under `syncQueue` object store

### IndexedDB Schema

#### Database: `amanda_study_planner` (version: 1)

**Object Store: `activities`**
- keyPath: `id`
- Indexes:
  - `userId`: Non-unique index on `userId` (for user-specific queries)
  - `status`: Non-unique index on `status` (for status filtering)
  - `dueDate`: Non-unique index on `dueDate` (for date sorting)
  - `synced`: Non-unique index on `synced` (for sync filtering)

**Object Store: `subjects`**
- keyPath: `id`
- Indexes:
  - `userId`: Non-unique index on `userId`

**Object Store: `syncQueue`**
- keyPath: `id`
- Indexes:
  - `userId`: Non-unique index on `userId`
  - `status`: Non-unique index on `status` (pending, syncing, failed)
  - `timestamp`: Non-unique index on `timestamp` (for FIFO processing)

### Web App Manifest Data

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
  ]
}
```

### Server Data for Subscriptions

**Table: `notification_subscriptions`**
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to users)
- `endpoint`: Text (Web Push endpoint)
- `p256dh`: Text (VAPID key)
- `auth`: Text (VAPID key)
- `isActive`: Boolean
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

---

## Performance Targets

- Service Worker registration: < 1 second
- IndexedDB queries: < 200ms for typical user data
- Cache hits (assets): < 100ms
- Offline Dashboard load: < 1 second
- Sync operation: < 5 seconds per activity change
- App installation: < 30 seconds from click to installation
- Background sync retry interval: 30s, 60s, 120s (exponential backoff)

---

## Offline-First Capabilities

### Fully Functional Offline
- View Dashboard (cached data)
- View Activities List (cached activities and subjects)
- View Calendar (cached events)
- Create/Edit/Delete Activities (saved to IndexedDB, queued for sync)
- Mark Activities as completed (saved locally, synced later)
- Change Activity priority (saved locally, synced later)

### Read-Only or Limited Offline
- View Subjects/Disciplines (cached, cannot create)
- View Notification Settings (cached, cannot change)
- View Profile/Settings (cached, cannot change)
- Search/Filter Activities (on cached data only)

### Not Available Offline
- Sync queue status monitoring (visible but cannot force sync)
- Real-time data (no Supabase real-time subscriptions while offline)
- Push notification subscription changes
- User profile updates

---

## Security & Privacy Considerations

### Data Security
- All data stored in IndexedDB remains on user's device (not transmitted)
- Service Worker cache is browser-local and inaccessible to other sites (same-origin policy)
- Sync operations must use HTTPS and proper authentication tokens
- VAPID keys must be securely stored (public key on client, private key on server only)

### User Privacy
- Users must explicitly grant notification permissions
- Notification subscriptions must be manageable (opt-out available)
- Offline data must be cleared when user logs out
- No tracking or telemetry through Service Worker

### Offline Data Handling
- Offline changes must be associated with user (cannot sync to wrong user account)
- Sync must not process stale changes (use timestamps for conflict resolution)
- Cache invalidation must not leak data to other users (private browsing)

---

## Success Metrics

- PWA installation prompt appears on 95%+ of compatible browsers
- 60%+ of users install the app on home screen (within 30 days)
- Offline functionality works on 100% of attempted offline scenarios
- Sync queue accuracy: 100% (no lost changes, no duplicates)
- Mean time to sync after connectivity restoration: < 5 seconds
- User satisfaction with offline experience: > 4.0/5.0 stars
- Background sync success rate: > 99% (retries succeed)
- Battery drain increase from PWA features: < 5% compared to regular web app
- Cache storage efficiency: Total cache size < 50MB for typical user
- Zero data loss or corruption from offline/online transitions

---

## Testing Strategy

### Unit Tests
- Service Worker caching logic
- IndexedDB CRUD operations
- Sync queue processing logic
- Offline detection and state transitions
- Data serialization/deserialization (round-trip)

### Integration Tests
- Service Worker with application fetch events
- IndexedDB with application data flows
- Sync queue with API endpoints
- Push notification subscription and delivery
- Offline/online state with UI updates

### E2E Tests
- Complete offline workflow: create activity → offline → sync → verify server
- Installation prompt → install → standalone mode verification
- Offline access: close connection → view dashboard → verify cached data
- Conflict resolution: offline changes → server changes → sync → verify outcome
- Long offline period: offline for 2+ hours → sync all changes → verify consistency

### Property-Based Tests
- Round-trip integrity: all data types and structures preserve through store → sync → fetch
- Sync queue FIFO ordering: entries processed in correct order
- Cache versioning: old caches deleted, new caches available
- Quota management: cache size stays within limits

