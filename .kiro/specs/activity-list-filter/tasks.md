# Tasks - activity-list-filter

## Overview

This document outlines the implementation plan for the **activity-list-filter** feature MVP, which enables university students to list, search, filter, and synchronize three types of academic activities (Tasks, Exams, Assignments) with intuitive filtering, real-time sync, and intelligent caching. The feature requires implementation across all four layers of Clean Architecture, with comprehensive property-based testing of 37 correctness properties. Estimated delivery: ~4 days of focused development.

---

## Correctness Properties Being Validated

The following 37 properties must be validated through automated tests (unit, integration, E2E, and property-based):

1. **Skeleton Loading Appears Initially** - Skeleton loaders display before data, replaced once available
2. **All Loaded Activities Display as Cards** - All server activities render as cards
3. **Card Contains Required Fields per Type** - Task/Exam/Assignment cards show all required fields
4. **Search Debounce Delays Execution** - Rapid keypresses execute only final search term (300ms)
5. **Search Results are Case-Insensitive** - Searching "Cálculo" matches "cálculo", "CÁLCULO"
6. **Clearing Search Resets to Full List** - Clear search restores all activities (count unchanged)
7. **Enter Key Bypasses Debounce** - Enter immediately executes search without 300ms wait
8. **Search Results Counter Matches Actual Results** - Counter = actual result count
9. **URL Reflects Current Search Term** - Query string updates: `?search=<term>`
10. **Empty Filter Shows All Activities** - No filters selected = all activities displayed
11. **Priority Filter Returns Only Selected Priorities** - Filter returns only LOW/MEDIUM/HIGH selected
12. **Multiple Priority Filters Use OR Logic** - LOW or MEDIUM or HIGH (union)
13. **Filters Apply in Under 100ms** - List updates within 100ms of filter change
14. **URL Updates When Filters Change** - Query string encoded: `?priority=low,medium&subject=id`
15. **No Subject Filter Shows All Subjects** - All subjects appear without subject filter
16. **Subject Filter Returns Only Selected Subject** - Returns only activities of selected subject
17. **Subject Dropdown Loads Within 500ms** - Dropdown populates within 500ms (Req 13)
18. **Date Range Filter Returns Activities Within Bounds** - Returns only dueDate >= from AND <= to
19. **Invalid Date Range Shows Error** - from > to triggers "Data inicial deve ser antes da final" error
20. **Undated Tasks Included in Date Filtered Results** - Tasks without dueDate included in results
21. **No Status Filter Shows All Statuses** - All statuses appear without status filter
22. **Status Filter Returns Only Selected Statuses** - Returns only selected statuses
23. **Combined Filters Use AND Logic** - All conditions must be satisfied simultaneously
24. **Multiple Filter State Persists in URL** - All active filters consolidated in query string
25. **Activity Counter Shows Filtered vs Total Count** - "Exibindo X de Y atividades"
26. **Sorting Reorders List Immediately** - List reorders within 100ms of sort selection
27. **Sort Selection Updates URL** - Query string updated: `?sort=date_desc`
28. **Large Lists Paginate Into Chunks of 20** - Lists > 20 items split into 20-item pages
29. **Load More Appends Next Page Without Duplication** - Appends without removing previous or showing duplicates
30. **Real-Time Sync Adds New Activity to List** - New activity appears in list within 500ms
31. **Real-Time Sync Updates Modified Activity Card** - Card updates with new data, no full re-render
32. **Real-Time Sync Removes Deleted Activity** - Card disappears with smooth animation
33. **Loaded Activities Persist to IndexedDB** - All activities stored in local cache
34. **Filter Validation Rejects Invalid Inputs** - Invalid filters rejected via Zod, no list update
35. **Overdue Tasks Show Overdue Badge** - Past due date + status != COMPLETED = red "Atrasada" badge
36. **Today's Tasks Show Today Badge** - dueDate == today = "Vence hoje" badge
37. **Mobile Layout Stacks Vertically** - Mobile (< 768px) = 100% width cards, vertical stack

---

## Implementation Phases

### Phase 1: Domain & Data Layer Setup

#### Task 1.1: Initialize Feature Structure and Validate Filter Schemas
- **Status:** ✅ Completed
- **Requirements:** Req 27 (Zod validation for filters)
- **Description:** Set up feature module structure, define filter domain entities with business rules, and establish Zod schema validation framework with Portuguese error messages.
- **Skills utilizadas:** `form-handling` - Establish Zod schemas for all filter types with Portuguese error messages and validation refinements.
- **Sub-tasks:**
  - [x] Create `/src/features/activities/presentation/schemas/` directory with filter validation schemas
  - [x] Create `filterSchema.ts` with Zod schemas for FilterCriteria (search, priority, subject, dateRange, status, sort, pagination)
  - [x] Add validation refinements: `dateFrom <= dateTo`, `limit in [5, 100]`, `page >= 1`
  - [x] Set up Portuguese error messages for all validations
  - [x] Create type definitions from schemas
  - [x] Verify all schemas with TypeScript strict mode
- **Skills Reference:**
  - **clean-architecture-patterns:** Follow "Layered Architecture Overview" and "Presentation Layer Patterns" for schema organization
  - Apply "Value Object Pattern" for FilterCriteria as immutable validation object
- **Acceptance Criteria:**
  - [x] All 8 filter types validated (search, priority, subject, date, status, type, sort, pagination)
  - [x] Portuguese error messages for each validation rule
  - [x] No TypeScript errors with strict mode
  - [x] Schemas tested with valid and invalid inputs
- **Estimated Time:** 1 hour

---

