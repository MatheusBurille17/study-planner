# Tasks - activity-crud

## Overview

This document outlines the implementation plan for the **activity-crud** feature MVP, which enables university students to edit, update, delete, and manage the complete lifecycle of academic activities (Tasks, Exams, Assignments). The feature requires implementation across all four layers of Clean Architecture, with comprehensive property-based testing of 30 correctness properties for ensuring idempotent updates, conflict resolution robustness, and offline-first synchronization. Estimated delivery: ~3 days of focused development.

---

## Correctness Properties Being Validated

The following 30 properties must be validated through automated tests (unit, integration, E2E, and property-based):

1. **Pre-population Round-Trip** - Form values match original activity after load/extract
2. **Validation Idempotence** - Running validation multiple times = same errors
3. **Save Disables on Invalid** - Save button disabled until all errors resolved
4. **Optimistic Update Rollback** - Failed saves revert to previous state
5. **Cancel Preserves Original** - Cancel restores original values after discard confirmation
6. **Soft Delete Idempotency** - Deleting twice = same final state (idempotent)
7. **Restore Inverse of Delete** - Restored activity state matches pre-deletion state
8. **Status Transition Validity** - Only valid transitions allowed, invalid rejected with error
9. **Conflict Detection** - Remote updates detected when server updatedAt > client expected
10. **Realtime Sync Monotonic** - Realtime updates applied exactly once per change
11. **Undo State Recovery** - Undo then redo = original state before undo
12. **Undo Stack Bounded** - Undo stack max 10 items, older items dropped
13. **Redo Stack Cleared on New Action** - Recording new action clears redo stack
14. **Bulk Delete Atomicity** - All items deleted or operation fails (no partial success)
15. **Quick Action Idempotency** - Rapid clicks execute once (debounced)
16. **Editor Modal Escape Key** - Escape closes modal, unsaved changes trigger confirmation
17. **Keyboard Ctrl+Z Undo** - Ctrl+Z undoes most recent edit
18. **Accessibility Labels Present** - All inputs have associated labels with aria attributes
19. **Save Button State Machine** - Button transitions: Salvar → Salvando → Salvo → Salvar
20. **Unsaved Changes Warn on Exit** - Beforeunload confirms on dirty state
21. **Serialization Round-Trip** - Serialize then parse = equivalent value
22. **Update Idempotence** - Update action twice with identical data = same final state
23. **Read-Only Field Ignored** - Updates exclude id, createdAt, userId (not modified)
24. **Offline Queue Sync Idempotent** - Syncing offline item multiple times = same server state
25. **Conflict Resolution Option Idempotency** - Same resolution choice repeatedly = same state
26. **Responsive Modal Width** - Mobile full-screen, desktop 600px centered
27. **Timestamp Monotonicity** - updatedAt >= previous updatedAt >= createdAt
28. **Status Transition Completeness** - Transition graph valid, all states reachable
29. **Editor Field Population Consistency** - All fields display exact current database values
30. **Conflict Modal Options Completeness** - User offered 3+ distinct resolution options

---

## Implementation Phases

### Phase 1: Domain & Data Layer Setup

