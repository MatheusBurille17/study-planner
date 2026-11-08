# Implementation Plan: Notifications & Reminders System

## Overview

This plan breaks down the notifications system into 6 implementation phases. Each task is designed to be completable in 2-4 hours and builds incrementally toward a fully functional reminder engine. The system integrates with the Activities feature (Tasks, Exams, Assignments) and uses Supabase Edge Functions with CRON scheduling to send Web Push notifications at precisely timed moments.

## Implementation Phases

- **Phase 1: Database & Infrastructure** - Schema, migrations, RLS policies, indexes
- **Phase 2: Domain & Formatting** - Business rules, reminder rules, notification formatter
- **Phase 3: Service Worker & Web Push** - Service Worker registration, push event handlers
- **Phase 4: Server Actions & Subscriptions** - Subscribe/unsubscribe logic, subscription management
- **Phase 5: UI & Preferences** - Settings page, notification preferences, permission prompt
- **Phase 6: Edge Function & Scheduling** - CRON handler, reminder dispatch, retry logic

---

## Phase 1: Database & Infrastructure

### Task 1.1: Create Supabase Database Migrations

**Requirement:** Requirements 2, 3, 15, 16

**Objective:** Set up all necessary database tables with proper indexes and RLS policies

**Subtasks:**

- [x] Create migration file: `supabase/migrations/20240201_create_notification_tables.sql`
  - Create `push_subscriptions` table with columns: id (UUID), user_id (UUID), endpoint (string, unique), p256dh (string), auth (string), is_active (boolean, default true), device_info (JSON), created_at (timestamp), updated_at (timestamp)
  - Create `notification_preferences` table with columns: id (UUID), user_id (UUID, unique), reminders_enabled (boolean, default true), exams_enabled (boolean, default true), assignments_enabled (boolean, default true), tasks_enabled (boolean, default true), task_reminders_hours (integer, 0-6, default 3), quiet_hours_start (string, HH:mm, default '22:00'), quiet_hours_end (string, HH:mm, default '08:00'), sound_enabled (boolean, default true), vibration_enabled (boolean, default true), updated_at (timestamp)
  - Create `notification_logs` table with columns: id (UUID), user_id (UUID), subscription_id (UUID), activity_id (UUID), activity_type (enum: exam/assignment/task), title (string), body (string), sent_at (timestamp), status (enum: success/failed/retrying), error (text), device_info (JSON), created_at (timestamp)
  - Create `notification_delivery_log` table with columns: id (UUID), notification_id (UUID), user_id (UUID), subscription_id (UUID), attempt (integer), status (enum: pending/success/failed), error_code (integer), error_message (text), next_retry_at (timestamp), created_at (timestamp)
  - Create `notification_clicks` table with columns: id (UUID), notification_id (UUID), user_id (UUID), clicked_at (timestamp), referrer (string), created_at (timestamp)
  - Add all necessary indexes for performance

- [x] Create indexes for each table as documented in design
  - Index on (user_id, is_active) for push_subscriptions
  - Index on (endpoint) for push_subscriptions
  - Index on (user_id) for notification_preferences
  - Index on (user_id, sent_at) for notification_logs
  - Index on (next_retry_at) for notification_delivery_log
  - Index on (user_id, clicked_at) for notification_clicks

- [x] Add Row-Level Security (RLS) policies
  - Policy: Users can only view their own push_subscriptions
  - Policy: Users can only view their own notification_preferences
  - Policy: Only admins can view notification_logs
  - Policy: Only admins can view notification_delivery_log
  - Policy: Only admins can view notification_clicks

**Acceptance Criteria:**
- All tables created with correct schema and data types
- All indexes created successfully
- RLS policies enforce proper access control
- No console errors during migration
- Database schema matches design specification exactly

**Time Estimate:** 2-3 hours

---

### Task 1.2: Create Supabase Edge Function Structure

**Requirement:** Requirements 7, 12, 16

**Objective:** Set up the Edge Function directory and dependencies for the reminder scheduler

**Subtasks:**