#### Task 1.2: Design and Index Supabase Schema for Performance
- **Status:** ✅ Completed
- **Requirements:** Req 13, 33 (< 500ms discipline load, optimized queries, database indices)
- **Description:** Create migration to add critical indices on activities, tasks, exams, assignments tables to enable sub-500ms discipline loading and sub-100ms filter application.
- **Skills utilizadas:** `database-queries` - Create performance indices including full-text search for Portuguese stemming and filter optimization.
- **Sub-tasks:**
  - [x] Create migration: `supabase/migrations/003_add_activity_list_indices.sql`
  - [x] Add index: `(user_id, created_at DESC)` on activities for listing
  - [x] Add index: `(user_id, COALESCE(due_date, created_at) ASC)` on activities for date filtering
  - [x] Add index: `(user_id, subject_id)` on activities for discipline filtering
  - [x] Add index: `(user_id, priority)` on tasks for priority filtering
  - [x] Add full-text search index: `GIN(to_tsvector('portuguese', title || ' ' || description))`
  - [x] Test index effectiveness with EXPLAIN ANALYZE queries
  - [x] Document query plans and performance expectations
- **Skills Reference:**
  - **supabase-rls-auth:** Reference "Query Patterns" section for optimized data fetching with RLS applied
  - Use "Supabase Performance Tips" patterns for index design
  - Apply "Database Query Optimization" patterns for full-text search
- **Acceptance Criteria:**
  - [x] 5+ indices created on activities-related tables
  - [x] Query with all filters executes in < 100ms (measured)
  - [x] Discipline dropdown load in < 500ms
  - [x] Full-text search functional with Portuguese stemming
  - [x] EXPLAIN plans reviewed and optimized
- **Estimated Time:** 1.5 hours

---

#### Task 1.3: Generate and Validate Database Types
- **Status:** ✅ Completed
- **Requirements:** All requirements (type foundation)
- **Description:** Generate TypeScript types from updated Supabase schema and verify alignment with domain models.
- **Sub-tasks:**
  - [x] Run `supabase gen types typescript --local` to regenerate types
  - [x] Update `src/shared/types/database.types.ts` with new indices schema
  - [x] Verify Activity, Task, Exam, Assignment types match domain layer expectations
  - [x] Check no `any` types exist in generated code
  - [x] Test strict TypeScript compilation
- **Skills Reference:**
  - **clean-architecture-patterns:** Map database types to domain layer without leaking database details
- **Acceptance Criteria:**
  - [x] All generated types compile without errors
  - [x] Types reflect new indices and RLS policies
  - [x] Strict TypeScript mode passes
- **Estimated Time:** 30 minutes

---

### Phase 2: Application Layer - Filter Logic

#### Task 2.1: Implement Filter Domain Logic and Combinations
- **Status:** ✅ Completed
- **Requirements:** Req 5-10, 23-24 (multi-filter combination with AND/OR logic, URL state)
- **Description:** Implement application layer use cases for filtering logic: combining filters with AND logic, OR logic within filter type, and URL query string serialization/deserialization.
- **Skills utilizadas:** `property-testing` - Validate filter combinations with property-based testing to ensure AND/OR logic correctness and commutativity.
- **Sub-tasks:**
  - [x] Create `src/features/activities/application/useCases/filterActivities.ts`
  - [x] Implement `combineFilters()` function: accepts array of filter criteria, returns combined filter (AND logic between types, OR within type)
  - [x] Implement `parseQueryString()` function: parses URL query params into FilterCriteria object
  - [x] Implement `serializeQueryString()` function: converts FilterCriteria to URL-safe query string
  - [x] Create `validateFilterCombination()` function: checks for impossible filter combinations
  - [x] Add logic to preserve filter state across page reloads
  - [x] Document filter algebra (AND/OR semantics)
- **Skills Reference:**
  - **clean-architecture-patterns:** Use "Use Case Pattern" for complex filter orchestration
  - Apply "Command Pattern" for filter state management
  - Reference "Domain Service Pattern" for cross-concern filter logic
- **Acceptance Criteria:**
  - [x] All 6 filter combination scenarios tested (priority + date, subject + status, etc.)
  - [x] Query string round-trips: serialize → deserialize = original
  - [x] Invalid combinations rejected with error messages
  - [x] Filter order doesn't affect result (commutativity)
- **Estimated Time:** 2 hours

---

#### Task 2.2: Implement Search Logic with Debounce Strategy
- **Status:** ✅ Completed
- **Requirements:** Req 4-9 (search with 300ms debounce, case-insensitive, Enter bypass, URL sync)
- **Description:** Implement search orchestration logic handling case-insensitive matching, 300ms debounce coordination, immediate execute on Enter, and query string updates.
- **Skills utilizadas:** `property-testing` - Validate debounce timing, case-insensitivity, and search accuracy with property-based tests.
- **Sub-tasks:**
  - [x] Create `src/features/activities/application/useCases/searchActivities.ts`
  - [x] Implement `normalizeSearchTerm()` function: lowercase, trim, remove accents for matching
  - [x] Implement `createSearchQuery()` function: builds Supabase ILIKE query for title + description
  - [x] Implement debounce orchestration: stores pending search, cancels on new input, fires after 300ms
  - [x] Implement immediate-execute logic on Enter key detection
  - [x] Create search-specific query string handler
  - [x] Handle search result counting and "X results found" messaging
- **Skills Reference:**
  - **clean-architecture-patterns:** Use "Use Case Pattern" for search orchestration with side effects
  - Apply "Event-Driven Pattern" for debounce coordination
- **Acceptance Criteria:**
  - [x] Search case-insensitive (tested with uppercase, lowercase, accents)
  - [x] Debounce prevents multiple queries within 300ms
  - [x] Enter key bypasses debounce (verified with timing measurements)
  - [x] Search results counter accurate
  - [x] URL sync works: reload preserves search term
- **Estimated Time:** 1.5 hours

---

### Phase 3: Infrastructure Layer - Queries & Cache