#### Task 1.1: Set Up Update and Delete Schemas with Zod Validation
- **Status:** ✅ Completed
- **Requirements:** Req 4 (field validation), 5 (read-only vs editable), 9-10 (delete logic)
- **Description:** Create comprehensive Zod schemas for update/delete operations with field-level validation, read-only field enforcement, and status transition rules.
- **Skills utilizadas:** `form-handling` - Implement Zod schemas for update/delete validation with field-level enforcement and status transition rules.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/schemas/updateActivitySchema.ts`
  - [x] Define `updateTaskSchema` with all editable fields (title, description, priority, status, dueDate)
  - [x] Define `updateExamSchema` (date, time, examType, content, location, notes)
  - [x] Define `updateAssignmentSchema` (dueDate, description, assignmentType, status, criteria)
  - [x] Add refinements: dateFrom <= dateTo, status transitions valid, read-only fields excluded
  - [x] Create `deleteActivitySchema` with activityId only
  - [x] Add Portuguese error messages for all validations
  - [x] Test schemas with valid/invalid inputs for all 3 activity types
- **Skills Reference:**
  - **clean-architecture-patterns:** Use "Validation Layer Pattern" for boundary validation
  - Apply "Value Object Pattern" for immutable validated input
  - Reference "Error Handling Pattern" for detailed validation messages
- **Acceptance Criteria:**
  - [x] All update schemas validate editable fields only
  - [x] Read-only fields rejected in update payload
  - [x] Status transitions validated against state machine rules
  - [x] Portuguese error messages clear and actionable
  - [x] 100% coverage of validation paths (valid, invalid, boundary)
- **Estimated Time:** 1.5 hours

---

#### Task 1.2: Extend Supabase Schema with Soft Delete and Indices
- **Status:** ✅ Completed
- **Requirements:** Req 9-10 (soft delete + trash), 16 (conflict detection), 24 (offline sync)
- **Description:** Create migration to add soft delete columns, RLS policies for trash view, conflict detection indices, and auto-delete trigger for 30-day recovery.
- **Skills utilizadas:** `database-queries` - Add soft delete columns, indices, and RLS policies with auto-cleanup trigger for 30-day recovery period.
- **Sub-tasks:**
  - [x] Create migration: `supabase/migrations/004_add_soft_delete_and_trash.sql`
  - [x] Add columns to activities: `is_deleted BOOLEAN DEFAULT false`, `deleted_at TIMESTAMP`
  - [x] Create index: `(user_id, is_deleted, deleted_at DESC)` for trash queries
  - [x] Create index: `(user_id, updated_at DESC)` for conflict detection
  - [x] Create RLS policy: "Hide deleted in list view" (is_deleted = false)
  - [x] Create RLS policy: "Show deleted only in trash view"
  - [x] Create trigger: auto-delete after 30 days with `delete_old_deleted_activities()`
  - [x] Create RLS policy for restore: allow update is_deleted from true to false
  - [x] Test RLS: verify user cannot see other user's deleted items
- **Skills Reference:**
  - **supabase-rls-auth:** Reference "RLS Policy Patterns" for conditional access (trash vs list)
  - Use "Row-Level Security Policies" pattern for soft delete enforcement
  - Apply "Index Patterns" for performance on conflict detection queries
  - Reference "Trigger Patterns" for auto-cleanup after retention period
- **Acceptance Criteria:**
  - [x] Soft delete columns added and present in schema
  - [x] Indices created on (user_id, is_deleted) and (user_id, updated_at)
  - [x] RLS policies tested: list excludes deleted, trash shows only deleted
  - [x] 30-day auto-delete trigger functional
  - [x] Restore policy allows transitions from deleted to active
- **Estimated Time:** 1.5 hours

---

#### Task 1.3: Generate and Validate Updated Database Types
- **Status:** ✅ Completed
- **Requirements:** All requirements (type foundation)
- **Description:** Regenerate TypeScript types from updated Supabase schema and validate alignment with domain layer entities.
- **Skills utilizadas:** `clean-architecture-patterns` - Ensure database types map cleanly to domain entities without implementation leakage.
- **Sub-tasks:**
  - [x] Run `supabase gen types typescript --local` to update types
  - [x] Update `src/shared/types/database.types.ts` with soft delete columns
  - [x] Verify Activity, Task, Exam, Assignment types include is_deleted, deleted_at
  - [x] Check no `any` types in generated code
  - [x] Test strict TypeScript compilation
- **Skills Reference:**
  - **clean-architecture-patterns:** Ensure types don't leak database implementation
- **Acceptance Criteria:**
  - [x] All new columns present in database types
  - [x] Types compile without errors in strict mode
  - [x] Domain entities map cleanly to database schema
- **Estimated Time:** 30 minutes

---

### Phase 2: Domain Layer - State Machines & Conflict Logic

#### Task 2.1: Implement Activity State Machines with Validation
- **Status:** ✅ Completed
- **Requirements:** Req 13 (state transitions), Req 3-4 (field editable per state)
- **Description:** Implement domain layer state machines for Task, Exam, Assignment with valid transition rules and transition validation methods.
- **Skills utilizadas:** `clean-architecture-patterns` - Implement State Machine Pattern with explicit transition rules and invariant checks for domain validation.
- **Sub-tasks:**
  - [x] Create `src/features/activities/domain/stateMachines.ts`
  - [x] Implement Task state machine: TODO ↔ IN_PROGRESS ↔ COMPLETED (allow all bidirectional)
  - [x] Implement Exam state machine: (no status transitions; fixed state)
  - [x] Implement Assignment state machine: PENDING → SUBMITTED → GRADED (with bidirectional back to PENDING)
  - [x] Create `validateStatusTransition()` method: returns boolean, rejects invalid transitions
  - [x] Create `getAllowedTransitions()` method: returns set of valid next states
  - [x] Create `getTransitionDescription()` method: returns human-readable transition description
  - [x] Add invariant checks: no transition when deleted, timestamp validation
  - [x] Document state machine diagrams and rules in code comments
- **Skills Reference:**
  - **clean-architecture-patterns:** Use "State Machine Pattern" for explicit transition rules
  - Apply "Domain Service Pattern" for cross-entity state validation
  - Reference "Invariant Pattern" for pre-conditions on transitions
- **Acceptance Criteria:**
  - [x] All valid transitions allowed, invalid rejected
  - [x] State machine rules documented
  - [x] Transitions logged with descriptions
  - [x] 100% test coverage on state machine logic
- **Estimated Time:** 1.5 hours

---

#### Task 2.2: Implement Conflict Detection and Resolution Logic
- **Status:** ✅ Completed
- **Requirements:** Req 14-15 (conflict detection and resolution), 25 (resolve idempotently)
- **Description:** Implement application layer logic for detecting concurrent edits via updatedAt comparison, and orchestrating resolution options (reload, discard, keep).
- **Skills utilizadas:** `error-handling` - Implement Conflict Resolution Pattern with three resolution options and idempotent state recovery.
- **Sub-tasks:**
  - [x] Create `src/features/activities/application/useCases/detectConflict.ts`
  - [x] Implement `isConflict()` function: serverUpdatedAt > clientExpectedUpdatedAt
  - [x] Implement `resolveConflictWithReload()`: load server version, discard local changes
  - [x] Implement `resolveConflictWithDiscard()`: close editor, keep server version
  - [x] Implement `resolveConflictWithKeepLocal()`: attempt save with server version as base
  - [x] Create conflict metadata: serverData, clientData, resolution choice
  - [x] Document conflict resolution algorithm and guarantees
  - [x] Test all 3 resolution paths with various data states
- **Skills Reference:**
  - **clean-architecture-patterns:** Use "Conflict Resolution Pattern" for explicit handling
  - Apply "Orchestration Pattern" for multi-step resolution workflow
- **Acceptance Criteria:**
  - [x] Conflict detection accurate (timestamp comparison)
  - [x] All 3 resolution options functional
  - [x] Idempotent: applying same resolution twice = same result
  - [x] User offered clear options with consequences explained
- **Estimated Time:** 1.5 hours

---

#### Task 2.3: Implement Undo/Redo Stack as Domain Service
- **Status:** ✅ Completed
- **Requirements:** Req 21-22 (undo/redo), Property 11 (undo state recovery), Property 12-13 (stack management)
- **Description:** Create domain service for managing undo/redo stacks with max 10 items, proper state recovery, and action descriptions.
- **Skills utilizadas:** `clean-architecture-patterns` - Implement Stack Pattern with Command Pattern for encapsulating undo/redo actions.
- **Sub-tasks:**
  - [x] Create `src/features/activities/domain/undoRedoStack.ts`
  - [x] Implement `UndoRedoAction` interface: type, previousState, newState, timestamp, description
  - [x] Implement `recordAction()`: push to undo stack, clear redo stack, enforce max 10 items
  - [x] Implement `undo()`: pop from undo stack, push to redo stack, return action for reversal
  - [x] Implement `redo()`: pop from redo stack, push to undo stack
  - [x] Implement `canUndo()` and `canRedo()` predicates
  - [x] Implement `getHistory()`: returns array of actions with descriptions
  - [x] Add invariant: undo + redo should recover original state
- **Skills Reference:**
  - **clean-architecture-patterns:** Use "Stack Pattern" for LIFO behavior
  - Apply "Command Pattern" for encapsulating actions
- **Acceptance Criteria:**
  - [x] Stack max 10 items enforced
  - [x] Redo cleared on new action
  - [x] Undo then redo recovers original state
  - [x] 100% test coverage on stack operations
- **Estimated Time:** 1.5 hours

---

### Phase 3: Infrastructure Layer - Repository & Sync

#### Task 3.1: Implement Update and Delete Repository Methods with RLS
- **Status:** ✅ Completed
- **Requirements:** Req 6 (save with RLS), Req 9-10 (soft delete + trash), Req 16 (realtime sync)
- **Description:** Implement infrastructure layer repository methods for UPDATE, DELETE (soft), RESTORE operations with RLS enforcement and conflict detection.
- **Skills utilizadas:** `database-queries` - Implement UPDATE, DELETE, RESTORE methods with RLS enforcement, conflict detection, and optimistic concurrency control.
- **Sub-tasks:**
  - [x] Create `src/features/activities/infrastructure/supabaseActivityRepository.ts` extensions
  - [x] Implement `updateActivity(activityId, data, expectedUpdatedAt)` method
  - [x] Add conflict detection: compare server updatedAt with expectedUpdatedAt
  - [x] If conflict: return error with serverData and clientData
  - [x] If no conflict: UPDATE and return updated activity
  - [x] Implement `deleteActivity(activityId)` soft delete: set is_deleted=true, deleted_at=now()
  - [x] Implement `restoreActivity(activityId)` soft restore: set is_deleted=false
  - [x] Implement `getDeletedActivities(userId)` for trash view
  - [x] Implement `permanentlyDeleteActivity(activityId)` for permanent removal
  - [x] Ensure all operations use RLS: WHERE user_id = auth.uid()
  - [x] Add error handling: not found, permission denied, constraint violations
- **Skills Reference:**
  - **supabase-rls-auth:** Reference "Query Patterns" for RLS-enforced updates
  - Apply "Error Mapping Pattern" for database errors to user-friendly messages
  - Use "Optimistic Concurrency Control Pattern" for conflict detection via timestamps
- **Acceptance Criteria:**
  - [x] UPDATE enforces RLS (user cannot update others' activities)
  - [x] DELETE soft-deletes with timestamp
  - [x] RESTORE recovers deleted items with is_deleted=false
  - [x] Conflict detection compares timestamps correctly
  - [x] Trash queries only show user's deleted items
  - [x] All operations idempotent where applicable
- **Estimated Time:** 2 hours

---

#### Task 3.2: Implement Offline Queue with IndexedDB Persistence
- **Status:** ✅ Completed
- **Requirements:** Req 18 (offline sync queue), Req 24 (offline queue idempotency)
- **Description:** Implement infrastructure layer for managing offline edits via IndexedDB queue, tracking sync status, and auto-syncing when online.
- **Skills utilizadas:** `error-handling` - Implement Sync Queue Pattern with conflict handling during sync and connection loss recovery.
- **Sub-tasks:**
  - [x] Create `src/features/activities/infrastructure/offlineQueue.ts`
  - [x] Set up IndexedDB database with `offlineQueue` and `metadata` tables
  - [x] Implement `addToQueue(action, data)`: stores action (UPDATE/DELETE) with status=PENDING
  - [x] Implement `getQueueItems()`: retrieves all pending items from IndexedDB
  - [x] Implement `markAsSynced(itemId)`: updates status to SYNCED with syncedAt timestamp
  - [x] Implement `markAsFailed(itemId, error)`: updates status to FAILED with error message
  - [x] Implement `removeFromQueue(itemId)`: deletes from queue after successful sync
  - [x] Implement sync orchestration: iterate queue, sync each item, mark success/failure
  - [x] Handle conflicts during sync: mark as FAILED, alert user
  - [x] Add offline detection: listen for online/offline events, auto-sync when online
- **Skills Reference:**
  - **pwa-offline-patterns:** Reference "Client-Side Caching Pattern" with IndexedDB
  - Apply "Sync Queue Pattern" for managing offline changes
  - Use "Conflict Resolution Pattern" for handling sync failures
  - Reference "Service Worker Integration" for online/offline detection
- **Acceptance Criteria:**
  - [x] Offline edits queued in IndexedDB
  - [x] Queue survives page reload
  - [x] Auto-sync when online (detected via online event)
  - [x] Successful syncs marked and removed from queue
  - [x] Failed syncs marked with error for user retry
  - [x] Sync idempotent: syncing twice = same server state
- **Estimated Time:** 2 hours

---

#### Task 3.3: Implement React Query Cache Invalidation for Updates
- **Status:** ✅ Completed
- **Requirements:** Req 6-7 (optimistic updates), Req 16 (realtime sync updates)
- **Description:** Implement React Query hooks and mutations for managing cache invalidation on updates/deletes with optimistic updates and realtime sync integration.
- **Skills utilizadas:** `error-handling` - Implement Optimistic Update Pattern with rollback on server error and cache invalidation.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/hooks/useUpdateActivityMutation.ts`
  - [x] Implement mutation: sends update to server, invalidates related queries
  - [x] Add optimistic update: update UI immediately before server response
  - [x] Rollback on error: revert optimistic update if server fails
  - [x] Create `useDeleteActivityMutation.ts` for soft delete
  - [x] Create `useRestoreActivityMutation.ts` for restoring from trash
  - [x] Implement query invalidation on all mutations: invalidate ['activities'], ['activity', id]
  - [x] Add cache update: update single activity in cache if delete successful
  - [x] Integrate Realtime subscriptions: listen for updates, invalidate cache on remote changes
  - [x] Test cache consistency after mutations and realtime events
