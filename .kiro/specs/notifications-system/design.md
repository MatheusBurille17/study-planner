# Notificações & Lembretes - Design

## Overview

The notifications system is a comprehensive, backend-driven reminders engine that sends Web Push notifications to users at precisely scheduled times. The system integrates tightly with the Activities feature (tasks, exams, assignments) and uses a Supabase Edge Function with CRON scheduling to execute a batch reminder processor every 5 minutes.

### Core Responsibilities
1. Manage user subscriptions to Web Push notifications
2. Handle browser permission states and graceful fallbacks
3. Store and enforce user notification preferences
4. Schedule reminders based on activity types and user preferences
5. Send notifications via Web Push API using VAPID
6. Log all notification delivery for audit and monitoring
7. Support multi-device subscription synchronization
8. Implement retry logic for failed notifications
9. Provide customizable notification preferences per user
10. Format notification messages consistently in Portuguese (BR)

---

## Architecture

### System Flow

```
User Creates Activity
    ↓
Activity Stored in DB (with scheduled_reminder_time calculated)
    ↓
Edge Function CRON Runs Every 5 Minutes
    ↓
Query Activities with reminders due NOW (within 5-min window)
    ↓
Fetch Active Subscriptions for Each User
    ↓
Check User Preferences (enabled type? quiet hours? email?)
    ↓
Send Via Web Push API (with VAPID signing)
    ↓
Log Delivery Attempt
    ↓
On Failure: Queue for Retry (exponential backoff)
    ↓
User Clicks Notification → Service Worker Handles notificationclick Event → Opens App
```

### Component Architecture

```
FRONTEND
├── Components
│   ├── NotificationPermissionPrompt (banner/modal)
│   ├── NotificationSettings (preferences UI)
│   ├── OfflineIndicator (network status)
│   └── NotificationCenter (status display)
├── Service Worker (push event handler)
├── Server Actions
│   ├── subscribeToNotifications (push subscription)
│   ├── unsubscribeFromNotifications (revoke)
│   ├── updateNotificationPreferences (settings)
│   └── sendTestNotification (immediate test)
└── Hooks
    └── useNotifications (permission state, subscription status)

BACKEND (Supabase)
├── Edge Function: send-reminders
│   ├── Query reminders due now
│   ├── Fetch subscriptions & preferences
│   ├── Send via Web Push API
│   ├── Log delivery
│   └── Handle retries
├── Database Tables
│   ├── push_subscriptions (user endpoints)
│   ├── notification_preferences (settings)
│   ├── notification_logs (audit trail)
│   ├── notification_delivery_log (retry tracking)
│   └── notification_clicks (engagement)
└── Policies (RLS)
    ├── Users see only their subscriptions
    ├── Users see only their preferences
    └── Admins see all logs
```

---

## Data Models

### Push Subscription Schema

```typescript
// Table: push_subscriptions
{
  id: UUID (primary key)
  user_id: UUID (foreign key, RLS)
  endpoint: string (unique per device)
  p256dh: string (VAPID public key)
  auth: string (VAPID auth secret)
  is_active: boolean (default: true)
  device_info?: {
    browser: string
    os: string
    userAgent: string
  }
  created_at: timestamp
  updated_at: timestamp
}

Indexes:
  - (user_id, is_active) for finding active subscriptions
  - (endpoint) for deduplication
  - created_at for cleanup jobs
```

### Notification Preferences Schema

```typescript
// Table: notification_preferences
{
  id: UUID (primary key)
  user_id: UUID (foreign key, RLS, unique)
  reminders_enabled: boolean (default: true)
  exams_enabled: boolean (default: true)
  assignments_enabled: boolean (default: true)
  tasks_enabled: boolean (default: true)
  task_reminders_hours: integer (0-6, default: 3)
  quiet_hours_start: string (HH:mm, default: "22:00")
  quiet_hours_end: string (HH:mm, default: "08:00")
  sound_enabled: boolean (default: true)
  vibration_enabled: boolean (default: true)
  updated_at: timestamp
}

Indexes:
  - (user_id) for quick lookup
```