- [x] Create `supabase/functions/send-reminders/` directory
- [x] Create `supabase/functions/send-reminders/index.ts` with TypeScript skeleton
- [x] Create `supabase/functions/send-reminders/deno.json` with dependencies:
  - web-push library for Deno (or equivalent for Web Push standard)
  - Supabase client library for Deno
  - date-fns or similar for date manipulation
  - zod for validation (optional, or use native validation)

- [x] Set up CRON trigger configuration in `supabase.toml` or via Dashboard
  - Configure CRON schedule: `*/5 * * * *` (every 5 minutes)
  - Set timeout to 30 seconds

- [x] Create environment variable setup documentation
  - Document VAPID_PRIVATE_KEY setup
  - Document SUPABASE_URL, SUPABASE_ANON_KEY for Deno runtime

**Acceptance Criteria:**
- Directory structure created correctly
- deno.json has all required dependencies
- CRON trigger configured and visible in Supabase Dashboard
- Function can be invoked manually without errors
- Environment variables are properly documented

**Time Estimate:** 1-2 hours

---

## Phase 2: Domain & Formatting

### Task 2.1: Create Reminder Rules Constants

**Requirement:** Requirements 6, 8

**Objective:** Define reminder timing rules as configurable constants

**Subtasks:**

- [x] Create `src/shared/constants/reminders.ts`
  - Define REMINDER_RULES constant with exam (24h), assignment (24h), task (0-6h configurable)
  - Export function calculateReminderTime(activityType, dueDate, userTaskHours?) that returns Date
  - Add JSDoc comments explaining each rule

- [x] Create unit tests in `__tests__/shared/constants/reminders.test.ts`
  - Test calculateReminderTime for exams (24 hours before)
  - Test calculateReminderTime for assignments (24 hours before)
  - Test calculateReminderTime for tasks with default 3 hours
  - Test calculateReminderTime for tasks with custom user hours (0-6)
  - Test edge case: midnight/timezone calculations
  - All tests should pass with 100% coverage

- [x] Add type definitions for activity types if not already present
  - Ensure ActivityType includes 'exam', 'assignment', 'task'

**Acceptance Criteria:**
- Constants file created with all reminder rules
- calculateReminderTime function works correctly for all types
- All tests pass
- Function handles edge cases (timezones, daylight saving)
- Code is well-documented with comments and types

**Time Estimate:** 1-2 hours

---

### Task 2.2: Implement Notification Message Formatter

**Requirement:** Requirements 8, 10

**Objective:** Create pretty printer for notification messages in Portuguese (BR)

**Subtasks:**

- [x] Create `src/features/notifications/domain/notificationFormatter.ts`
  - Implement formatNotificationMessage(activity: Activity) function
  - Returns {title: string, body: string}
  - Title format: `{ActivityType}: {Subject}` (max 30 chars for subject)
  - Body format: `{FormattedDate} - {TimeRemaining}`
  - Implement formatDueDate(date: Date) with special handling for "Hoje", "Amanhã", or "DD de Mês"
  - Handle Portuguese month names correctly
  - Implement formatTimeRemaining(hoursUntil: number) for natural language

- [x] Create comprehensive unit tests in `__tests__/features/notifications/domain/notificationFormatter.test.ts`
  - Test exam formatting: "Prova: Cálculo I - 15 de Março às 10:00"
  - Test assignment formatting with long subject (should truncate with "...")
  - Test task formatting: "Tarefa: Revisar capítulos 5-7 - Hoje"
  - Test date formatting: today, tomorrow, future dates
  - Test subject truncation at 30 characters
  - Test Portuguese month names for all 12 months
  - Test hour formatting in 24h format
  - Test edge cases: midnight, month boundaries, timezone handling
  - All tests pass with 100% coverage

- [x] Verify Portuguese language localization
  - All month names in Portuguese (Brasil)
  - All activity types in Portuguese (Prova, Entrega, Tarefa)
  - No hardcoded English strings