#### Task 3.1: Implement Supabase Query Builder with RLS
- **Status:** ✅ Completed
- **Requirements:** Req 6, 13, 14, 29, 33 (optimized queries, RLS, performance targets)
- **Description:** Implement infrastructure queries for fetching activities with all filter combinations, ensuring RLS applied, indices used, and performance targets met.
- **Skills utilizadas:** `database-queries` - Build dynamic query builder with RLS enforcement, filter application, sorting, and pagination.
- **Sub-tasks:**
  - [x] Create `src/features/activities/infrastructure/supabaseActivityRepository.ts`
  - [x] Implement `getActivitiesByFilters()` method: dynamically builds query based on filter criteria
  - [x] Ensure RLS applied automatically: WHERE `user_id = auth.uid()`
  - [x] Add sorting logic: date asc/desc, priority, status, title, created
  - [x] Add pagination: offset/limit calculation
  - [x] Implement performance telemetry: measure query execution time
  - [x] Create `getSubjects()` method: cached, loads in < 500ms
  - [x] Add error handling with retry logic (exponential backoff)
  - [x] Document query patterns and expected performance
- **Skills Reference:**
  - **supabase-rls-auth:** Apply "RLS Policy Patterns" with user isolation for all queries
  - Reference "Query Patterns" section for optimized SELECT with filters
  - Use "Error Handling Pattern" for retry logic and user feedback
  - Apply "Performance Monitoring Pattern" for timing validation
- **Acceptance Criteria:**
  - [x] Queries use indices (verified with EXPLAIN ANALYZE)
  - [x] All filters supported (priority, subject, date, status, type)
  - [x] Sorting works for all 9 sort options
  - [x] Pagination returns correct pages with hasMore flag
  - [x] Discipline load < 500ms, filter apply < 100ms (measured)
  - [x] RLS verified: cross-user queries blocked
- **Estimated Time:** 2.5 hours

---

#### Task 3.2: Implement React Query Integration with Cache Management
- **Status:** ✅ Completed
- **Requirements:** Req 30 (React Query for state, cache, sync), Req 13 (performance), Req 19 (offline cache)
- **Description:** Implement React Query hooks for managing activity list state with intelligent caching (staleTime 5min), background refetch, and query invalidation on filter changes.
- **Skills utilizadas:** `fetching-data` - Implement React Query with smart caching strategy, stale-while-revalidate pattern, and background refetch on focus.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/hooks/useActivities.ts` hook
  - [x] Implement query key generation based on filters (unique per filter combination)
  - [x] Set cache strategy: `staleTime: 5 * 60 * 1000` (5 min), `gcTime: 10 * 60 * 1000` (10 min)
  - [x] Implement query invalidation: when filters change, pause old query, start new
  - [x] Add retry strategy: exponential backoff (1s, 2s, 4s, then fail)
  - [x] Create separate query for subject dropdown with aggressive caching
  - [x] Implement background refetch when page regains focus
  - [x] Return loading, error, data states for component consumption
  - [x] Handle pagination: append mode (infinite scroll) vs replace mode
- **Skills Reference:**
  - **next-js-server-actions:** Combine React Query with Server Actions pattern from skill
  - Use "Query Pattern" for caching and invalidation strategies
  - Apply "Error Handling Pattern" for retry logic
- **Acceptance Criteria:**
  - [x] Query executes with correct filter key
  - [x] Cache persists for 5 minutes without re-query
  - [x] Changing filter invalidates and refetches
  - [x] Retry works 3 times then shows error
  - [x] Subject dropdown caches aggressively
  - [x] Pagination appends without removing previous items
- **Estimated Time:** 2 hours

---

#### Task 3.3: Implement IndexedDB Cache for Offline-First Support
- **Status:** ✅ Completed
- **Requirements:** Req 19 (IndexedDB cache), Req 26 (offline functionality, PWA)
- **Description:** Implement local IndexedDB cache for storing fetched activities, enabling offline access, and sync strategy when connection restored.
- **Skills utilizadas:** `fetching-data` - Implement offline-first caching with IndexedDB and background sync strategy for activity list.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/lib/activityCache.ts`
  - [x] Set up Dexie instance with `activities` and `metadata` tables
  - [x] Implement `saveToCache()` function: stores activities with userId key, expiry timestamp
  - [x] Implement `getFromCache()` function: retrieves activities if not expired
  - [x] Implement cache invalidation: 1 hour TTL before revalidating with server
  - [x] Add offline detection: when offline, serve from cache with "offline mode" indicator
  - [x] Implement sync strategy: when online, fetch from server and update cache
  - [x] Create cache cleanup: clear expired entries on app startup
  - [x] Handle cache size limits to prevent storage bloat
- **Skills Reference:**
  - **pwa-offline-patterns:** Use "Client-Side Caching Pattern" and "Offline-First Synchronization" from skill
  - Reference "IndexedDB Implementation" patterns for database setup
  - Apply "Service Worker Integration Pattern" for offline detection
  - Use "Conflict Resolution Pattern" when server data differs from cache
- **Acceptance Criteria:**
  - [x] Activities saved to IndexedDB after fetch
  - [x] Cache retrieved when offline
  - [x] Cache expires after 1 hour
  - [x] Sync works when connection restored
  - [x] Cache doesn't grow unbounded (cleanup implemented)
- **Estimated Time:** 1.5 hours

---

### Phase 4: Presentation Layer - Components