- **Skills Reference:**
  - **next-js-server-actions:** Use React Query mutation pattern from skill
  - Reference "Optimistic Update Pattern" for immediate UI feedback
  - Apply "Cache Invalidation Pattern" for consistency
  - **pwa-offline-patterns:** Reference "Offline-First Sync Pattern" for queue integration
- **Acceptance Criteria:**
  - [x] Optimistic updates apply immediately
  - [x] Cache invalidated on success
  - [x] Rollback on server error
  - [x] Realtime changes trigger cache updates
  - [x] Cache consistent with server state
- **Estimated Time:** 1.5 hours

---

### Phase 4: Presentation Layer - Components

#### Task 4.1: Implement Polymorphic ActivityEditor Component with All Variants
- **Status:** ✅ Completed
- **Requirements:** Req 1-5 (edit screens), Req 7 (optimistic update), Req 8 (cancel), Req 14-15 (conflict resolution)
- **Description:** Create comprehensive ActivityEditor modal component supporting Tasks, Exams, Assignments with form pre-population, real-time validation, optimistic updates, and conflict resolution UI.
- **Skills utilizadas:** `ui-components` - Build polymorphic modal component with variant-specific fields, real-time validation, undo/redo, and conflict resolution UI.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/ActivityEditor.tsx`
  - [x] Implement component: polymorphic with type prop (task | exam | assignment)
  - [x] Load activity data and store as originalData
  - [x] Render Task variant: title, description, priority, status, dueDate fields
  - [x] Render Exam variant: subject, date, time, examType, content, location, notes
  - [x] Render Assignment variant: subject, dueDate, description, type, status, criteria
  - [x] Mark read-only fields: id, userId, createdAt, updatedAt (disabled input)
  - [x] Implement real-time validation: highlight errors as user types
  - [x] Disable save button when invalid or no changes
  - [x] Implement save handler: optimistic update, send to server, handle response
  - [x] Implement cancel handler: confirm if dirty, discard changes
  - [x] Integrate undo/redo buttons: show canUndo/canRedo state, execute on click
  - [x] Implement conflict resolver UI: show server vs client versions, offer 3 resolution options
  - [x] Add keyboard shortcuts: Ctrl+Z undo, Ctrl+Y redo, Enter to save, Escape to close
  - [x] Test all 3 variants with different data states
- **Skills Reference:**
  - **clean-architecture-patterns:** Use "Composition Pattern" for polymorphic variants
  - Apply "Presentation Layer Pattern" for thin view with business logic delegated
  - Reference "Error Handling Pattern" for showing validation errors
  - **react-testing-patterns:** Testable component structure with isolated state
- **Acceptance Criteria:**
  - [x] All 3 variants render correctly with proper fields
  - [x] Form pre-populated with current activity data
  - [x] Real-time validation shows errors
  - [x] Save button disabled when invalid
  - [x] Optimistic updates feel responsive
  - [x] Conflict modal offers 3 options
  - [x] Undo/Redo buttons work with keyboard and click
  - [x] Mobile responsive (full-screen), desktop responsive (600px)
- **Estimated Time:** 3 hours

---

#### Task 4.2: Implement TrashBin Component for Soft Deleted Activities
- **Status:** ✅ Completed
- **Requirements:** Req 9-10 (soft delete + trash), 20 (empty states)
- **Description:** Create TrashBin component showing deleted activities with recovery countdown, restore/permanent delete actions.
- **Skills utilizadas:** `ui-components` - Build trash component with recovery countdown, restore/delete actions, and empty state handling.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/TrashBin.tsx`
  - [x] Fetch deleted activities from repository
  - [x] Calculate days until permanent delete: 30 - days_in_trash
  - [x] Display list of deleted items: title, deletion date, days remaining
  - [x] Implement "Restaurar" button: calls restoreActivity, updates list
  - [x] Implement "Deletar Permanentemente" button: with confirmation, permanent removal
  - [x] Show empty state: "Nenhuma atividade na lixeira"
  - [x] Show loading skeleton while fetching
  - [x] Handle errors gracefully