### Notification Log Schema

```typescript
// Table: notification_logs (audit trail)
{
  id: UUID (primary key)
  user_id: UUID (foreign key)
  subscription_id: UUID (foreign key)
  activity_id: UUID (foreign key to activities)
  activity_type: enum ("exam" | "assignment" | "task")
  title: string
  body: string
  sent_at: timestamp
  status: enum ("success" | "failed" | "retrying")
  error?: string
  device_info?: JSON (browser, OS)
  created_at: timestamp
}

Indexes:
  - (user_id, sent_at) for user history
  - (created_at) for retention cleanup
  - (status) for monitoring queries
```

### Notification Delivery Log (Retry Tracking)

```typescript
// Table: notification_delivery_log
{
  id: UUID (primary key)
  notification_id: UUID (foreign key to notification_logs)
  user_id: UUID
  subscription_id: UUID
  attempt: integer (1-4)
  status: enum ("pending" | "success" | "failed")
  error_code?: integer (HTTP status)
  error_message?: string
  next_retry_at?: timestamp (for exponential backoff)
  created_at: timestamp
}

Indexes:
  - (next_retry_at) for finding retries to process
  - (subscription_id) for cleanup
```

### Notification Clicks (Engagement)

```typescript
// Table: notification_clicks
{
  id: UUID (primary key)
  notification_id: UUID (foreign key)
  user_id: UUID
  clicked_at: timestamp
  referrer?: string
  created_at: timestamp
}

Indexes:
  - (user_id, clicked_at) for engagement metrics
  - (created_at) for retention cleanup
```

---

## Components and Interfaces

### 1. Frontend Components

#### NotificationPermissionPrompt
- **Location:** `src/features/notifications/presentation/components/NotificationPermissionPrompt.tsx`
- **Responsibility:** Request browser permission, show status, handle user response
- **Props:**
  ```typescript
  interface NotificationPermissionPromptProps {
    onPermissionGranted?: () => void
    onPermissionDenied?: () => void
    dismissible?: boolean
  }
  ```
- **Behavior:**
  - Show banner/modal on first app load (check `localStorage.hasSeenNotificationPrompt`)
  - Display "Permitir", "Agora Não", "Nunca" buttons
  - Call `Notification.requestPermission()` on "Permitir"
  - Store user choice in localStorage
  - Re-ask after 7 days if "Agora Não"
  - Never ask again if "Nunca"

#### NotificationSettings
- **Location:** `src/features/notifications/presentation/components/NotificationSettings.tsx`
- **Responsibility:** Allow users to customize preferences
- **UI Elements:**
  - Status display (Ativo/Desabilitado/Bloqueado)
  - Toggles for exam/assignment/task reminders
  - Slider for task reminder hours (0-6)
  - Time pickers for quiet hours (start/end)
  - Sound toggle
  - Vibration toggle
  - "Enviar Notificação de Teste" button
  - "Desabilitar Notificações" button
  - Preview of current settings
  - List of active subscriptions (devices)

#### OfflineIndicator
- **Location:** `src/shared/components/OfflineIndicator.tsx`
- **Responsibility:** Show network status
- **UI:** Small indicator showing "Online" or "Offline" with icon color

### 2. Server Actions

#### subscribeToNotifications
- **Location:** `src/features/notifications/presentation/actions/subscribeToNotifications.ts`
- **Input:**
  ```typescript
  {
    subscription: {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }
  }
  ```
- **Output:**
  ```typescript
  {
    success: boolean
    error?: string
    subscriptionId?: string
  }
  ```
- **Logic:**
  - Validate subscription object
  - Check if subscription exists (by endpoint)
  - If exists: update, if not: create
  - Validate VAPID keys format
  - Store in Supabase
  - Return success/error

#### unsubscribeFromNotifications
- **Location:** `src/features/notifications/presentation/actions/unsubscribeFromNotifications.ts`
- **Output:**
  ```typescript
  {
    success: boolean
    error?: string
  }
  ```
- **Logic:**
  - Mark subscription as inactive (`is_active = false`)
  - Keep for audit trail
  - Return success