**Acceptance Criteria:**
- Formatter produces correctly formatted messages in Portuguese
- Messages follow exact format specification
- All tests pass
- Subject truncation works at 30 characters
- Date/time formatting is accurate
- No encoding issues with special characters

**Time Estimate:** 2-3 hours

---

## Phase 3: Service Worker & Web Push

### Task 3.1: Create and Register Service Worker

**Requirement:** Requirements 2, 4

**Objective:** Create Service Worker file and registration logic

**Subtasks:**

- [x] Create `public/service-worker.js` (or .ts if using bundling)
  - Implement `install` event handler
  - Implement `activate` event handler
  - Implement `push` event handler to display notifications
  - Implement `notificationclick` event handler to navigate to correct page
  - Handle unsubscribe on activate (clean up old caches)

- [x] Create `src/shared/lib/notifications/service-worker-registration.ts`
  - Implement registerServiceWorker() function
  - Check browser support for ServiceWorker
  - Register at `/public/service-worker.js`
  - Handle registration success (console log)
  - Handle registration errors (log but don't crash app)
  - Handle update checking

- [x] Create `src/features/notifications/presentation/hooks/useServiceWorkerRegistration.ts`
  - Custom React hook to register Service Worker on app load
  - Use useEffect with empty dependency array
  - Handle browser compatibility gracefully

- [x] Create client component to register Service Worker
  - Create `src/features/notifications/presentation/components/ServiceWorkerInitializer.tsx`
  - Use the hook above
  - Mount this component in root layout

- [x] Create unit tests for registration logic
  - Test successful registration
  - Test error handling
  - Test browser support detection

**Acceptance Criteria:**
- Service Worker registers on app load
- No console errors during registration
- Registration works on modern browsers (Chrome, Firefox, Safari, Edge)
- Service Worker appears in DevTools
- Browser compatibility gracefully handled

**Time Estimate:** 2-3 hours

---

### Task 3.2: Implement Push Event Handler

**Requirement:** Requirements 4, 8

**Objective:** Handle incoming push notifications and display them

**Subtasks:**

- [x] Implement `push` event listener in Service Worker
  - Extract payload: data.title, data.body, data.icon, data.tag, data.data
  - Call `self.registration.showNotification(title, options)`
  - Include options: body, icon, tag (for aggregation), badge, data
  - Ensure completion within 3 seconds (Chrome timeout)

- [x] Implement `notificationclick` event listener in Service Worker
  - Extract notification data
  - Close the notification
  - Determine correct page based on activityType
  - Open app at correct URL or focus existing window
  - Ensure completion within 1 second

- [x] Create unit tests for Service Worker events
  - Mock push event with test payload
  - Verify showNotification is called with correct options
  - Test notification click navigation logic
  - Test tag aggregation (duplicate tags replace each other)

**Acceptance Criteria:**
- Notifications display correctly when push event received
- Notification content is readable
- Clicking notification opens app at correct page
- Tag aggregation prevents duplicate notifications
- All timeouts respected (3s for push, 1s for click)

**Time Estimate:** 2 hours

---

## Phase 4: Server Actions & Subscriptions

### Task 4.1: Create Subscribe Server Action

**Requirement:** Requirements 1, 2, 3

**Objective:** Handle push subscription registration from frontend

**Subtasks:**

- [x] Create `src/features/notifications/presentation/actions/subscribeToNotifications.ts`
  - Receive subscription object: {endpoint, keys: {p256dh, auth}}
  - Validate subscription format with Zod schema
  - Extract user_id from auth context
  - Check if subscription with same endpoint already exists
  - If exists: update is_active=true, updated_at=now
  - If not exists: create new record
  - Return {success: boolean, subscriptionId?: string, error?: string}

- [x] Create Zod schema for validation
  - Validate endpoint is valid URL format
  - Validate p256dh and auth are base64url strings
  - Validate no fields are missing

- [x] Create database helper for subscription management
  - Function to check if subscription exists by endpoint
  - Function to create new subscription
  - Function to update existing subscription
  - All functions should include proper error handling

- [x] Create unit tests
  - Test successful subscription creation
  - Test successful subscription update (duplicate endpoint)
  - Test validation errors (invalid format)
  - Test database errors
  - Test RLS enforcement (user can only subscribe themselves)

- [x] Create E2E test in `e2e/specs/notifications-subscribe.spec.ts`
  - User grants notification permission
  - Subscription is sent to server
  - Subscription appears in database
  - Second subscription attempt updates existing record

**Acceptance Criteria:**
- Subscription stored correctly in database
- No duplicate subscriptions created
- Validation rejects invalid data
- User can only subscribe themselves (RLS)
- Error messages are clear and helpful
- E2E test passes

**Time Estimate:** 2-3 hours

---

### Task 4.2: Create Unsubscribe Server Action

**Requirement:** Requirements 5

**Objective:** Handle unsubscription and opt-out logic

**Subtasks:**

- [x] Create `src/features/notifications/presentation/actions/unsubscribeFromNotifications.ts`
  - Extract user_id from auth context
  - Mark all user subscriptions as is_active=false
  - Keep records for audit (soft delete)
  - Return {success: boolean, error?: string}

- [x] Create server action to update preferences
  - Create `src/features/notifications/presentation/actions/updateNotificationPreferences.ts`
  - Accept partial preferences update
  - Validate each field (hours 0-6, time format HH:mm, booleans)
  - Create or update notification_preferences record
  - Return updated preferences object

- [x] Create Zod schemas for preference validation
  - Validate taskRemindersHours: 0-6 integer
  - Validate quietHoursStart/End: HH:mm format, valid times
  - Validate time range (start before end)
  - Validate boolean fields

- [x] Create database helpers
  - Function to get current preferences
  - Function to create default preferences
  - Function to update preferences
  - All with proper error handling

- [x] Create unit tests
  - Test unsubscribe marks subscriptions inactive
  - Test preferences validation
  - Test default preferences created
  - Test preference updates
  - Test error handling

**Acceptance Criteria:**
- Unsubscribe marks subscriptions inactive (not deleted)
- Preferences stored and retrieved correctly
- Validation prevents invalid values
- User can resubscribe after unsubscribe
- Audit trail maintained

**Time Estimate:** 2 hours

---

## Phase 5: UI & Preferences

### Task 5.1: Create Notification Permission Prompt

**Requirement:** Requirements 1, 10

**Objective:** Request notification permission from user non-intrusively

**Subtasks:**

- [x] Create `src/features/notifications/presentation/components/NotificationPermissionPrompt.tsx`
  - Display banner with clear message about benefits
  - Three buttons: "Permitir", "Agora Não", "Nunca"
  - Check localStorage for previous choice (hasSeenNotificationPrompt, notificationChoice)
  - Only show on first load (check localStorage)
  - On "Permitir": call Notification.requestPermission()
  - On "Agora Não": set reminder for 7 days from now
  - On "Nunca": set permanent flag, hide UI
  - Handle browser support detection

- [x] Create permission state hook
  - Create `src/features/notifications/presentation/hooks/useNotificationPermission.ts`
  - Return current permission state
  - Provide function to request permission
  - Provide function to check browser support
  - Update on browser permission changes

- [x] Create UI component with Tailwind styling
  - Banner layout with icon, message, buttons
  - Warn color (orange/amber) to indicate attention needed
  - Responsive on mobile/tablet/desktop
  - Accessible (keyboard navigation, semantic HTML)

- [x] Create unit tests with mocking
  - Test permission request flow
  - Test localStorage tracking
  - Test 7-day re-ask logic
  - Test "Nunca" persistence
  - Test browser support detection

- [x] Create E2E test in `e2e/specs/notifications-permission.spec.ts`
  - Load app first time, see prompt
  - Click "Permitir", grant permission
  - Reload app, no prompt shown
  - Check permission state updated

**Acceptance Criteria:**
- Prompt displays on first load
- Permission request works
- User choices persisted in localStorage
- Prompt doesn't show again after "Nunca"
- Prompt reappears after 7 days if "Agora Não"
- Works on all browsers with graceful degradation

**Time Estimate:** 3-4 hours

---

### Task 5.2: Create Notification Settings Page

**Requirement:** Requirements 9, 10, 11

**Objective:** Build settings page for notification preferences

**Subtasks:**

- [x] Create `src/features/notifications/presentation/components/NotificationSettings.tsx`
  - Display permission status (Ativo/Desabilitado/Bloqueado)
  - Toggles for: examsEnabled, assignmentsEnabled, tasksEnabled, remindersEnabled
  - Slider for taskRemindersHours (0-6)
  - Time pickers for quietHoursStart and quietHoursEnd
  - Toggles for soundEnabled, vibrationEnabled
  - "Enviar Notificação de Teste" button
  - "Desabilitar Notificações" button
  - Preview of current settings
  - List of active subscriptions (device info, created_at)

- [x] Create `src/app/(main)/settings/notifications/page.tsx`
  - Route at `/app/settings/notifications`
  - Fetch current preferences (Server Action)
  - Fetch active subscriptions (Server Action)
  - Display NotificationSettings component
  - Handle real-time updates with server actions

- [x] Create server actions for settings
  - Create actions/getNotificationPreferences.ts
  - Create actions/getActiveSubscriptions.ts
  - Both with RLS enforcement

- [x] Create time picker component (if not in shadcn/ui)
  - Component for HH:mm format input
  - Validation for valid times
  - Handle focus/blur properly

- [x] Create UI with shadcn/ui components
  - Use Switch for toggles
  - Use Slider for hours
  - Use Input for time pickers
  - Use Button for actions
  - Use Card for layout
  - Responsive and accessible

- [x] Create unit tests for component
  - Test toggle changes trigger server action
  - Test slider updates value
  - Test time picker validation
  - Test test notification button
  - Test unsubscribe confirmation

- [x] Create E2E test in `e2e/specs/notifications-settings.spec.ts`
  - Load settings page
  - Change toggle, verify persists
  - Update slider, verify persists
  - Send test notification, verify arrives
  - Unsubscribe, verify disabled

**Acceptance Criteria:**
- All preferences editable in UI
- Changes saved to database immediately
- Settings page responsive on all devices
- Test notification works
- Unsubscribe confirmation prevents accidents
- All form inputs validated
- Accessible with keyboard navigation

**Time Estimate:** 4-5 hours

---

### Task 5.3: Create Offline Indicator Component

**Requirement:** Related to PWA/offline functionality

**Objective:** Show user current connectivity state

**Subtasks:**

- [x] Create `src/shared/components/OfflineIndicator.tsx`
  - Display "Online" or "Offline" status
  - Use icon + text
  - Color code: green for online, orange for offline
  - Position at top of app (sticky)
  - Show sync status if offline (pending changes, syncing, etc.)

- [x] Create connectivity hook
  - Create `src/shared/hooks/useConnectivity.ts`
  - Return {isOnline: boolean}
  - Listen to online/offline events
  - Use navigator.onLine as primary source
  - Debounce rapid changes (500ms)

- [x] Integrate into main layout
  - Import OfflineIndicator in `src/app/(main)/layout.tsx`
  - Display at top of page

- [x] Create unit tests
  - Test online/offline state changes
  - Test debouncing
  - Test event listeners cleanup

**Acceptance Criteria:**
- Online status displays correctly
- Offline status displays with warning color
- Auto-updates when connectivity changes
- No performance impact
- Properly cleaned up on unmount

**Time Estimate:** 1-2 hours

---

## Phase 6: Edge Function & Scheduling

### Task 6.1: Implement CRON-Triggered Reminder Scheduler

**Requirement:** Requirements 7, 12, 16

**Objective:** Create Edge Function to send reminders on schedule

**Subtasks:**

- [x] Implement `supabase/functions/send-reminders/index.ts`
  - Main entry point for CRON trigger
  - Query all activities with scheduled_reminder_time NOW ± 5 minutes
  - For each activity:
    - Get user's active subscriptions
    - Get user's preferences
    - Check if reminder type enabled
    - Check if NOT in quiet hours
    - If passes all checks: send via Web Push API
  - Log all attempts (success/failure)
  - Handle errors gracefully
  - Return JSON response with stats

- [x] Implement Web Push sending logic
  - Use web-push library or native Deno Web Push
  - Sign push messages with VAPID private key
  - Handle subscription validation
  - Implement retry queue for failures
  - Set timeouts (5s per request, 25s total)

- [x] Implement error handling and retry logic
  - Catch 410/404 errors (subscription invalid) → mark inactive
  - Catch 429 errors (rate limit) → queue for retry
  - Catch 5xx errors → queue for retry with backoff
  - Log all errors with timestamps
  - Update notification_delivery_log table

- [x] Implement preference enforcement
  - Check user.reminders_enabled = true
  - Check activity type enabled (exams_enabled, etc.)
  - Check quiet hours: NOW between quietHoursStart and quietHoursEnd
  - Skip sending if any check fails (don't retry)

- [x] Create performance optimizations
  - Query with pagination (process 100 at a time)
  - Use Promise.all() for parallel HTTP requests
  - Implement circuit breaker (stop if failure rate > 10%)
  - Track execution time and log performance metrics

- [x] Create unit tests (using test database)
  - Test query finds reminders in correct time window
  - Test preference enforcement
  - Test quiet hours calculation
  - Test retry logic with backoff
  - Test performance (1000 notifications in < 25s)

- [x] Create integration tests
  - Mock Web Push API responses
  - Test successful delivery
  - Test failed delivery handling
  - Test logging and audit trail

**Acceptance Criteria:**
- Edge Function runs successfully every 5 minutes
- Reminders sent to all eligible subscriptions
- Preferences respected (type, quiet hours, enabled)
- Failures logged and retried appropriately
- Permanent failures (410/404) removed immediately
- Performance target met (1000 notifications < 25s)
- All errors handled gracefully

**Time Estimate:** 4-5 hours

---

### Task 6.2: Create Test Notification Server Action

**Requirement:** Requirements 11

**Objective:** Send immediate test notification to user

**Subtasks:**

- [x] Create `src/features/notifications/presentation/actions/sendTestNotification.ts`
  - Get user's active subscription
  - Create test notification payload
  - Send directly via Web Push API (not through Edge Function)
  - Log test send in notification_logs
  - Return {success: boolean, error?: string}

- [x] Implement Web Push sending in action
  - Similar to Edge Function but synchronous
  - Use same VAPID keys and signing logic
  - Handle errors and return to UI

- [x] Create unit tests
  - Test successful test notification
  - Test error handling (no subscription)
  - Test logging

- [x] Create E2E test
  - User clicks "Test Notification"
  - Notification received within 2 seconds
  - Success message shown

**Acceptance Criteria:**
- Test notification sends immediately
- User sees success/error message
- Test notification appears in audit logs
- Works reliably on all browsers

**Time Estimate:** 1-2 hours

---

### Task 6.3: Create Notification Logging & Monitoring

**Requirement:** Requirements 15, 16

**Objective:** Track all notifications for auditability and monitoring

**Subtasks:**

- [x] Implement logging in Edge Function
  - Log every notification send attempt
  - Log success with sent_at timestamp
  - Log failures with error message and error_code
  - Log to notification_logs table
  - Include device_info (user agent, browser, OS)

- [x] Implement delivery tracking
  - Log retry attempts in notification_delivery_log
  - Track attempt number (1-4)
  - Track backoff timing (next_retry_at)
  - Log final status (success or permanently failed)

- [x] Create click tracking (for analytics)
  - Add handler in Service Worker notificationclick
  - Send event to server via fetch
  - Log to notification_clicks table

- [x] Create admin dashboard (optional, basic)
  - Create read-only view for notification logs
  - Filter by user, date range, status
  - Show metrics: total sent, success rate, failures
  - Show retry queue status

- [x] Create data retention policy
  - Implement cleanup function for logs > 90 days
  - Export logs to CSV/JSON before deletion
  - Document retention policy

- [x] Create monitoring and alerts
  - Log warning if failure rate > 10%
  - Log error if Edge Function fails to execute
  - Create simple metrics dashboard

**Acceptance Criteria:**
- All notifications logged with all required fields
- Logs retained for 90+ days
- Logs accessible for audit
- Performance metrics tracked
- Failure alerts working

**Time Estimate:** 2-3 hours

---

## Implementation Checklist

- [x] Phase 1: Database & Infrastructure (3-5 hours)
- [x] Phase 2: Domain & Formatting (3-5 hours)
- [x] Phase 3: Service Worker & Web Push (4-5 hours)
- [x] Phase 4: Server Actions & Subscriptions (4-5 hours)
- [x] Phase 5: UI & Preferences (8-11 hours)
- [x] Phase 6: Edge Function & Scheduling (7-10 hours)

**Total Estimated Time:** 29-41 hours (1-2 weeks for 1 developer, 1 week for 2 developers)

---

## Testing Summary

### Unit Tests Required
- Reminder rules calculations
- Notification formatter
- Permission tracking logic
- Preference validation
- Server action handlers
- Retry logic
- Browser support detection

### Integration Tests Required
- Service Worker registration
- Push event handling
- Server action flows
- Database RLS enforcement
- Edge Function execution
- Complete reminder flow (create activity → trigger CRON → send notification)

### E2E Tests Required
- Full user flow: Permission → Subscribe → Create Activity → Receive Reminder
- Settings page: Change preferences → Verify persisted
- Offline support (basic, full offline test in PWA spec)
- Error scenarios: Invalid subscription, network failures, timeout

### Database Tests Required
- RLS policies enforcement
- Table structure and indexes
- Subscription deduplication
- Audit trail maintenance

---

## Property-Based Testing

For each correctness property from design.md, create property-based tests:

1. **Property 1-3:** Subscription RLS Isolation, Reminder Accuracy, Single Subscription per Endpoint
   - Use test data generators for multiple subscriptions/activities
   - Verify RLS prevents cross-user access
   - Verify calculations accurate across time ranges

2. **Property 6-8:** Preference Enforcement, Retry Strategy, Permanent Failure Handling
   - Generate edge cases for quiet hours
   - Test retry logic with varying error codes
   - Verify subscription removal on 410/404

3. **Property 18:** Pretty Printer Format Consistency
   - Generate random activities with edge case dates
   - Verify output always matches expected format

---

## Deployment & Verification

After implementation:

1. **Pre-deployment Checklist:**
   - [x] All unit tests pass (>90% coverage)
   - [x] All integration tests pass
   - [x] All E2E tests pass
   - [x] Linting passes (ESLint)
   - [x] Type checking passes (TypeScript strict)
   - [x] Database migrations tested on staging DB
   - [x] Edge Function tested in Supabase staging environment
   - [x] Performance benchmarks met

2. **Deployment Steps:**
   - Deploy database migrations to production
   - Deploy Edge Function to Supabase production
   - Deploy Next.js app with Service Worker to Vercel
   - Monitor notification delivery for 24 hours
   - Verify no errors in logs

3. **Post-deployment Verification:**
   - Test full user flow in production
   - Verify CRON executes on schedule
   - Monitor error rates
   - Check audit logs for completeness
   - Verify RLS policies working
   - Test across browsers (Chrome, Firefox, Safari, Edge)

---

## Notes for Developers

- Always validate VAPID_PRIVATE_KEY is set before deployment
- Test thoroughly on mobile browsers (iOS Safari, Android Chrome)
- Remember quiet hours can cross midnight (22:00-08:00)
- Web Push API endpoints expire after 30 days if unused
- Service Worker updates require page reload or manual update
- Test with slow network to verify timeout handling
- Use browser DevTools to test offline scenarios
- Monitor Web Push quota limits (some push services have rate limits)