- **Skills Reference:**
  - **react-testing-patterns:** "Component Testing Pattern" for testing restore/delete actions
  - **clean-architecture-patterns:** "Presentation Layer Pattern" for clean UI
- **Acceptance Criteria:**
  - [x] Deleted items displayed with all metadata
  - [x] Days remaining calculated correctly
  - [x] Restore and delete actions functional
  - [x] Empty state shows when no items
  - [x] Error handling graceful
- **Estimated Time:** 1.5 hours

---

#### Task 4.3: Implement ConflictResolver Modal with Resolution Options
- **Status:** ✅ Completed
- **Requirements:** Req 14-15 (conflict detection and resolution), Req 30 (3+ options)
- **Description:** Create modal component showing conflict details (server vs client data) and offering 3 resolution options: reload, discard, keep local.
- **Skills utilizadas:** `ui-components` - Build conflict resolver modal with side-by-side data comparison and three distinct resolution option cards.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/ConflictResolver.tsx`
  - [x] Display conflict information: which fields diverged, timestamps
  - [x] Show 3 options as clickable cards:
    - Option 1: "Recarregar dados" - load server version
    - Option 2: "Descartar minhas mudanças" - close editor
    - Option 3: "Manter minhas mudanças" - attempt save
  - [x] On each option, call callback and close modal
  - [x] Display side-by-side comparison: server data vs client data (JSON)
  - [x] Add explanatory text for each option
- **Skills Reference:**
  - **react-testing-patterns:** "Component Testing Pattern" for testing option selection
  - **clean-architecture-patterns:** "Presentation Layer Pattern"
- **Acceptance Criteria:**
  - [x] 3 options displayed clearly
  - [x] Data comparison shown
  - [x] Each option functional and clear
  - [x] Modal closes after selection
- **Estimated Time:** 1 hour

---

#### Task 4.4: Implement BulkActionBar for Multi-Select Operations
- **Status:** ✅ Completed
- **Requirements:** Req 19-20 (bulk delete, bulk status change)
- **Description:** Create sticky bottom bar for bulk operations when multiple activities are selected: bulk delete, bulk status change.
- **Skills utilizadas:** `ui-components` - Build sticky action bar for bulk operations with selection count, status dropdown, and confirmation dialogs.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/BulkActionBar.tsx`
  - [x] Show only when items selected
  - [x] Display selection count: "N selecionadas"
  - [x] Implement status dropdown: show valid statuses, bulk update selected
  - [x] Implement bulk delete: with confirmation, delete all selected
  - [x] Implement clear selection button
  - [x] Position: sticky bottom of page
  - [x] Mobile responsive: buttons stack or collapse to menu