#### updateNotificationPreferences
- **Location:** `src/features/notifications/presentation/actions/updateNotificationPreferences.ts`
- **Input:**
  ```typescript
  {
    remindersEnabled?: boolean
    examsEnabled?: boolean
    assignmentsEnabled?: boolean
    tasksEnabled?: boolean
    taskRemindersHours?: number
    quietHoursStart?: string
    quietHoursEnd?: string
    soundEnabled?: boolean
    vibrationEnabled?: boolean
  }
  ```
- **Logic:**
  - Validate all fields with Zod schema
  - Update or create preferences record
  - Return updated preferences

#### sendTestNotification
- **Location:** `src/features/notifications/presentation/actions/sendTestNotification.ts`
- **Output:**
  ```typescript
  {
    success: boolean
    error?: string
  }
  ```
- **Logic:**
  - Get user's active subscription
  - Create test notification payload
  - Call Web Push API immediately (not through Edge Function)
  - Log the test send
  - Return success/error

### 3. Service Worker

#### Push Event Handler
- **Location:** `public/service-worker.js`
- **Logic:**
  ```javascript
  self.addEventListener('push', (event) => {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      tag: data.tag || 'notification',
      data: data.data || {},
      badge: '/icons/badge-72x72.png'
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  })
  ```

#### Notification Click Handler
- **Logic:**
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
        if (clients.openWindow)
          return clients.openWindow(path)
      })
    )
  })
  ```

### 4. Edge Function

#### send-reminders (CRON Handler)
- **Location:** `supabase/functions/send-reminders/index.ts`
- **Trigger:** CRON `*/5 * * * *` (every 5 minutes)
- **Logic:**
  1. Query activities with `scheduled_reminder_time` NOW ± 5 min
  2. For each activity:
     - Get user's active subscriptions
     - Get user's preferences
     - Check if reminder type is enabled
     - Check if NOT in quiet hours
     - If passes: send via Web Push
  3. Log all attempts (success/failure)
  4. If failure: queue retry with backoff
  5. If permanent failure (410/404): mark subscription invalid
  6. Return JSON status

---

## Reminder Timing Rules

### Constants Configuration

**Location:** `src/shared/constants/reminders.ts`

```typescript
export const REMINDER_RULES = {
  exam: {
    type: 'exam',
    hoursBeforeDue: 24,
    label: 'Prova'
  },
  assignment: {
    type: 'assignment',
    hoursBeforeDue: 24,
    label: 'Entrega'
  },
  task: {
    type: 'task',
    hoursBeforeDue: 3, // configurable per user (0-6)
    label: 'Tarefa'
  }
}

export function calculateReminderTime(
  activityType: ActivityType,
  dueDate: Date,
  userTaskHours?: number
): Date {
  const hoursToSubtract = 
    activityType === 'task' 
      ? (userTaskHours || REMINDER_RULES.task.hoursBeforeDue)
      : REMINDER_RULES[activityType].hoursBeforeDue
  
  return new Date(dueDate.getTime() - hoursToSubtract * 60 * 60 * 1000)
}
```

### Integration with Activities

When an activity is created/updated:
1. Calculate `scheduled_reminder_time` using `calculateReminderTime()`
2. Store in activities table: `scheduled_reminder_time` column
3. When activity status = "completed": set `scheduled_reminder_time = null`
4. When activity is deleted: soft delete keeps record for audit

---

## Notification Message Formatting

### Pretty Printer Implementation

**Location:** `src/features/notifications/domain/notificationFormatter.ts`

```typescript
export interface NotificationMessage {
  title: string
  body: string
}

export function formatNotificationMessage(
  activity: Activity
): NotificationMessage {
  const activityTypeLabel = {
    exam: 'Prova',
    assignment: 'Entrega',
    task: 'Tarefa'
  }[activity.type]

  const dueDate = new Date(activity.dueDate)
  const now = new Date()
  const hoursUntil = Math.round(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  )

  // Format date: "15 de Março às 10:00" or "Hoje"
  let dueDateStr = formatDueDate(dueDate)

  // Truncate subject to 30 chars
  const subjectStr = activity.subject?.name || ''
  const truncatedSubject = 
    subjectStr.length > 30 
      ? subjectStr.substring(0, 27) + '...'
      : subjectStr

  const title = `${activityTypeLabel}: ${truncatedSubject}`
  const body = `${dueDateStr} - Faltam ${hoursUntil}h`

  return { title, body }
}