#### Task 4.1: Implement ActivityListPage and Main Layout Structure
- **Status:** ✅ Completed
- **Requirements:** Req 1-3, 15-17 (list screens, responsive design)
- **Description:** Create main page component orchestrating filters, search, sorting, and list display with responsive sidebar/main layout for mobile/tablet/desktop.
- **Skills utilizadas:** `ui-components` - Build responsive layout with filter panel, search bar, and activity list using Tailwind breakpoints.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/pages/ActivityListPage.tsx`
  - [x] Parse URL query params and restore filter state
  - [x] Implement layout: mobile (filter toggle), tablet (collapsible sidebar), desktop (fixed sidebar)
  - [x] Connect filter panel with list: onChange handler syncs URL and invalidates React Query
  - [x] Render skeleton loaders during initial load
  - [x] Implement responsive grid/column layout using Tailwind (mobile 1col, tablet 2col option, desktop 1col)
  - [x] Add filter chip display showing active filters with remove buttons
  - [x] Implement "Limpar Filtros" reset functionality
  - [x] Add activity count display: "Exibindo X de Y atividades"
  - [x] Handle empty state (no activities), error state (failed load), loading state
- **Skills Reference:**
  - **clean-architecture-patterns:** Use "Presentation Layer Pattern" with components as thin views
  - Apply "Composition Pattern" for flexible layout structures
  - Use "State Management Pattern" for URL-driven state
  - Reference "Error Handling Pattern" for state display logic
- **Acceptance Criteria:**
  - [x] Layout responsive on mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
  - [x] Filter state persisted in URL and restored on reload
  - [x] All activity types supported (Tasks page, Exams page, Assignments page)
  - [x] Empty, error, loading states display correctly
  - [x] No layout shifts or flickering on state changes
- **Estimated Time:** 2 hours

---

#### Task 4.2: Implement ActivityCard Components (Task, Exam, Assignment Variants)
- **Status:** ✅ Completed
- **Requirements:** Req 1.5, 2.5, 3.5, 21-22 (card layout, urgency badges, action menu)
- **Description:** Create polymorphic ActivityCard component with variants for Tasks, Exams, Assignments showing type-specific fields, urgency badges, and quick action menu.
- **Skills utilizadas:** `ui-components` - Build polymorphic card component with variant-specific fields, urgency badges, and action menus.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/ActivityCard.tsx` (polymorphic)
  - [x] Implement Task variant: title, subject, due date (relative), priority, status, urgency badge
  - [x] Implement Exam variant: subject, formatted date/time, exam type, location, action menu
  - [x] Implement Assignment variant: subject, title, due date, type, status, action menu
  - [x] Create UrgencyBadge component: overdue (red), today (orange), soon (yellow), upcoming (gray)
  - [x] Implement action menu (⋮): "Ver", "Editar", "Deletar" with confirmations
  - [x] Add hover effects on desktop (reveal action buttons), maintained tap targets on mobile
  - [x] Create relative date formatter: "em 3 dias", "hoje", "atrasada", "sem prazo"
  - [x] Add subject color indicator from subject settings
  - [x] Implement animation: fade-in when loading, smooth transitions on state changes
- **Skills Reference:**
  - **react-testing-patterns:** Reference "Component Testing Pattern" for unit testing variants
  - Use "Composition Pattern" for reusable sub-components (badge, menu, actions)
  - Apply "Props Pattern" for flexible card customization
- **Acceptance Criteria:**
  - [x] All 3 variants render correctly with proper fields
  - [x] Urgency badges display for all 4 conditions (overdue, today, soon, upcoming)
  - [x] Action menu works with keyboard and mouse (accessible)
  - [x] Relative dates correct (today, tomorrow, 2 days, etc.)
  - [x] Card styling responsive on all breakpoints
- **Estimated Time:** 2 hours

---

#### Task 4.3: Implement ActivityList, SearchBar, and FilterPanel Components
- **Status:** ✅ Completed
- **Requirements:** Req 4-10, 25-27 (search, filters, sorting)
- **Description:** Create SearchBar with 300ms debounce, FilterPanel with multi-filter UI, and ActivityList as container rendering cards with pagination.
- **Skills utilizadas:** `form-handling` - Implement search with debounce logic, filter panel with dynamic loading, and pagination with "Load More" functionality.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/SearchBar.tsx`
  - [x] Implement debounce logic: 300ms timer, reset on new keypress, clearable input
  - [x] Add Enter key detection for immediate execution
  - [x] Show search result count
  - [x] Create clear button in input (visible when has text)
  - [x] Create `src/features/activities/presentation/components/ActivityFilters.tsx`
  - [x] Implement FilterGroup component for each filter type
  - [x] Add Discipline checkboxes with dynamic loading from React Query
  - [x] Add Date range pickers with preset shortcuts (Hoje, Esta Semana, Este Mês)
  - [x] Add Priority checkboxes (for Tasks)
  - [x] Add Status checkboxes (task-specific, assignment-specific)
  - [x] Add "Limpar Filtros" button
  - [x] Create `src/features/activities/presentation/components/ActivityList.tsx`
  - [x] Render activity cards in list/grid layout
  - [x] Implement "Carregar Mais" button with loading state
  - [x] Show total count: "Mostrando X de Y atividades"
  - [x] Handle loading (skeleton), error, empty states
- **Skills Reference:**
  - **react-testing-patterns:** Create "Controlled Component Pattern" for search input with debounce
  - Use "Custom Hook Pattern" for search debounce logic (separate from component)
  - Apply "Composition Pattern" for filter groups as reusable units
  - Reference "Accessibility Pattern" for ARIA labels on all inputs
- **Acceptance Criteria:**
  - [x] Search debounces 300ms, Enter bypasses
  - [x] Filters apply with < 100ms update
  - [x] Pagination works: append vs replace modes
  - [x] Sort selector changes order immediately
  - [x] All components keyboard navigable and screen-reader friendly
- **Estimated Time:** 2.5 hours

---

#### Task 4.4: Implement Real-Time Sync with Supabase Realtime
- **Status:** ✅ Completed
- **Requirements:** Req 18, 30-32 (real-time sync without flickering)
- **Description:** Implement Supabase Realtime subscriptions in React hooks to detect activity changes (create, update, delete) and update list without full re-render or flickering.
- **Skills utilizadas:** `fetching-data` - Implement Real-Time Subscriptions with RLS filtering and event batching to prevent flickering.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/hooks/useActivityRealtime.ts` hook
  - [x] Subscribe to Supabase Realtime events for activities table
  - [x] On INSERT: invalidate React Query cache, trigger refetch
  - [x] On UPDATE: find affected card in list, update data only (no full re-render)
  - [x] On DELETE: find affected card, animate removal then remove from state
  - [x] Handle connection loss: fall back to polling every 30s
  - [x] Handle reconnection: resync immediately when connection restored
  - [x] Batch multiple events within 100ms to prevent multiple re-renders
  - [x] Ensure RLS filters applied (only see own activities)