- **Skills Reference:**
  - **react-testing-patterns:** Test bulk operations with multiple selections
  - **clean-architecture-patterns:** "Composition Pattern" for reusable action bar
- **Acceptance Criteria:**
  - [x] Shows only when items selected
  - [x] Bulk delete works with confirmation
  - [x] Bulk status change updates all selected
  - [x] Clear button deselects all
  - [x] UI responsive and accessible
- **Estimated Time:** 1.5 hours

---

### Phase 5: Server Actions & Mutations

#### Task 5.1: Implement updateActivityAction Server Action with Conflict Detection
- **Status:** ✅ Completed
- **Requirements:** Req 6-7 (update with validation), Req 14 (conflict detection), Req 22 (idempotence)
- **Description:** Create Server Action for updating activities with Zod validation, RLS enforcement, conflict detection via timestamps, and error handling.
- **Skills utilizadas:** `next-js-server-actions` - Implement Server Action with Zod validation, conflict detection via timestamps, and RLS verification.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/actions/updateActivity.ts`
  - [x] Implement Server Action: `'use server'` directive
  - [x] Validate input with Zod schema (double validation)
  - [x] Extract userId from session
  - [x] Fetch current activity with RLS filter
  - [x] Check not found, permission denied
  - [x] Compare expectedUpdatedAt with server's updatedAt: if server newer, return CONFLICT
  - [x] If conflict, return error with serverData and clientData for UI resolution
  - [x] If no conflict, perform UPDATE
  - [x] Return success with updated activity or error
  - [x] Handle all error codes: VALIDATION_ERROR, CONFLICT, NOT_FOUND, FORBIDDEN, NETWORK_ERROR
  - [x] Add logging for conflicts (for debugging)
- **Skills Reference:**
  - **next-js-server-actions:** Use "Server Action Pattern" with Zod and error handling
  - Reference "Authentication Pattern" for user context extraction
  - Apply "Optimistic Concurrency Control Pattern" for conflict detection
  - **supabase-rls-auth:** Ensure RLS applied by using server client
- **Acceptance Criteria:**
  - [x] Zod validation enforced, invalid inputs rejected
  - [x] RLS verified (user cannot update others' activities)
  - [x] Conflict detection accurate
  - [x] All error cases handled with clear messages
  - [x] Update is idempotent (multiple calls with same data = same result)
- **Estimated Time:** 1.5 hours

---

#### Task 5.2: Implement deleteActivityAction and restoreActivityAction Server Actions
- **Status:** ✅ Completed
- **Requirements:** Req 9-10 (delete + restore), Req 6 (soft delete idempotency)
- **Description:** Create Server Actions for soft delete (move to trash) and restore (recover from trash) operations.
- **Skills utilizadas:** `next-js-server-actions` - Implement soft delete and restore Server Actions with RLS enforcement and idempotent state transitions.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/actions/deleteActivity.ts`
  - [x] Implement `deleteActivityAction(activityId)` soft delete
  - [x] Validate activityId, extract userId, RLS check
  - [x] UPDATE activities: set is_deleted=true, deleted_at=now()
  - [x] Return success with recovery deadline (30 days)
  - [x] Create `src/features/activities/presentation/actions/restoreActivity.ts`
  - [x] Implement `restoreActivityAction(activityId)` soft restore
  - [x] Check activity exists and is_deleted=true
  - [x] UPDATE: set is_deleted=false
  - [x] Return success with restored activity
  - [x] Create `permanentlyDeleteActivity.ts` for hard delete
  - [x] Verify soft delete is idempotent: calling twice = same result