function formatDueDate(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (isSameDay(date, today)) return 'Hoje'
  if (isSameDay(date, tomorrow)) return 'Amanhã'

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  
  const day = date.getDate()
  const month = months[date.getMonth()]
  const hour = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  return `${day} de ${month} às ${hour}:${min}`
}
```

---

## Error Handling & Resilience

### Retry Strategy

**Exponential Backoff:**
- Attempt 1: immediately
- Attempt 2: wait 1 min
- Attempt 3: wait 5 min
- Attempt 4: wait 15 min
- Attempt 5: wait 1 hour (then give up)

**Permanent Failures (no retry):**
- 410 Gone (subscription no longer valid)
- 404 Not Found (endpoint doesn't exist)
- Invalid VAPID signature

**Retriable Errors:**
- 429 Too Many Requests
- 500+ Server errors
- Network timeouts

### Subscription Invalidation

When a subscription gets 410/404:
1. Mark as `is_active = false`
2. Log in notification_delivery_log with error
3. Set `needs_revalidation = true` (soft flag)
4. Notify user via email
5. UI will prompt user to re-authorize

### Circuit Breaker

If failure rate > 10% in last 5 min:
1. Stop attempting sends for 5 minutes
2. Log alert for manual investigation
3. Send notification to admins

### Graceful Degradation

If Web Push API fails completely:
1. Still process preferences (in-app)
2. Show error to user: "Notificações indisponíveis no momento"
3. Allow user to retry

---

## Security & Privacy

### VAPID Key Management

**Public Key:**
- Stored in `.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Embedded in Service Worker registration
- Included in Web App Manifest

**Private Key:**
- Stored in `.env` as `VAPID_PRIVATE_KEY` (backend only)
- Never exposed to frontend
- Used only in Edge Function to sign JWT

**Key Rotation:**
- Generate new key pair using `web-push generateVAPIDKeys()`
- Update environment variables
- Existing subscriptions remain valid (endpoint still works)
- Old private key can be decommissioned after 30 days

### Row-Level Security (RLS)

```sql
-- Subscriptions: Users see only their own
CREATE POLICY "Users can see own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id)

-- Preferences: Users see only their own
CREATE POLICY "Users can see own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id)

-- Logs: Admins see all, users see none
CREATE POLICY "Admins see all logs"
  ON notification_logs FOR SELECT
  USING (is_admin_role(auth.uid()))
```

### Data Privacy

- Subscription endpoints never logged in error messages
- Notification content not stored in logs (only title/body hash)
- User agents masked to not include device identifiers
- Click tracking only records timestamp, not referrer unless needed
- Compliance: All data deleted immediately when user deletes account

---

## Performance Considerations

### Database Optimization

**Indexes for Queries:**
```sql
-- Find reminders due now
CREATE INDEX idx_activities_reminder_time 
  ON activities(scheduled_reminder_time) 
  WHERE scheduled_reminder_time IS NOT NULL 
  AND scheduled_reminder_time <= NOW() + INTERVAL '5 minutes'

-- Find active subscriptions
CREATE INDEX idx_subscriptions_user_active 
  ON push_subscriptions(user_id, is_active)

-- Pagination on logs
CREATE INDEX idx_notification_logs_user_time 
  ON notification_logs(user_id, sent_at DESC)
```

### Edge Function Performance

**Optimizations:**
- Batch sends via Promise.all() for parallel HTTP requests
- Query pagination: process 100 reminders at a time
- Priority queue: Process urgent reminders first
- Circuit breaker: Fail fast if too many errors

**Timeout Strategy:**
- Supabase Edge Function timeout: 30 seconds
- Individual request timeout: 5 seconds
- Implement bulk send with timeout: 25 seconds