- **Skills Reference:**
  - **supabase-rls-auth:** Use "Real-Time Subscriptions" pattern with RLS-filtered channels
  - Reference "Event Listening Pattern" for update/delete handling
  - Apply "Error Recovery Pattern" for connection loss scenarios
  - **pwa-offline-patterns:** Reference "Sync Queue Pattern" for batched updates
- **Acceptance Criteria:**
  - [x] New activities appear in list within 500ms (verified with timing)
  - [x] Updated activities show new data without full list re-render
  - [x] Deleted activities animate out smoothly
  - [x] No flickering when real-time events received
  - [x] Fallback to polling works when Realtime unavailable
- **Estimated Time:** 1.5 hours

---

### Phase 5: Server Actions & API Integration

#### Task 5.1: Implement getActivities Server Action with Zod Validation
- **Status:** ✅ Completed
- **Requirements:** Req 29 (Server Actions with Zod), Req 13-14 (performance)
- **Description:** Create Server Action that validates filter inputs with Zod, calls repository with RLS applied, and returns paginated results.
- **Skills utilizadas:** `next-js-server-actions` - Implement Server Action with Zod validation, filter application, and RLS enforcement.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/actions/getActivities.ts`
  - [x] Add `'use server'` directive
  - [x] Implement Zod validation of input against filterCriteriaSchema
  - [x] Extract userId from session (authenticated user only)
  - [x] Build optimized Supabase query with all filters
  - [x] Apply RLS: WHERE user_id = auth.uid()
  - [x] Implement error handling: validation, auth, query errors
  - [x] Return success response: { success: true, data: { activities, total, page, limit, hasMore } }
  - [x] Return error response: { success: false, error: { code, message } }
  - [x] Add performance logging: measure query execution time
  - [x] Test with invalid inputs, authenticated users, cross-user attempts
- **Skills Reference:**
  - **next-js-server-actions:** Use "Server Action Pattern" with Zod validation and error handling
  - Reference "Authentication Pattern" for extracting user context
  - Apply "Error Response Pattern" for consistent error handling
  - **supabase-rls-auth:** Ensure RLS applied by using server client (not browser client)
- **Acceptance Criteria:**
  - [x] All filter combinations validated
  - [x] Invalid inputs rejected with clear error messages
  - [x] Queries execute < 100ms for filter application
  - [x] RLS enforced (verified: user can't see others' activities)
  - [x] Pagination metadata correct (hasMore flag, total count)
- **Estimated Time:** 1.5 hours

---

#### Task 5.2: Implement Batch Update Operations for Realtime Events
- **Status:** ✅ Completed
- **Requirements:** Req 18 (real-time batch updates to prevent flickering)
- **Description:** Create server actions for handling bulk cache invalidations and synced updates when multiple real-time events occur rapidly.
- **Skills utilizadas:** `next-js-server-actions` - Implement batch sync with debounced cache invalidation and conflict resolution.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/actions/syncActivities.ts`
  - [x] Implement `batchInvalidateCache()` function: collects multiple update events within 100ms window
  - [x] Implement `syncActivityData()` function: fetches fresh activity data for affected IDs
  - [x] Create debounced cache invalidation to prevent multiple refetches
  - [x] Implement optimistic updates: update UI immediately, sync with server in background
  - [x] Handle conflict resolution: server version wins if divergence detected
  - [x] Add telemetry: log batch size and timing
- **Skills Reference:**
  - **pwa-offline-patterns:** Use "Sync Queue Pattern" for batching updates
  - Reference "Conflict Resolution Pattern" for divergence handling
  - Apply "Optimistic Update Pattern" for perceived performance
- **Acceptance Criteria:**
  - [x] Multiple events within 100ms batched into single refetch
  - [x] No duplicate refetches for same activity ID
  - [x] Optimistic updates feel responsive
  - [x] Conflicts resolved correctly (server always wins)
- **Estimated Time:** 1 hour

---

### Phase 6: Testing & Property Validation

#### Task 6.1: Unit Tests for Filter Logic (85%+ Coverage)
- **Status:** ✅ Completed
- **Requirements:** Req 28 (> 85% coverage), Properties 10-25 (filter correctness)
- **Description:** Create comprehensive unit tests for filtering logic covering all filter combinations, edge cases, and invariants.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/filterLogic.test.ts`
  - [x] Test each filter type independently (priority, subject, date, status)
  - [x] Test multi-filter combinations with AND/OR logic
  - [x] Test filter state serialization/deserialization (URL round-trip)
  - [x] Test query string parsing: valid, invalid, missing parameters
  - [x] Test invalid date ranges: from > to, invalid dates
  - [x] Test empty filters: should return all activities
  - [x] Test filter application performance: < 100ms
  - [x] Test sorting for all 9 sort options
  - [x] Test pagination: page boundaries, hasMore flag
  - [x] Achieve 85%+ line coverage for filter-related code
- **Skills Reference:**
  - **react-testing-patterns:** Use "Unit Test Pattern" with Vitest and fast-check
  - Reference "Mock Pattern" for dependencies (repositories)
  - Apply "Setup/Teardown Pattern" for consistent test state
- **Acceptance Criteria:**
  - [x] All filter scenarios tested (6+ combinations)
  - [x] Edge cases covered: empty lists, single item, boundary values
  - [x] Coverage report shows 85%+ for filter logic
  - [x] All tests pass with Vitest
- **Estimated Time:** 2 hours

---

#### Task 6.2: Property-Based Tests for All 37 Correctness Properties
- **Status:** ✅ Completed
- **Requirements:** Req 28, 32 (property-based testing with 85%+ coverage)
- **Description:** Implement property-based tests using fast-check to validate all 37 correctness properties across generated activity datasets and filter combinations.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/filterProperties.test.ts`
  - [x] Implement PBT for Property 1-9: Search/debounce behavior
  - [x] Implement PBT for Property 10-25: Filter combinations and logic
  - [x] Implement PBT for Property 26-29: Sorting and pagination
  - [x] Implement PBT for Property 30-32: Real-time sync behavior
  - [x] Implement PBT for Property 33-37: Caching, validation, badges
  - [x] Each property: 100+ iterations with random-generated datasets
  - [x] Use custom arbitraries for Activity generation (valid TZ, UUIDs, etc.)
  - [x] Document property statements clearly in test descriptions
  - [x] Measure and report on property test execution time