- **Skills Reference:**
  - **next-js-server-actions:** Follow Server Action Pattern
  - Apply "Soft Delete Pattern" for data preservation
  - **supabase-rls-auth:** Ensure RLS on all operations
- **Acceptance Criteria:**
  - [x] Soft delete moves to trash (is_deleted=true)
  - [x] Restore recovers item (is_deleted=false)
  - [x] Hard delete permanent removal
  - [x] All idempotent
  - [x] RLS enforced
- **Estimated Time:** 1 hour

---

#### Task 5.3: Implement Offline Queue Sync Server Action
- **Status:** ✅ Completed
- **Requirements:** Req 18 (offline sync), Req 24 (offline queue idempotency)
- **Description:** Create Server Action for syncing offline queue items to server, handling conflicts, and reporting sync status.
- **Skills utilizadas:** `next-js-server-actions` - Implement batch sync Server Action with conflict detection and idempotent operation handling.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/actions/syncOfflineQueue.ts`
  - [x] Implement `syncOfflineQueueAction(queueItems)` Server Action
  - [x] For each queue item: execute UPDATE or DELETE via repository
  - [x] On success: mark as SYNCED, return success
  - [x] On conflict: detect, return conflict for user resolution
  - [x] On other error: mark as FAILED, return error
  - [x] Return sync summary: synced count, failed count, conflicts
  - [x] Ensure sync is idempotent: syncing same item twice = same server state
- **Skills Reference:**
  - **pwa-offline-patterns:** Reference "Sync Queue Pattern" for batch sync
  - Apply "Conflict Resolution Pattern"
  - **next-js-server-actions:** Server Action for sensitive operations
- **Acceptance Criteria:**
  - [x] Queue items synced successfully
  - [x] Conflicts detected and reported
  - [x] Failures handled and reported
  - [x] Sync idempotent
- **Estimated Time:** 1.5 hours

---

### Phase 6: Testing & Property Validation

#### Task 6.1: Unit Tests for Update/Delete Logic and State Machines (85%+ Coverage)
- **Status:** ✅ Completed
- **Requirements:** Property 8-9, 22, 27 (state transitions, idempotency, timestamps)
- **Description:** Create comprehensive unit tests for state machines, conflict detection, and update/delete logic.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/stateMachines.test.ts`
  - [x] Test Task transitions: TODO ↔ IN_PROGRESS ↔ COMPLETED (all valid)
  - [x] Test Assignment transitions: PENDING → SUBMITTED → GRADED (with reversal)
  - [x] Test invalid transitions rejected
  - [x] Test Exam (no status transitions)
  - [x] Create `__tests__/features/activities/conflictDetection.test.ts`
  - [x] Test conflict detection: serverUpdatedAt > clientExpected = conflict
  - [x] Test no conflict: timestamps aligned
  - [x] Test all 3 resolution paths (reload, discard, keep)
  - [x] Create `__tests__/features/activities/updateIdempotency.test.ts`
  - [x] Test update action twice with identical data = same result
  - [x] Test read-only fields ignored (id, userId, createdAt not in payload)
  - [x] Test soft delete idempotent
  - [x] Test restore idempotent
  - [x] Achieve 85%+ coverage on update/delete code
- **Skills Reference:**
  - **react-testing-patterns:** Use "Unit Test Pattern" with Vitest
  - Reference "Mock Pattern" for dependencies
  - Apply "Setup/Teardown Pattern" for consistent test state
- **Acceptance Criteria:**
  - [x] All state transitions tested
  - [x] Conflict scenarios covered
  - [x] Idempotency verified
  - [x] Coverage 85%+
  - [x] All tests pass
- **Estimated Time:** 2.5 hours

---

#### Task 6.2: Property-Based Tests for All 30 Correctness Properties
- **Status:** ✅ Completed
- **Requirements:** Property 1-30 (all correctness properties)
- **Description:** Implement property-based tests using fast-check validating all 30 correctness properties with 100+ iterations each.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/updateProperties.test.ts`
  - [x] Implement PBT for Property 1-7: form population, validation, optimistic updates, cancel, soft delete
  - [x] Implement PBT for Property 8-13: state transitions, conflict detection, undo/redo
  - [x] Implement PBT for Property 14-20: bulk operations, keyboard nav, button state, unsaved warning
  - [x] Implement PBT for Property 21-25: serialization, update idempotence, read-only fields, offline sync
  - [x] Implement PBT for Property 26-30: responsive design, timestamp monotonicity, field population
  - [x] Each property: 100+ iterations with fast-check arbitraries
  - [x] Generate activity and update arbitraries
  - [x] Document property statements clearly
  - [x] Report on coverage and shrunk counterexamples
- **Skills Reference:**
  - **react-testing-patterns:** Reference "Property-Based Testing Pattern"
  - Use "Custom Arbitrary Pattern" for domain-specific data generation
  - Apply "Shrinking Pattern" for minimal failing examples
- **Acceptance Criteria:**
  - [x] All 30 properties have explicit test
  - [x] Each runs 100+ iterations
  - [x] Fast-check reports shrunk counterexamples
  - [x] All properties pass
- **Estimated Time:** 4 hours

---

#### Task 6.3: Integration Tests for Full Edit-Save-Sync Workflows
- **Status:** ✅ Completed
- **Requirements:** Property 4, 11, 22 (optimistic updates, undo recovery, idempotence)
- **Description:** Create integration tests covering complete workflows: edit form → save → sync, conflict handling, offline queue sync.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/integration.test.ts`
  - [x] Set up test database with seeded activities
  - [x] Test workflow 1: Edit task → save → verify in database
  - [x] Test workflow 2: Conflict scenario → detect → resolve (3 paths)
  - [x] Test workflow 3: Undo multiple edits → verify each reversion
  - [x] Test workflow 4: Offline edit → queue → reconnect → sync
  - [x] Test workflow 5: Bulk delete multiple → verify soft delete
  - [x] Test workflow 6: Restore from trash → verify back in list
  - [x] Measure performance for each workflow
  - [x] Test error scenarios: network failure, permission denied, validation error