### Client-Side Performance

**Service Worker Registration:**
- Register async, non-blocking
- Use lazy loading
- Don't block page load

**Payload Size:**
- Keep under 2KB per notification
- Compress title/body
- Minimal data object

---

## Testing Strategy

### Unit Tests

**Locations & Coverage:**

1. **Pretty Printer** (`__tests__/features/notifications/domain/notificationFormatter.test.ts`)
   - Format exam notification with subject
   - Format assignment with long subject (truncation)
   - Format task with different hour ranges
   - Date formatting: today, tomorrow, future dates
   - Edge case: midnight crossover

2. **Reminder Rules** (`__tests__/features/notifications/domain/reminders.test.ts`)
   - Calculate reminder time for each type (24h, 24h, 0-6h)
   - Calculate with custom task hours
   - Time calculation accuracy (within 1 minute)

3. **Validators** (`__tests__/features/notifications/domain/validators.test.ts`)
   - Validate VAPID key format
   - Validate subscription object
   - Validate quiet hours time format
   - Validate task reminder hours range (0-6)

4. **Server Actions** (`__tests__/features/notifications/presentation/actions.test.ts`)
   - Subscribe: create new subscription
   - Subscribe: update existing subscription
   - Unsubscribe: mark inactive
   - Update preferences: validate and save
   - Send test notification: success and failure cases

### Integration Tests

1. **Subscribe Flow** (`e2e/specs/notifications-subscribe.spec.ts`)
   - User clicks "Permitir"
   - Browser permission granted
   - Subscription registered
   - DB has record

2. **Preferences Flow** (`e2e/specs/notifications-preferences.spec.ts`)
   - User changes toggle
   - Change persists in DB
   - Settings page reloads with saved state

3. **Activity Creation** (`e2e/specs/notifications-activity-reminder.spec.ts`)
   - Create exam
   - Verify scheduled_reminder_time calculated
   - Create task with custom user hours preference
   - Verify correct time calculated

### E2E Tests

1. **Full Reminder Flow** (`e2e/specs/notifications-end-to-end.spec.ts`)
   - User enables notifications
   - User creates activity
   - Wait for CRON trigger (mock or actual)
   - Verify notification received (mock Web Push API)
   - User clicks notification
   - App opens to correct page

2. **Settings Page** (`e2e/specs/notifications-settings.spec.ts`)
   - Load settings page
   - All controls render
   - Send test notification
   - Verify success message
   - Unsubscribe
   - Verify inactive state

3. **Accessibility** (`e2e/specs/notifications-a11y.spec.ts`)
   - Settings page keyboard navigable
   - Form labels associated
   - Error messages announced

### Database Tests (pgtap)

**Location:** `supabase/tests/notifications.pgsql`

```sql
-- Test RLS policies
SELECT plan(5);

SELECT throws_ok(
  'SELECT * FROM push_subscriptions WHERE user_id != auth.uid()',
  'Users cannot read other subscriptions'
);

SELECT lives_ok(
  'SELECT * FROM push_subscriptions WHERE user_id = auth.uid()',
  'Users can read own subscriptions'
);

-- Test triggers
SELECT lives_ok(
  'INSERT INTO notification_preferences (user_id, ...) VALUES (auth.uid(), ...)',
  'Can insert preferences'
);

SELECT is(
  (SELECT COUNT(*) FROM notification_preferences WHERE user_id = auth.uid()),
  1,
  'Only one preferences record per user'
);

SELECT finish();
```

### Property-Based Testing

Tag format: `Feature: notifications-system, Property {number}: {description}`

---

## Implementation Sequence

1. **Database Schema** (`supabase/migrations/...`)
   - Tables: subscriptions, preferences, logs
   - RLS policies
   - Indexes

2. **Domain Layer** (`src/features/notifications/domain/`)
   - Formatter
   - Rules
   - Validators

3. **Service Worker** (`public/service-worker.js`)
   - Push event handler
   - Notification click handler