- **Skills Reference:**
  - **react-testing-patterns:** Reference "Property-Based Testing Pattern" and "Metamorphic Testing Pattern"
  - Use "Custom Arbitrary Pattern" for domain-specific data generation
  - Apply "Shrinking Pattern" for minimal failing examples
- **Acceptance Criteria:**
  - [x] All 37 properties have explicit test case
  - [x] Each property runs 100+ iterations
  - [x] Fast-check reports shrunk counterexamples for failures
  - [x] All properties pass consistently
  - [x] Tests document formal property statements
- **Estimated Time:** 3 hours

---

#### Task 6.3: Integration Tests for Full Workflows
- **Status:** ✅ Completed
- **Requirements:** Req 28 (integration coverage)
- **Description:** Create integration tests covering complete user workflows: load list, filter, search, sort, paginate, sync with real Supabase.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/integration.test.ts`
  - [x] Set up test database with seeded activities
  - [x] Test workflow 1: Load tasks → filter by priority → sort by date
  - [x] Test workflow 2: Search term → no results → clear search → all items return
  - [x] Test workflow 3: Combine multiple filters (subject + date + priority)
  - [x] Test workflow 4: Paginate through large dataset (100+ items)
  - [x] Test workflow 5: Real-time sync: create in one connection, observe in another
  - [x] Test workflow 6: Offline cache: disconnect, load from cache, reconnect and sync
  - [x] Test error handling: network failure, retry logic, user feedback
  - [x] Measure performance for each workflow
- **Skills Reference:**
  - **react-testing-patterns:** Use "Integration Test Pattern" with real external dependencies
  - Reference "Test Database Pattern" for seeding test data
  - Apply "Async Test Pattern" for real-time and network scenarios
- **Acceptance Criteria:**
  - [x] All 6+ workflows tested end-to-end
  - [x] Performance metrics measured and logged
  - [x] Error scenarios handled gracefully
  - [x] Tests run reliably (no flakiness)
- **Estimated Time:** 2 hours

---

#### Task 6.4: E2E Tests with Playwright for User Flows
- **Status:** ✅ Completed
- **Requirements:** Req 28 (E2E coverage of critical paths)
- **Description:** Create Playwright E2E tests for critical user flows: navigation, filtering, searching, creating/editing/deleting from list, and real-time updates.
- **Sub-tasks:**
  - [x] Create `e2e/activities-list.spec.ts`
  - [x] Test E2E 1: Navigate to Tasks, see full list with cards
  - [x] Test E2E 2: Search for term, verify results, clear search
  - [x] Test E2E 3: Apply priority filter, verify list updates
  - [x] Test E2E 4: Combine multiple filters (subject + date), verify AND logic
  - [x] Test E2E 5: Sort by different criteria, verify order
  - [x] Test E2E 6: Pagination: click "Carregar Mais", load next page, verify append
  - [x] Test E2E 7: Create activity in new tab, verify appears in list on first tab within 500ms
  - [x] Test E2E 8: Edit activity, verify card updates
  - [x] Test E2E 9: Delete activity, verify removal with animation
  - [x] Test E2E 10: URL contains query params, reload page, verify filters restored
  - [x] Test E2E 11: Mobile layout (< 768px): verify filter sidebar collapse/expand
  - [x] Test E2E 12: Accessibility: keyboard navigation through filters and cards
- **Skills Reference:**
  - **react-testing-patterns:** Use "E2E Test Pattern" with Playwright fixtures
  - Reference "Page Object Model Pattern" for maintainable tests
  - Apply "Visual Testing Pattern" for responsive design verification
- **Acceptance Criteria:**
  - [x] All 12+ E2E tests pass
  - [x] Tests cover critical user journeys (create → list → filter → view)
  - [x] Mobile and desktop breakpoints tested
  - [x] Accessibility features validated (keyboard nav, screen reader compatibility)
  - [x] Tests run reliably in CI/CD
- **Estimated Time:** 2.5 hours

---

#### Task 6.5: Accessibility Audit and WCAG 2.1 AA Compliance
- **Status:** ✅ Completed
- **Requirements:** Req 26 (WCAG 2.1 AA compliance)
- **Description:** Conduct accessibility audit, implement ARIA labels, semantic HTML, keyboard navigation, and color contrast fixes to achieve WCAG 2.1 AA compliance.
- **Sub-tasks:**
  - [x] Install axe DevTools and run automated accessibility scan
  - [x] Add `aria-label` to all buttons and icon-only controls
  - [x] Add `aria-describedby` to inputs with helper text
  - [x] Ensure form labels associated via `<label for="id">`
  - [x] Use semantic HTML: `<article>` for cards, proper heading hierarchy
  - [x] Add `aria-hidden="true"` to decorative icons
  - [x] Test keyboard navigation: Tab, Shift+Tab, Enter, Escape
  - [x] Test with screen reader (NVDA or JAWS)
  - [x] Fix color contrast: measure with Color Contrast Analyzer (target 4.5:1)
  - [x] Test focus management in filter panel (modal focus trap)
  - [x] Verify form validation messages are announced
  - [x] Create accessibility test checklist and verify all items
- **Skills Reference:**
  - **react-testing-patterns:** Reference "Accessibility Testing Pattern" for automated and manual testing
  - Use "ARIA Pattern" for labels and roles
  - Apply "Keyboard Navigation Pattern" for interactive components
- **Acceptance Criteria:**
  - [x] Automated audit (axe) passes with 0 violations
  - [x] Manual keyboard navigation works (Tab through all controls)
  - [x] Screen reader announces all content and interactions
  - [x] Color contrast >= 4.5:1 for normal text
  - [x] Form validation messages are announced
  - [x] WCAG 2.1 AA compliance checklist completed
- **Estimated Time:** 2 hours

---

### Phase 7: Performance Optimization & Documentation

#### Task 7.1: Performance Profiling and Query Optimization
- **Status:** ✅ Completed
- **Requirements:** Req 13-14, 33 (< 500ms discipline load, < 100ms filter apply)
- **Description:** Profile component rendering, query execution, and cache performance to ensure all performance targets are met.
- **Sub-tasks:**
  - [x] Use React DevTools Profiler to measure component render times
  - [x] Use Chrome DevTools Network tab to measure query latency
  - [x] Profile subject dropdown load time: target < 500ms
  - [x] Profile filter application latency: target < 100ms
  - [x] Profile sorting operation: target < 100ms
  - [x] Check bundle size: ensure filter components don't bloat
  - [x] Verify Supabase query plans use indices (EXPLAIN ANALYZE)
  - [x] Optimize N+1 queries: batch discipline lookups
  - [x] Test pagination: measure page load times for page 1, 2, 3
  - [x] Measure cache hit rates and memory usage
  - [x] Document performance bottlenecks and optimizations applied
- **Skills Reference:**
  - **clean-architecture-patterns:** Reference "Performance Patterns" for efficient data fetching
  - Use "Query Optimization Pattern" for Supabase
- **Acceptance Criteria:**
  - [x] Subject dropdown loads in < 500ms (measured 10 times, 90th percentile)
  - [x] Filter application in < 100ms
  - [x] Sorting in < 100ms
  - [x] No queries take > 500ms
  - [x] Bundle size increase < 50KB from this feature
- **Estimated Time:** 1.5 hours

---

#### Task 7.2: Code Documentation and Inline Comments
- **Status:** ✅ Completed
- **Requirements:** Req 35 (documentation and code comments)
- **Description:** Add comprehensive JSDoc comments to all functions, components, and complex logic explaining business rules, edge cases, and design decisions.
- **Sub-tasks:**
  - [x] Add JSDoc to all filter functions: purpose, @param, @returns, @example
  - [x] Document each React component: props interface, behavior, usage example
  - [x] Document Server Actions: what it does, validations, error cases
  - [x] Document filter algebra: AND/OR logic with examples
  - [x] Add comments explaining debounce strategy and Enter bypass logic
  - [x] Document Realtime sync logic: how events are batched, conflicts resolved
  - [x] Document cache strategy: TTL, invalidation, sync on reconnect
  - [x] Create README in `/src/features/activities/` explaining architecture, key files, patterns used
  - [x] Document all indices and their purpose in schema migration file
  - [x] Add links to relevant skills documentation where applicable
- **Skills Reference:**
  - **clean-architecture-patterns:** Use documentation patterns and code organization guidelines
- **Acceptance Criteria:**
  - [x] All public functions have JSDoc with @param, @returns, @throws
  - [x] All components documented with props and behavior
  - [x] Complex logic has inline comments explaining business rules
  - [x] README exists with architecture overview
  - [x] Design decisions documented (why this pattern over that)
- **Estimated Time:** 1 hour

---

#### Task 7.3: Feature Completion Verification and Cleanup
- **Status:** ✅ Completed
- **Requirements:** All 35 requirements
- **Description:** Final verification that all requirements are met, clean up temporary code, run full test suite, and prepare for spec completion.
- **Sub-tasks:**
  - [x] Verify all 35 requirements satisfied (create checklist)
  - [x] Run full test suite: unit, integration, E2E, accessibility
  - [x] Verify coverage > 85% for filter logic
  - [x] Verify all 37 properties pass PBT
  - [x] Run performance profiler: confirm all targets met
  - [x] Run linter and fix all warnings
  - [x] Run TypeScript strict mode: 0 errors
  - [x] Review code for dead code, console.log cleanup
  - [x] Verify accessibility audit passes
  - [x] Create feature demo walkthrough (document for team)
  - [x] Final git commit with meaningful message
- **Skills Reference:**
  - **clean-architecture-patterns:** Use checklists and verification patterns
- **Acceptance Criteria:**
  - [x] All 35 requirements checked off
  - [x] All test suites pass
  - [x] Coverage >= 85%
  - [x] Performance targets met
  - [x] No linting or TypeScript errors
  - [x] Accessibility audit passes
- **Estimated Time:** 1.5 hours

---

## Implementation Guidelines

### Architecture Patterns (from clean-architecture-patterns skill)

Apply throughout:
- **Domain Entity Pattern:** Activities are rich objects with embedded business logic (not anemic models)
- **Repository Pattern:** Domain defines interface, infrastructure implements with Supabase
- **Use Case Pattern:** Complex orchestration (filter combination, debounce) handled in application layer
- **Dependency Injection:** Services injected, not hard-coded; testable
- **Error Handling Pattern:** Explicit error types, proper propagation, user-friendly messages

### Server Actions (from next-js-server-actions skill)

- Use `'use server'` at file top
- Validate inputs with Zod on server before database access
- Extract user context from session (authenticated context)
- Return `{ success: boolean, data?: T, error?: { code, message } }` format
- Never expose database errors to client
- Combine with React Query for caching and state management

### Real-Time & Caching (from pwa-offline-patterns skill)

- **Realtime Subscriptions:** Supabase Realtime with RLS-filtered channels
- **Offline-First:** Cache in IndexedDB with TTL, serve when offline
- **Sync Strategy:** Queue updates, batch within 100ms, prefer server version on conflict
- **Conflict Resolution:** Last-write-wins (server always wins)
- **Error Recovery:** Retry with exponential backoff, fall back to polling

### React & Testing (from react-testing-patterns skill)

- **Component Testing:** Test behavior, not implementation
- **Custom Hooks:** Extract logic (debounce, caching) into hooks for reusability and testing
- **Property-Based Testing:** Generate random inputs, verify invariants hold
- **Accessibility Testing:** Automated (axe), keyboard navigation, screen reader

### Database Optimization (from supabase-rls-auth skill)

- **Indices:** Critical for filter performance, use composite indices
- **RLS:** Every query automatically filtered by user_id
- **Query Patterns:** Use Supabase query builder, avoid N+1s
- **Performance Monitoring:** EXPLAIN ANALYZE, measure real-world latency

---

## Success Metrics

| Metric | Target | How to Verify |
|--------|--------|--------------|
| Subject Dropdown Load | < 500ms | `performance.now()` timing |
| Filter Application | < 100ms | React DevTools Profiler |
| Search Debounce | 300ms | Jest timer mocks or E2E timing |
| Real-Time Sync | < 500ms | Timestamp comparison (create → list) |
| Test Coverage | > 85% | Vitest coverage report |
| Property Tests | 37/37 passing | Fast-check test runs |
| E2E Tests | 12/12 passing | Playwright test results |
| Accessibility | WCAG 2.1 AA | Axe audit + manual testing |
| Mobile Responsiveness | Works on 320px width | E2E mobile viewport tests |
| Offline Functionality | 100% | Disable network, verify cache serve |

---

## Testing Checklist

### Unit Tests (Phase 6.1)
- [x] Filter logic for each type (priority, subject, date, status)
- [x] Multi-filter combinations with AND/OR logic
- [x] URL serialization/deserialization (round-trip)
- [x] Sorting for all 9 options
- [x] Pagination calculations
- [x] Debounce timing (300ms)
- [x] Search normalization (case-insensitive, accents)
- [x] Coverage report: 85%+

### Property-Based Tests (Phase 6.2)
- [x] All 37 properties have explicit test case
- [x] 100+ iterations per property
- [x] Shrinking reports minimal failing examples
- [x] Properties documented with formal statement

### Integration Tests (Phase 6.3)
- [x] Full workflows with real database
- [x] Realtime sync with multiple connections
- [x] Cache invalidation and refresh
- [x] Error handling and retries
- [x] Performance measured for each workflow

### E2E Tests (Phase 6.4)
- [x] 12+ critical user flows tested
- [x] Mobile, tablet, desktop breakpoints
- [x] Accessibility: keyboard navigation, screen reader
- [x] Real-time updates observed
- [x] URL state persistence

### Accessibility (Phase 6.5)
- [x] Axe audit: 0 violations
- [x] Keyboard navigation: all controls reachable
- [x] Screen reader: all content announced
- [x] Color contrast: >= 4.5:1
- [x] Focus management: no traps, clear focus

---

## Dependency Map

```
Task Execution Order:
1.1 → 1.2 → 1.3  (Schema setup, not parallel)
     ↓