- **Skills Reference:**
  - **react-testing-patterns:** "Integration Test Pattern" with real dependencies
  - Reference "Test Database Pattern"
  - Apply "Async Test Pattern" for network scenarios
- **Acceptance Criteria:**
  - [x] All workflows tested end-to-end
  - [x] Performance measured
  - [x] Error scenarios handled
  - [x] Tests reliable (no flakiness)
- **Estimated Time:** 2.5 hours

---

#### Task 6.4: E2E Tests with Playwright for User Workflows
- **Status:** ✅ Completed
- **Requirements:** All requirements (user-visible behavior)
- **Description:** Create Playwright E2E tests for critical user flows: edit form, save, undo/redo, conflict resolution, trash recovery.
- **Sub-tasks:**
  - [x] Create `e2e/activities-crud.spec.ts`
  - [x] Test E2E 1: Navigate to activity → click Edit → see form pre-populated
  - [x] Test E2E 2: Edit fields → save → see success toast → close modal
  - [x] Test E2E 3: Edit in multiple tabs → see conflict modal → resolve
  - [x] Test E2E 4: Make changes → click Ctrl+Z → undo → Ctrl+Y → redo
  - [x] Test E2E 5: Delete activity → see in trash → restore → back in list
  - [x] Test E2E 6: Make changes → close tab without saving → confirm unsaved warning
  - [x] Test E2E 7: Offline edit → offline indicator → reconnect → sync
  - [x] Test E2E 8: Bulk select multiple → delete all → confirm
  - [x] Test E2E 9: Mobile layout: form full-screen, buttons accessible
  - [x] Test E2E 10: Keyboard nav: Tab through fields, Enter to save, Escape to close
  - [x] Test E2E 11: Accessibility: screen reader announces field labels and errors
- **Skills Reference:**
  - **react-testing-patterns:** "E2E Test Pattern" with Playwright
  - Reference "Page Object Model Pattern" for maintainability
- **Acceptance Criteria:**
  - [x] All workflows passing
  - [x] Mobile and desktop tested
  - [x] Keyboard and accessibility validated
  - [x] Tests reliable and reusable
- **Estimated Time:** 3 hours

---

#### Task 6.5: Accessibility Audit and WCAG 2.1 AA Compliance
- **Status:** ✅ Completed
- **Requirements:** Req 25-26 (keyboard nav, accessibility labels)
- **Description:** Comprehensive accessibility audit for editor forms: labels, ARIA, keyboard navigation, color contrast, screen reader.
- **Sub-tasks:**
  - [x] Install axe DevTools, run automated scan
  - [x] Add `aria-label` to all buttons and icon-only controls
  - [x] Add `aria-required="true"` to required fields
  - [x] Associate labels with `<label htmlFor="fieldId">`
  - [x] Add `aria-invalid="true"` and `aria-describedby` on error fields
  - [x] Use semantic HTML: form, fieldset, legend
  - [x] Test keyboard navigation: Tab, Shift+Tab, Enter, Escape
  - [x] Test with screen reader: NVDA or JAWS
  - [x] Check color contrast: >= 4.5:1 for normal text
  - [x] Test focus management: no focus traps, clear visual focus
  - [x] Verify form validation messages announced
  - [x] Create accessibility checklist, verify all items
- **Skills Reference:**
  - **react-testing-patterns:** "Accessibility Testing Pattern"
- **Acceptance Criteria:**
  - [x] Axe audit: 0 violations
  - [x] Keyboard navigation works
  - [x] Screen reader announces all content
  - [x] Color contrast >= 4.5:1
  - [x] Focus management clear
  - [x] WCAG 2.1 AA checklist 100%
- **Estimated Time:** 2 hours

---

### Phase 7: Performance & Documentation

#### Task 7.1: Performance Profiling and Optimization
- **Status:** ✅ Completed
- **Requirements:** Req 7 (optimistic updates responsive), Req 18 (offline sync efficient)
- **Description:** Profile component rendering, server action latency, and cache performance; optimize hotspots.
- **Sub-tasks:**
  - [x] Use React DevTools Profiler to measure render times
  - [x] Measure save action latency: target < 1s end-to-end
  - [x] Measure undo/redo execution: target < 50ms
  - [x] Measure conflict detection: target < 100ms
  - [x] Profile offline queue sync: batch processing efficient
  - [x] Check bundle size: editor components < 150KB
  - [x] Test cache performance: hit rates and memory
  - [x] Optimize N+1 queries if present
  - [x] Document performance bottlenecks and fixes
- **Skills Reference:**
  - **clean-architecture-patterns:** "Performance Patterns"
- **Acceptance Criteria:**
  - [x] Save operation < 1s
  - [x] Undo/Redo < 50ms
  - [x] Bundle size not bloated
  - [x] Cache efficient
- **Estimated Time:** 1.5 hours

---