4. **Server Actions** (`src/features/notifications/presentation/actions/`)
   - Subscribe/unsubscribe
   - Update preferences
   - Send test

5. **UI Components** (`src/features/notifications/presentation/components/`)
   - Permission prompt
   - Settings page
   - Indicators

6. **Edge Function** (`supabase/functions/send-reminders/`)
   - CRON handler
   - Query and send logic
   - Retry queue

7. **Tests**
   - Unit tests
   - Integration tests
   - E2E tests
   - Database tests

8. **Integration with Activities** (depend on Spec 6)
   - Add `scheduled_reminder_time` to activities table
   - Calculate on create/update
   - Clear on completion/deletion

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before writing correctness properties, I will analyze each requirement's acceptance criteria for testability using the prework process.

 

### Property Analysis and Reflection

After reviewing the prework analysis, I've identified key testable properties across the requirements. Many criteria had overlapping properties that can be consolidated. Here are the universal properties that should hold for any valid execution:

**Consolidated Property Groups:**
- Subscription lifecycle: Create, read (RLS), update, deactivate, reactivate
- Preference sync: Store, read (RLS), apply to reminders, sync across devices
- Reminder scheduling: Calculate time, update on activity change, cancel on completion
- Notification delivery: Send, retry with backoff, log success/failure, skip permanent failures
- Browser support detection: Check capabilities, disable unsupported features, graceful fallback
- Data retention: Delete old logs, archive before deletion, delete on account removal
- Multi-device support: Multiple subscriptions per user, one reminder per user, preference centralization
- Performance: Batch processing, indexed queries, lazy loading, small payloads

### Correctness Properties

**Property 1: Subscription RLS Isolation**

For any two different users, neither should be able to view or modify the other's push subscriptions via the database. The Row-Level Security policy must ensure that queries filter by `user_id = auth.uid()`.

**Validates: Requirements 2.6**

**Property 2: Reminder Time Calculation Accuracy**

For any activity, the calculated `scheduled_reminder_time` must equal the activity's `dueDate` minus the configured hours for that activity type (24h for exams/assignments, 0-6h for tasks).

**Validates: Requirements 6.2, 6.3, 6.4, 6.7**

**Property 3: Single Subscription Per Endpoint**

For any given push endpoint, there should be exactly one active subscription record per user. If a subscription is created for an endpoint that already exists, the system must update the existing record rather than create a duplicate.

**Validates: Requirements 2.7**

**Property 4: Reminder Scheduling on Activity Changes**

For any activity, if the due date is modified, the `scheduled_reminder_time` must be recalculated. If the activity is marked complete or deleted, the `scheduled_reminder_time` must be set to null to prevent sending.

**Validates: Requirements 6.7, 6.8, 6.9**

**Property 5: Unsubscribe Persistence**

For any user who unsubscribes, the subscription record must be marked with `is_active = false` but retained in the database for audit purposes. The record should persist for at least 30 days before hard deletion.

**Validates: Requirements 5.4, 5.5, 18.5**

**Property 6: Preference Enforcement During Delivery**

For any reminder that should be sent, the system must check the user's notification preferences before sending. If the reminder type is disabled, the reminder should be skipped. If the current time is within the user's quiet hours, the reminder should be deferred.

**Validates: Requirements 9.8, 9.9**

**Property 7: Retry Strategy Exponential Backoff**

For any notification that fails with a retriable error (429, 5xx), the system must queue a retry with exponential backoff timing: 1 min, 5 min, 15 min, 1 hour. After 4 failed attempts, the notification must be marked as permanently failed and not retried.

**Validates: Requirements 12.1, 12.2, 12.4, 12.5, 12.6, 12.7**

**Property 8: Permanent Failure No Retry**

For any notification that fails with a permanent error code (410 Gone, 404 Not Found), the system must immediately mark the subscription as invalid and not attempt any retry. The subscription must be removed from future send operations.

**Validates: Requirements 12.3**

**Property 9: Multi-Device Notification Distribution**

For any user with multiple active subscriptions (different devices), when a reminder is due, the system must send one notification to each active subscription endpoint. No duplicate notifications should be sent to the same device.