2.1 → 2.2       (Domain/application logic, sequential)
     ↓
3.1 → 3.2 → 3.3 (Infrastructure, can be parallel but sequenced here)
     ↓
4.1 → 4.2 → 4.3 → 4.4 (Presentation, can be parallel once 3.1 done)
     ↓
5.1 → 5.2      (Server Actions, requires 3.1 complete)
     ↓
6.1 → 6.2 → 6.3 → 6.4 → 6.5 (Testing, can start after units complete)
     ↓
7.1 → 7.2 → 7.3 (Optimization & cleanup, final phase)
```

**Critical Path:** 1.1 → 1.2 → 1.3 → 3.1 → 4.1 → 6.1 (minimum sequence)

---

## File Structure Created

```
src/features/activities/
├── domain/
│   ├── activity.ts          (Abstract Activity entity)
│   ├── task.ts              (Task specialization)
│   ├── exam.ts              (Exam specialization)
│   ├── assignment.ts        (Assignment specialization)
│   ├── reminder.ts          (Reminder entity)
│   ├── filter.ts            (FilterCriteria entity)
│   └── repository.ts        (Repository interface contracts)
│
├── application/
│   ├── useCases/
│   │   ├── filterActivities.ts
│   │   ├── searchActivities.ts
│   │   └── getActivities.ts
│   └── dto/
│       └── ActivityResponseDTO.ts
│
├── infrastructure/
│   ├── supabaseActivityRepository.ts
│   └── mappers/
│       └── activityMapper.ts
│
└── presentation/
    ├── pages/
    │   └── ActivityListPage.tsx
    ├── components/
    │   ├── ActivityList.tsx
    │   ├── ActivityCard.tsx
    │   ├── ActivityFilters.tsx
    │   ├── SearchBar.tsx
    │   ├── SortSelector.tsx
    │   ├── UrgencyBadge.tsx
    │   └── PaginationControl.tsx
    ├── hooks/
    │   ├── useActivities.ts
    │   └── useActivityRealtime.ts
    ├── actions/
    │   ├── getActivities.ts
    │   └── syncActivities.ts
    ├── schemas/
    │   └── filterSchema.ts
    └── lib/
        └── activityCache.ts

__tests__/features/activities/
├── filterLogic.test.ts
├── filterProperties.test.ts
├── integration.test.ts
└── accessibility.test.ts

e2e/
└── activities-list.spec.ts

supabase/migrations/
└── 003_add_activity_list_indices.sql
```

---

## Next Steps After This Feature

1. **Spec 4: CRUD Operations** - Edit/delete activities from detail pages
2. **Spec 5: Dashboard** - Summary views and statistics
3. **Spec 6: Calendar** - Calendar grid view with activity visualization
4. **Spec 7: Notifications** - Web push reminders and scheduling
5. **Spec 8: PWA & Offline** - Service Worker, manifest, offline-first strategy