#### Task 7.2: Code Documentation and Comments
- **Status:** ✅ Completed
- **Requirements:** Req 35 (documentation)
- **Description:** Add comprehensive JSDoc to functions, components, and complex logic.
- **Sub-tasks:**
  - [x] Add JSDoc to state machine methods
  - [x] Document conflict detection algorithm
  - [x] Document ActivityEditor component: props, behavior, examples
  - [x] Document all Server Actions: purpose, validations, errors
  - [x] Document undo/redo stack operations
  - [x] Document offline queue sync flow
  - [x] Create README in `/src/features/activities/` with architecture overview
  - [x] Document all indices and schema migrations
  - [x] Link to relevant skills documentation
- **Skills Reference:**
  - **clean-architecture-patterns:** Documentation patterns
- **Acceptance Criteria:**
  - [x] All public functions have JSDoc
  - [x] Components documented with props
  - [x] Complex logic explained
  - [x] README comprehensive
- **Estimated Time:** 1 hour

---

#### Task 7.3: Feature Completion Verification and Cleanup
- **Status:** ✅ Completed
- **Requirements:** All 30 requirements + 30 properties
- **Description:** Final verification that all requirements and properties are met, cleanup, and prepare for completion.
- **Sub-tasks:**
  - [x] Verify all 30 requirements satisfied
  - [x] Verify all 30 properties pass PBT
  - [x] Run full test suite: unit, integration, E2E, accessibility
  - [x] Verify coverage > 85%
  - [x] Run linter, fix warnings
  - [x] Run TypeScript strict mode: 0 errors
  - [x] Clean up console.log, dead code
  - [x] Verify accessibility audit passes
  - [x] Create feature demo walkthrough
  - [x] Final git commit
- **Skills Reference:**
  - **clean-architecture-patterns:** Verification checklists
- **Acceptance Criteria:**
  - [x] All 30 requirements checked
  - [x] All 30 properties passing
  - [x] Test coverage >= 85%
  - [x] No linting or TypeScript errors
  - [x] Accessibility passes
- **Estimated Time:** 1 hour

---

## Implementation Guidelines

### Clean Architecture Patterns (from clean-architecture-patterns skill)

**Apply throughout:**
- **Domain Entity Pattern:** Activities are rich objects with state machines and embedded business rules
- **Repository Pattern:** Domain defines interface, infrastructure implements with Supabase
- **Use Case Pattern:** Complex logic (conflict resolution, undo/redo) handled in application layer
- **Dependency Injection:** Services injected for testability
- **Error Handling Pattern:** Explicit error types, proper propagation, user-friendly messages
- **State Machine Pattern:** Explicit validation of status transitions
- **Soft Delete Pattern:** Logical deletion with recovery capability

### Server Actions (from next-js-server-actions skill)

- Use `'use server'` at file top
- Validate inputs with Zod on server
- Extract user context (authenticated)
- Return `{ success: boolean, data?: T, error?: { code, message } }`
- Conflict detection via timestamps (optimistic concurrency control)
- Never expose database errors to client

### Real-Time & Offline (from pwa-offline-patterns skill)

- **Offline Queue:** IndexedDB with PENDING/SYNCED/FAILED status
- **Auto-Sync:** Listen for online event, sync queue
- **Sync Idempotency:** Same item synced twice = same server state
- **Conflict Resolution:** Server always wins on divergence
- **Error Recovery:** Retry with exponential backoff

### React & Testing (from react-testing-patterns skill)

- **Component Testing:** Test behavior, not implementation
- **Property-Based Testing:** 100+ iterations, formal properties
- **Custom Arbitraries:** Domain-specific data generation
- **Accessibility Testing:** Keyboard nav, screen reader, ARIA

### Database Optimization (from supabase-rls-auth skill)

- **RLS:** Every query filtered by user_id
- **Conflict Detection:** Compare updatedAt timestamps
- **Soft Delete:** is_deleted flag + deleted_at timestamp
- **Performance:** Indices on (user_id, ...) for all queries

---

## Success Metrics

| Metric | Target | How to Verify |
|--------|--------|--------------|
| Update Action Latency | < 1s | Performance profiler |
| Undo/Redo Execution | < 50ms | React DevTools Profiler |
| Conflict Detection | < 100ms | Timing measurements |
| Test Coverage | > 85% | Vitest coverage report |
| Property Tests | 30/30 passing | Fast-check runs |
| E2E Tests | 11/11 passing | Playwright results |
| Accessibility | WCAG 2.1 AA | Axe audit + manual |
| Offline Sync Idempotency | 100% | Multiple sync runs |

---

## Testing Checklist

### Unit Tests
- [x] State machine transitions (valid/invalid)
- [x] Conflict detection (timestamp comparison)
- [x] Update idempotency (same data twice = same result)
- [x] Soft delete idempotency
- [x] Read-only fields ignored
- [x] Coverage: 85%+

### Property-Based Tests
- [x] All 30 properties implemented
- [x] 100+ iterations each
- [x] Shrinking reports minimal examples
- [x] Properties documented

### Integration Tests
- [x] Edit → save → sync workflow
- [x] Conflict detection and resolution
- [x] Undo/redo state recovery
- [x] Offline queue sync
- [x] Bulk operations
- [x] Trash recovery

### E2E Tests
- [x] 11+ critical workflows
- [x] Mobile, tablet, desktop
- [x] Keyboard navigation
- [x] Screen reader compatibility
- [x] Offline detection and sync

### Accessibility
- [x] Axe audit: 0 violations
- [x] Keyboard nav works
- [x] Screen reader announces content
- [x] Contrast >= 4.5:1
- [x] Focus management clear

---

## Next Steps After This Feature

1. **Spec 5: Dashboard** - Summary views and statistics
2. **Spec 6: Calendar** - Calendar grid view with visualization
3. **Spec 7: Notifications** - Web push reminders and scheduling
4. **Spec 8: PWA & Offline** - Service Worker, manifest, offline-first strategy