**Validates: Requirements 13.1, 13.2, 13.3**

**Property 10: Preference Synchronization Across Devices**

For any preference change made on one device, all other devices for the same user must reflect the updated preference when they next query the database. The preference record is centralized per user, not per device.

**Validates: Requirements 13.4, 13.8**

**Property 11: Global Preference Override**

For any user, if preferences have `reminders_enabled = false`, no reminders should be sent to any of their devices regardless of individual device subscription status. Disabling reminders globally should disable them everywhere.

**Validates: Requirements 13.6**

**Property 12: Service Worker Registration and Push Handling**

For any app load, if the browser supports Service Worker and Web Push, the registration must complete without errors. For any incoming push message, the Service Worker must extract the payload and call `showNotification()` within 3 seconds.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

**Property 13: Notification Click Navigation**

For any notification click event, the Service Worker must receive the `notificationclick` event and open/focus the app. Based on the notification's `data.activityType`, it should navigate to the appropriate page (calendar for exams, activities for tasks/assignments).

**Validates: Requirements 4.5, 4.6**

**Property 14: Notification Tag Aggregation**

For any notification, if a previous notification with the same `tag` exists in the system, the new notification must replace the old one rather than showing both. This prevents notification spam for repeated reminder types.

**Validates: Requirements 4.7, 4.8**

**Property 15: Permission State Persistence**

For any user choice regarding notification permission (Permitir, Agora Não, Nunca), the choice must be persisted in `localStorage`. If "Nunca" is chosen, the permission prompt must never appear again. If "Agora Não" is chosen, the prompt may reappear after 7 days.

**Validates: Requirements 1.7, 1.8**

**Property 16: Permission Grant Auto-Subscribe**

For any browser permission grant (state = "granted"), the system must automatically initiate the push subscription flow by calling `registration.pushManager.subscribe()` with the VAPID public key.

**Validates: Requirements 1.5**

**Property 17: Browser Support Detection and Fallback**

For any browser that lacks Web Push API support or ServiceWorker API, the system must gracefully degrade by disabling notification UI elements without throwing errors or crashing. For any browser that supports the features, the system must enable the UI.

**Validates: Requirements 14.1, 14.2, 14.4, 14.5, 14.6, 14.9**

**Property 18: Pretty Printer Format Consistency**

For any notification message, the title must follow the format `{ActivityType}: {Subject}` where ActivityType is capitalized (Prova, Entrega, Tarefa) and Subject is truncated to 30 characters if longer. The body must contain the formatted due date and time remaining.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

**Property 19: Notification Audit Logging**

For every notification sent (success or failure), an entry must be recorded in `notification_logs` with fields: user_id, subscription_id, activity_id, title, body, sent_at, status, and error (if failed). For every notification clicked by a user, an entry must be recorded in `notification_clicks` with user_id, notification_id, and clicked_at.

**Validates: Requirements 15.1, 15.2**

**Property 20: Admin-Only Log Access**

For any non-admin user querying `notification_logs` or `notification_clicks`, the result must be empty due to RLS policies. Only users with admin role should retrieve logs.

**Validates: Requirements 15.4**

**Property 21: Data Retention and Automatic Cleanup**

For any notification log entry, it must be retained for at least 90 days from creation. For any click log entry, it must be retained for at least 180 days. After retention expires, entries must be automatically deleted via a background job. Before deletion, backup copies must be created.

**Validates: Requirements 18.1, 18.2, 18.3, 18.4**

**Property 22: Account Deletion Cascading**

For any user account that is deleted, all associated push subscriptions, notification preferences, and logs must be immediately purged from the database. No trace of notifications should remain (except archived backups).

**Validates: Requirements 18.7**

**Property 23: VAPID Key Security**

For any edge function execution, the VAPID private key must be available in the environment. For any frontend code, the VAPID private key must never be imported or exposed. Only the VAPID public key should be available to frontend code via `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

**Validates: Requirements 3.3**

**Property 24: Edge Function Batch Performance**

For any Edge Function execution processing N reminders (up to 1000), the processing must complete within 25 seconds. The function must use batch HTTP requests to the Web Push API to send multiple notifications in parallel.

**Validates: Requirements 16.1, 16.5**

**Property 25: Notification Priority Ordering**

For any batch of pending reminders, the system must prioritize by urgency: Exams (24h before) > Assignments (24h before) > Tasks (0-6h before). Earlier-due reminders should be processed first to minimize overall latency.

**Validates: Requirements 16.6**

**Property 26: Circuit Breaker Activation**

For any 5-minute interval where the failure rate exceeds 10% (more than 1 in 10 notifications fail to deliver), the system must activate a circuit breaker and stop attempting to send for the next 5 minutes. After the wait period, retries should resume.

**Validates: Requirements 16.7**

**Property 27: Expired Subscription Cleanup**

For any subscription that has 10 or more consecutive delivery failures, the system must mark it as invalid and remove it from future send operations. Expired subscriptions should not be queried in batch operations to avoid wasting processing time.

**Validates: Requirements 16.8**

**Property 28: Service Worker Lazy Loading**

For any app page load, the Service Worker registration must occur asynchronously without blocking the main thread. The page must reach interactive state before attempting Service Worker registration.

**Validates: Requirements 16.9**

**Property 29: Payload Size Constraint**

For any notification payload sent to a user's device, the total size must be less than 2KB. This ensures compatibility with slow network connections and battery-constrained devices.

**Validates: Requirements 16.10**

**Property 30: Activity Reminder Dependency**

For any activity that is created in the system, the notification system must automatically calculate and store the `scheduled_reminder_time` based on activity type and user preferences. For any activity that is updated, the reminder time must be recalculated.

**Validates: Requirements 19.2, 19.3**

---

## Testing Strategy

### Property-Based Tests

Using **fast-check** (for JavaScript) with minimum 100 iterations per test:

```typescript
// Example Property-Based Test Tags
// Feature: notifications-system, Property 1: Subscription RLS Isolation
// Feature: notifications-system, Property 2: Reminder Time Calculation Accuracy
// Feature: notifications-system, Property 3: Single Subscription Per Endpoint
// ... (30 properties total)
```

Each property-based test will:
1. Generate random valid inputs (users, activities, subscriptions, preferences)
2. Execute the relevant system operation
3. Assert that the property invariant holds
4. Run 100+ iterations with different input combinations
5. Shrink failures to minimal failing examples

### Unit Tests by Layer

**Domain Tests** (no mocking):
- `notificationFormatter.test.ts` - Message formatting with various date/time combinations
- `reminders.test.ts` - Time calculation for all activity types
- `validators.test.ts` - VAPID key format, subscription validation

**Application Tests** (mock repositories):
- Subscribe/unsubscribe use cases with RLS mocking
- Preference update validation and persistence
- Retry strategy logic with different error scenarios

**Presentation Tests** (mock server actions):
- Component rendering with different permission states
- Settings page interaction with preference toggles
- Permission prompt behavior and localStorage persistence

### Integration Tests

- Complete subscribe flow: Permission → Subscription → Storage → Test notification
- Complete unsubscribe flow: Button click → Revoke → Mark inactive → No more sends
- Activity creation → Reminder scheduled → Edge Function processes → Notification sent
- Preference changes on one device visible on another (multi-device sync)

### E2E Tests (Playwright)

- User enables notifications in settings, receives test notification
- User creates exam, gets notified 24 hours before (simulated time)
- User clicks notification, app opens to calendar view
- User disables notifications, no more reminders arrive
- User re-enables on new device, notification preferences synced

### Database Tests (pgtap)

- RLS policies prevent cross-user access
- Indexes exist on frequently queried columns
- Triggers maintain data consistency on updates
- Retention policies work correctly with time-based queries

---

## Next Steps

This design document is complete and ready for review. The correctness properties provide executable specifications that can be validated through property-based testing, unit tests, integration tests, E2E tests, and database tests.

When implementing, follow the implementation sequence outlined in the Architecture section, and reference the specific property tags when writing tests to ensure all 30 properties are covered.