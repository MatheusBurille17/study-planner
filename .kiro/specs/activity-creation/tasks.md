# Tasks - activity-creation

## Overview

This document outlines the implementation plan for the **activity-creation** feature MVP, which enables university students to create three types of academic activities (Tasks, Exams, Assignments) with rigorous validation, real-time synchronization, and customizable reminders. The feature requires implementation across all four layers of Clean Architecture, with comprehensive property-based testing of 13 correctness properties. Estimated delivery: ~3 days of focused development.

---

## Correctness Properties Being Validated

The following 13 properties must be validated through automated tests (unit, integration, E2E, and property-based):

1. **Invariant: Activity Timestamps Valid** - `createdAt ≤ now()` and `updatedAt == createdAt`
2. **Invariant: Unique IDs** - Each activity has a unique UUID, no duplicates
3. **Invariant: User Ownership (RLS)** - Activity only visible to creator via Row-Level Security
4. **Invariant: Valid Deadlines** - If `dueDate` is set, `dueDate >= today()`
5. **Round-Trip: Serialization** - `JSON.parse(JSON.stringify(activity)) == activity` after round-trip
6. **Metamorphic: Complete Sync** - Activity created → appears in Dashboard AND Calendar AND Lists
7. **Idempotence: Duplicate Protection** - Sending same payload twice prevents duplicates
8. **Confluence: Field Order Irrelevant** - Different field submission orders produce same result
9. **Error Conditions: Invalid Inputs** - All invalid inputs produce appropriate error messages
10. **Performance: Realtime Sync < 100ms** - Activity appears in Dashboard within 100ms of creation
11. **Invariant: Reminders Before Event** - All reminders have `reminderTimestamp < eventTimestamp`
12. **Invariant: Valid Reminder Timestamps** - `reminderTimestamp >= now()` (never in past)
13. **Invariant: Max 3 Reminders** - `COUNT(reminders per activity) <= 3`

---

## Implementation Phases

### Phase 1: Project Setup & Database Schema

#### Task 1.1: Initialize Feature Structure and Configure Zod
- **Status:** ✅ Completed
- **Requirements:** All 25 requirements (foundational)
- **Description:** Set up the feature module directory structure following Clean Architecture (domain, application, infrastructure, presentation layers), configure TypeScript strict mode for the feature, and establish Zod schema validation framework with custom error messages in Portuguese.
- **Skills utilizadas:** `clean-architecture-patterns` - Set up domain, application, infrastructure, presentation layer separation with proper folder structure.
- **Sub-tasks:**
  - [x] Create `/src/features/activities/` directory with subdirectories for domain, application, infrastructure, presentation
  - [x] Set up base types and enums: `Priority`, `TaskStatus`, `ExamType`, `AssignmentType`, `AssignmentStatus`, `ReminderType`
  - [x] Configure Zod with Portuguese error messages and custom refinements
  - [x] Create `.ts` files for each layer (empty placeholders for now)
  - [x] Verify TypeScript compilation with strict mode enabled
- **Skills Reference:** 
  - **clean-architecture-patterns:** Follow "Layered Architecture Overview" and "Folder Structure Following Clean Architecture" patterns
  - Focus on setting up domain, application, infrastructure, presentation layer separation
- **Acceptance Criteria:**
  - [x] Directory structure created with all 4 layers
  - [x] All enums defined in `src/shared/types/activity.ts`
  - [x] No TypeScript errors in empty structure
  - [x] Zod locale configured for Portuguese messages
- **Estimated Time:** 1 hour

---

#### Task 1.2: Design and Implement Supabase Database Schema
- **Status:** ✅ Completed
- **Requirements:** Req 6, 21, 22 (database schema for activities and reminders)
- **Description:** Create complete PostgreSQL schema for activities (tasks, exams, assignments) and activity_reminders table with proper relationships, constraints, indexes, and Row-Level Security policies. Implement auto-updating triggers for `updated_at` timestamps.
- **Skills utilizadas:** `database-queries` - Create PostgreSQL migrations with proper indices, constraints, and RLS policies for multi-table activities schema.
- **Sub-tasks:**
  - [x] Create migration file: `supabase/migrations/001_init_activities_schema.sql`
  - [x] Define `activities` base table with discriminator column (`type`)
  - [x] Define `tasks`, `exams`, `assignments` as specialization tables with FK to activities
  - [x] Define `activity_reminders` table with all required fields
  - [x] Add indexes on `(user_id, created_at DESC)` and `(user_id, subject_id)` for performance
  - [x] Create triggers for auto-update `updated_at` timestamp
  - [x] Implement RLS policies for all tables (activities, tasks, exams, assignments, activity_reminders)
  - [x] Test schema with sample inserts and verify RLS blocking cross-user access
  - [x] Document schema relationships and constraints
- **Skills Reference:** 
  - **supabase-rls-auth:** Use "RLS Policy Patterns" section (Pattern 1: User Ownership) for multi-table RLS implementation
  - Apply "User Model" and "Public User Profile Table" patterns for user data isolation
  - Reference "RLS Testing Patterns" and "pgTap Test Pattern" for schema validation
- **Acceptance Criteria:**
  - [x] All 5 tables created (activities, tasks, exams, assignments, activity_reminders)
  - [x] Foreign key relationships enforced with ON DELETE CASCADE
  - [x] RLS enabled on all tables with appropriate policies
  - [x] Indexes present for query performance
  - [x] Auto-update triggers functional
  - [x] Schema validated with Supabase CLI
- **Estimated Time:** 2 hours

---

#### Task 1.3: Generate TypeScript Types from Supabase Schema
- **Status:** ✅ Completed
- **Requirements:** All 25 requirements (types foundation)
- **Description:** Use Supabase CLI to auto-generate TypeScript types from the created schema and verify they match domain entities. Update generated types to match project naming conventions.
- **Skills utilizadas:** `clean-architecture-patterns` - Map database types to domain entities using Domain Entity Pattern without leaking database details.
- **Sub-tasks:**
  - [x] Run `supabase gen types typescript` to generate types
  - [x] Update `src/shared/types/database.types.ts` with generated types
  - [x] Create domain entity types in `src/features/activities/domain/` (Activity, Task, Exam, Assignment, Reminder)
  - [x] Create DTOs in `src/features/activities/application/dto/`
  - [x] Ensure TypeScript strict mode is satisfied across all new types
- **Skills Reference:** 
  - **clean-architecture-patterns:** Map database types to domain entities using "Domain Entity Pattern"
  - Ensure types don't leak database implementation details into domain layer
- **Acceptance Criteria:**
  - [x] `database.types.ts` generated and committed
  - [x] Domain entity types align with database schema
  - [x] No `any` types in generated code
  - [x] All types pass strict TypeScript checking
- **Estimated Time:** 45 minutes

---

### Phase 2: Domain Layer Implementation

#### Task 2.1: Implement Activity Domain Entities
- **Status:** ✅ Completed
- **Requirements:** Req 10 (required vs optional fields), Req 14 (deadline validation)
- **Description:** Implement domain layer entities (Activity, Task, Exam, Assignment, Reminder) as rich domain objects with embedded business rules and invariant validation methods. These are the core of Clean Architecture.
- **Skills utilizadas:** `clean-architecture-patterns` - Implement Domain Entity Pattern with embedded business logic, invariant validation, and cross-entity business rules.
- **Sub-tasks:**
  - [x] Create `src/features/activities/domain/activity.ts` with abstract `Activity` class
  - [x] Implement invariant checks: title not empty, userId present, timestamps valid
  - [x] Create `Task` class extending `Activity` with priority, status, estimated time, tags
  - [x] Create `Exam` class extending `Activity` with required subject, date, exam type
  - [x] Create `Assignment` class extending `Activity` with required subject, description, type
  - [x] Create `Reminder` class with invariants: timestamp before event, max 3 per activity
  - [x] Implement `isValid()` and `validateInvariants()` methods on all entities
  - [x] Create factory methods for constructing entities from DTO
- **Skills Reference:** 
  - **clean-architecture-patterns:** Use "Domain Entity Pattern" with embedded business logic and invariant validation
  - Follow example Activity class structure with methods like `isOverdue()`, `validateInvariants()`
  - Apply "Domain Service Pattern" for cross-entity business rules (e.g., reminder calculations)
- **Acceptance Criteria:**
  - [x] All entity classes created with constructor validation
  - [x] `isValid()` returns boolean and throws descriptive errors
  - [x] Invariants documented in code comments
  - [x] No Supabase or external dependencies in domain layer
  - [x] Full test coverage of validation logic (see Task 3.1)
- **Estimated Time:** 2 hours

---

#### Task 2.2: Implement Repository Interfaces (Contracts)
- **Status:** ✅ Completed
- **Requirements:** Req 6 (Supabase integration), all 25 requirements (data persistence)
- **Description:** Define repository interfaces in the domain layer that serve as contracts for infrastructure implementations. This enables dependency inversion and testability.
- **Skills utilizadas:** `clean-architecture-patterns` - Implement Repository Pattern with dependency inversion and clear method contracts for infrastructure implementations.
- **Sub-tasks:**
  - [x] Create `src/features/activities/domain/repository.ts` with `ActivityRepository` interface
  - [x] Define methods: `save()`, `getById()`, `getByUserId()`, `delete()`, `update()`
  - [x] Create `ReminderRepository` interface with methods: `saveReminder()`, `getRemindersByActivityId()`, `deleteReminder()`, `updateReminder()`
  - [x] Define error types and exception handling patterns
  - [x] Create `SubjectRepository` interface for loading subject lists
  - [x] Add JSDoc comments describing each method's contract
- **Skills Reference:** 
  - **clean-architecture-patterns:** Follow "Repository Implementations" section and pattern examples
  - Apply "Dependency Injection Pattern" for repository container
  - Ensure interfaces only define contracts (no implementation details)
- **Acceptance Criteria:**
  - [x] Repository interfaces defined in domain layer
  - [x] No implementation code, only signatures
  - [x] Error handling strategy documented
  - [x] All methods have clear JSDoc contracts
- **Estimated Time:** 1 hour

---

#### Task 2.3: Implement Business Rules Module
- **Status:** ✅ Completed
- **Requirements:** Req 4 (assignment status flow), Req 14 (deadline validation), Req 21-22 (reminder rules)
- **Description:** Create centralized business rules module that validates domain invariants, calculates derived values (like reminder timestamps), and enforces constraints.
- **Skills utilizadas:** `clean-architecture-patterns` - Implement Domain Service Pattern with pure functions, timezone-aware calculations, and comprehensive business rule validation.
- **Sub-tasks:**
  - [x] Create `src/features/activities/domain/rules.ts` module
  - [x] Implement `validateDeadline(date)` - rejects past dates
  - [x] Implement `validateReminderTimestamp(reminderDate, eventDate)` - reminderDate < eventDate
  - [x] Implement `calculateReminderTimestamp(eventDate, reminderType, reminderTime)` - calculates absolute timestamp
  - [x] Implement `validateMaxReminders(reminders)` - max 3 per activity
  - [x] Implement `validateNoDuplicateReminders(reminders)` - unique timestamps
  - [x] Implement `getFieldRequirements(activityType)` - returns required vs optional fields per type
  - [x] Add unit tests for each rule function
- **Skills Reference:** 
  - **clean-architecture-patterns:** Reference "Domain Service Pattern" for business logic coordination
  - Pure functions, no external dependencies, testable in isolation
- **Acceptance Criteria:**
  - [x] All rule functions implemented and exported
  - [x] Clear separation between validation and calculation
  - [x] Timezone handling correct (UTC internally, local for display)
  - [x] 100% test coverage on rule functions
- **Estimated Time:** 1.5 hours

---

### Phase 3: Application Layer Implementation

#### Task 3.1: Implement CreateActivity Use Case
- **Status:** ✅ Completed
- **Requirements:** Req 1-5, 8, 10, 15, 19, 21-22 (core creation logic)
- **Description:** Implement the primary use case that orchestrates activity creation: validation, domain entity creation, persistence, reminder calculation, error handling, and realtime event publishing.
- **Skills utilizadas:** `clean-architecture-patterns` - Use Use Case Pattern to orchestrate domain entities, repositories, and external services with comprehensive error handling.
- **Sub-tasks:**
  - [x] Create `src/features/activities/application/useCases/createActivity.ts`
  - [x] Implement `CreateActivityUseCase` with `execute()` method
  - [x] Add input validation against domain rules
  - [x] Create domain entities from DTO inputs
  - [x] Calculate reminder timestamps for each reminder
  - [x] Call repository to persist activity and reminders
  - [x] Handle all error scenarios (validation, persistence, permissions)
  - [x] Return rich output with created activity and IDs
  - [x] Publish realtime event via Supabase
  - [x] Add comprehensive error logging (dev only)
- **Skills Reference:** 
  - **clean-architecture-patterns:** Use "Use Case Pattern" example as template
  - Follow CreateActivityUseCase structure with execute() method and dependency injection
  - Orchestrate between domain entities, repositories, and external services
- **Acceptance Criteria:**
  - [x] Use case executes full flow end-to-end
  - [x] Validates input before persistence
  - [x] Calculates reminder timestamps correctly
  - [x] Returns structured error objects on failure
  - [x] Publishes realtime events for sync
  - [x] Handles edge cases (no reminders, midnight times, DST)
- **Estimated Time:** 2 hours

---

#### Task 3.2: Create Data Transfer Objects (DTOs)
- **Status:** ✅ Completed
- **Requirements:** All 25 requirements (data contracts between layers)
- **Description:** Create request/response DTOs for all use cases to provide clean contracts between layers. DTOs decouple internal domain models from external interfaces.
- **Skills utilizadas:** `clean-architecture-patterns` - Implement DTO Pattern with clear request/response contracts and clean mappings between layers using Zod schemas.
- **Sub-tasks:**
  - [x] Create `src/features/activities/application/dto/CreateActivityDTO.ts` for request
  - [x] Create `ActivityResponseDTO.ts` for response
  - [x] Create `ReminderDTO.ts` for reminder data
  - [x] Create `CreateReminderInputDTO.ts` for input
  - [x] Create `UpdateReminderDTO.ts` for updates
  - [x] Create `ErrorResponseDTO.ts` for error responses
  - [x] Add TypeScript interfaces with JSDoc comments
  - [x] Ensure DTOs map correctly to/from domain entities
- **Skills Reference:** 
  - **clean-architecture-patterns:** Follow "DTO Pattern" section with request/response examples
  - Use Zod schemas for DTO validation and type inference
- **Acceptance Criteria:**
  - [x] All DTOs created with clear contracts
  - [x] JSDoc comments document all fields
  - [x] DTOs map cleanly to domain entities
  - [x] No domain logic in DTOs (data holders only)
- **Estimated Time:** 1 hour

---

### Phase 4: Infrastructure Layer - Repository Implementation

#### Task 4.1: Implement Supabase Activity Repository
- **Status:** ✅ Completed
- **Requirements:** Req 6 (RLS integration), Req 7 (sync), Req 9 (loading states), Req 16 (offline handling)
- **Description:** Implement the `ActivityRepository` interface using Supabase client with proper RLS enforcement, error handling, and transaction support for creating activities with reminders atomically.
- **Skills utilizadas:** `database-queries` - Implement Repository Implementation pattern with RLS-enforced queries, transactional consistency, and error mapping for Supabase integration.
- **Sub-tasks:**
  - [x] Create `src/features/activities/infrastructure/supabaseActivityRepository.ts`
  - [x] Implement `save()` method for activities (INSERT or UPDATE)
  - [x] Implement `getById()` with RLS automatic filtering
  - [x] Implement `getByUserId()` for listing activities
  - [x] Implement batch reminder operations within activity transaction
  - [x] Add proper error handling for RLS violations, quota limits, network errors
  - [x] Create type mappers between Supabase schema and domain entities
  - [x] Add retry logic for transient failures
  - [x] Implement optimistic updates for offline support
  - [x] Test RLS policies block cross-user access
- **Skills Reference:** 
  - **clean-architecture-patterns:** Use "Repository Implementation" and "Data Mapper Pattern" as templates
  - **supabase-rls-auth:** Reference RLS enforced queries and error handling for cross-user access attempts
- **Acceptance Criteria:**
  - [x] Repository implements all interface methods
  - [x] RLS policies tested and enforced
  - [x] Transactions ensure activity + reminders consistency
  - [x] Error types mapped correctly
  - [x] Type mappers prevent data corruption
  - [x] No unhandled promise rejections
- **Estimated Time:** 2.5 hours

---

#### Task 4.2: Implement Reminder Calculator Service
- **Status:** ✅ Completed
- **Requirements:** Req 21-22 (reminder timestamp calculation), Req 23 (validation)
- **Description:** Create service that calculates absolute reminder timestamps from relative reminder types and times. Handles timezone conversions between UTC storage and local display.
- **Skills utilizadas:** `property-testing` - Use fast-check for comprehensive property-based testing of timestamp calculations across edge cases, timezones, and DST transitions.
- **Sub-tasks:**
  - [x] Create `src/features/activities/infrastructure/reminderCalculator.ts`
  - [x] Implement `calculateReminderTimestamp()` function
  - [x] Handle all reminder types: ON_DAY, ONE_HOUR_BEFORE, ONE_DAY_BEFORE, TWO_DAYS_BEFORE, CUSTOM
  - [x] For CUSTOM, convert offset (value + unit) to minutes
  - [x] Validate reminder timestamp is after creation and before/at event
  - [x] Handle edge cases: midnight crossing, DST transitions
  - [x] Add comprehensive unit tests with property-based testing
  - [x] Document timezone handling strategy
- **Skills Reference:** 
  - **react-testing-patterns:** Use property-based testing (fast-check) for timestamp calculations
  - Test with 1000+ generated examples covering edge cases
- **Acceptance Criteria:**
  - [x] All reminder types calculate correctly
  - [x] Custom offsets handled (1-30 days)
  - [x] Edge cases handled (midnight, day boundaries)
  - [x] Timezone conversions correct (UTC storage, local display)
  - [x] 100% test coverage with 50+ test cases
- **Estimated Time:** 1.5 hours

---

### Phase 5: Presentation Layer - Validation & Server Actions

#### Task 5.1: Implement Zod Validation Schemas
- **Status:** ✅ Completed
- **Requirements:** Req 5 (Zod validation), Req 10 (required vs optional), Req 23 (reminder schemas)
- **Description:** Create comprehensive Zod schemas for all activity types and reminders with field-level and cross-field validation, providing clear Portuguese error messages and enforcing business rules at the boundary.
- **Skills utilizadas:** `form-handling` - Implement discriminated union schemas with field-level and cross-field validation for polymorphic activity types and reminders.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/schemas/createActivitySchema.ts`
  - [x] Implement `createTaskSchema` with all validations
  - [x] Implement `createExamSchema` (subject required, dates validated)
  - [x] Implement `createAssignmentSchema` (subject required, full validation)
  - [x] Create `reminderSchema.ts` with validation for all reminder types
  - [x] Add custom error messages in Portuguese for all validations
  - [x] Implement discriminated union schema for polymorphic activity types
  - [x] Create update schemas for later edits
  - [x] Add JSDoc examples for schema usage
  - [x] Test all validation paths with valid/invalid inputs
- **Skills Reference:** 
  - **next-js-server-actions:** Use schema patterns from "Server Action Pattern" for boundary validation
  - Create discriminated unions for routing between Task/Exam/Assignment types
  - Add custom refinements for cross-field validation (e.g., dueDate > today, reminder < event)
- **Acceptance Criteria:**
  - [x] All schemas validate required fields
  - [x] Field-level errors translated to Portuguese
  - [x] Date validation prevents past dates
  - [x] Reminder validation prevents duplicates and invalid times
  - [x] Discriminated union correctly routes to activity type schema
  - [x] 100% coverage of validation paths
- **Estimated Time:** 2 hours

---

#### Task 5.2: Implement Server Actions for Activity Creation
- **Status:** ✅ Completed
- **Requirements:** Req 8 (Server Actions), Req 5 (validation), Req 19 (error handling), Req 15 (duplicate protection)
- **Description:** Create Next.js Server Actions that handle activity creation with double validation (client + server), authentication checks, error handling, and deduplication protection. Uses the `"use server"` directive.
- **Skills utilizadas:** `next-js-server-actions` - Implement Server Actions with boundary validation, RLS verification, and centralized error handling for activity creation.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/actions/createActivity.ts`
  - [x] Add `"use server"` directive at top of file
  - [x] Implement `createActivityAction(input)` function
  - [x] Validate input with Zod schema (double validation)
  - [x] Extract userId from authentication context
  - [x] Call `createActivityUseCase.execute()`
  - [x] Transform result to structured response `{ success, activity?, error? }`
  - [x] Handle Zod validation errors (map to user-friendly messages)
  - [x] Handle Supabase errors (permissions, quota, etc)
  - [x] Add logging for errors (dev environment only)
  - [x] Implement deduplication via idempotency keys (optional for MVP)
- **Skills Reference:** 
  - **next-js-server-actions:** Follow "Basic Server Action Pattern" and "Form Submission Pattern"
  - Use `"use server"` directive, input validation at boundary, error handling with structured responses
  - Follow "Centralized Error Handler" for consistency
  - **supabase-rls-auth:** Use "Protected Server Actions" pattern for authentication and RLS verification
- **Acceptance Criteria:**
  - [x] Server Action validates input with Zod
  - [x] Authentication enforced (401 for unauthenticated)
  - [x] RLS policies block unauthorized access (403)
  - [x] Zod errors mapped to Portuguese messages
  - [x] Structured error response with code and field
  - [x] Success response includes full activity object
  - [x] No sensitive data leaked in errors
- **Estimated Time:** 1.5 hours

---

### Phase 6: Presentation Layer - React Components

#### Task 6.1: Implement ActivityTypeSelector Modal Component
- **Status:** ✅ Completed
- **Requirements:** Req 1 (modal for type selection)
- **Description:** Create modal component for initial activity type selection (Task, Exam, Assignment) with keyboard accessibility, smooth animations, and clear descriptions for each type.
- **Skills utilizadas:** `ui-components` - Build accessible modal component using shadcn/ui Dialog with keyboard navigation, ARIA labels, and smooth animations.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/ActivityTypeSelector.tsx`
  - [x] Use shadcn/ui Dialog for modal structure
  - [x] Create 3 cards for Task, Exam, Assignment with icons
  - [x] Add descriptions for each activity type
  - [x] Implement click handlers to navigate to appropriate form
  - [x] Add ESC key handler to close modal
  - [x] Implement smooth fade + scale animations
  - [x] Add overlay blur effect for background
  - [x] Test keyboard navigation (Tab, Enter, ESC)
  - [x] Test accessibility (ARIA labels, focus management)
- **Skills Reference:** 
  - **react-testing-patterns:** Component should be testable with React Testing Library using accessible queries
  - Test keyboard navigation and accessibility features
- **Acceptance Criteria:**
  - [x] Modal displays 3 selectable types
  - [x] ESC key closes modal
  - [x] Clicking outside modal closes it
  - [x] Animations smooth and performant
  - [x] Keyboard accessible (tab navigation)
  - [x] Mobile responsive
  - [x] WCAG 2.1 Level AA compliant
- **Estimated Time:** 1.5 hours

---

#### Task 6.2: Implement Task Form Component
- **Status:** ✅ Completed
- **Requirements:** Req 2 (task form), Req 21 (reminders), Req 9 (loading feedback)
- **Description:** Create comprehensive form component for creating tasks with all fields, real-time validation, loading states, character counters, and integrated reminder configuration.
- **Skills utilizadas:** `form-handling` - Build form with React Hook Form, Zod validation, character counters, dynamic fields, and Server Action integration with optimistic updates.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/TaskForm.tsx`
  - [x] Use React Hook Form for form state management
  - [x] Integrate Zod resolver for validation
  - [x] Implement fields: title, description, subject, dueDate, dueTime, priority, status, estimatedTime, tags
  - [x] Add character counters for title (max 200) and description (max 2000)
  - [x] Implement subject dropdown with dynamic loading
  - [x] Integrate date picker (disable past dates)
  - [x] Add time picker when date is selected
  - [x] Implement priority radio buttons (LOW, MEDIUM, HIGH)
  - [x] Add status radio buttons (TODO, IN_PROGRESS, COMPLETED)
  - [x] Integrate `ReminderConfigurator` component for lembretes section
  - [x] Add loading spinner on submit button
  - [x] Disable form fields during submission
  - [x] Call `createActivityAction` server action
  - [x] Display success toast with quick actions (Open, New)
  - [x] Display error toast with specific error message
  - [x] Preserve form data on error for retry
- **Skills Reference:** 
  - **next-js-server-actions:** Integrate form submission using Server Action pattern from "Form Submission Pattern"
  - Use useTransition() for managing submission state
  - **react-testing-patterns:** Component testable with RTL "Form Component Test" pattern
- **Acceptance Criteria:**
  - [x] Form renders all required fields
  - [x] Real-time validation on blur
  - [x] Character counters display correctly
  - [x] Submit disabled if required fields empty
  - [x] Loading state shown during submission
  - [x] Success/error toasts display
  - [x] Form data preserved on error
  - [x] Mobile responsive layout
- **Estimated Time:** 2.5 hours

---

#### Task 6.3: Implement Exam Form Component
- **Status:** ✅ Completed
- **Requirements:** Req 3 (exam form), Req 20 (dynamic subject loading)
- **Description:** Create form component for exam creation with required subject, date/time, exam type, content list, location, and notes. Integrates reminder configuration.
- **Skills utilizadas:** `form-handling` - Build form with dynamic subject dropdown, conditional fields, date/time pickers, and reminder integration with proper validation.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/ExamForm.tsx`
  - [x] Implement required fields: subject (select), date, exam type (radio)
  - [x] Implement optional fields: time, content (textarea), location, notes
  - [x] Add exam type radio buttons: WRITTEN, ORAL, PRACTICAL
  - [x] Load subjects dynamically and cache results
  - [x] Disable subject select if no subjects exist (show helpful message)
  - [x] Display day-of-week when date is selected
  - [x] Show map icon when location is filled
  - [x] Add character counter for notes (max 1000)
  - [x] Integrate `ReminderConfigurator` for reminders section
  - [x] Call `createActivityAction` server action
  - [x] Handle and display errors
  - [x] Show success toast with quick actions
- **Skills Reference:** 
  - **next-js-server-actions:** Follow form submission pattern with Server Actions
  - **react-testing-patterns:** Test form behavior with "Form Component Test" and "Hook Testing Pattern"
  - Test subject loading, conditional fields, and validation
- **Acceptance Criteria:**
  - [x] All required fields enforced
  - [x] Subject list loads dynamically
  - [x] Date validation prevents past dates
  - [x] Form submits correctly to server action
  - [x] Error handling robust
  - [x] Mobile responsive
- **Estimated Time:** 2 hours

---

#### Task 6.4: Implement Assignment Form Component
- **Status:** ✅ Completed
- **Requirements:** Req 4 (assignment form), Req 21 (reminders in form)
- **Description:** Create form component for assignment creation with required subject, description, due date, type, and optional criteria. Includes reminder configuration and status tracking.
- **Skills utilizadas:** `form-handling` - Build form with conditional field rendering, days remaining calculation, and reminder integration with robust Server Action handling.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/AssignmentForm.tsx`
  - [x] Implement required fields: subject, description, dueDate, assignmentType
  - [x] Implement optional fields: dueTime, criteria, status
  - [x] Add assignment type radio buttons: WRITTEN, PRESENTATION, PROJECT
  - [x] Add status radio buttons: PENDING, SUBMITTED, GRADED
  - [x] Show remaining days calculation when due date selected
  - [x] Add character counter for description (max 3000) and criteria (max 2000)
  - [x] If type is PRESENTATION, suggest additional fields (date, location)
  - [x] Integrate `ReminderConfigurator` for reminders
  - [x] Call `createActivityAction` server action
  - [x] Display success and error states
- **Skills Reference:** 
  - **next-js-server-actions:** Form submission with Server Actions pattern
  - **react-testing-patterns:** Test conditional rendering and dynamic field updates
- **Acceptance Criteria:**
  - [x] All required fields present and validated
  - [x] Days remaining calculation accurate
  - [x] Assignment type changes form dynamically
  - [x] Character counters work correctly
  - [x] Server action integration functional
  - [x] Mobile responsive
- **Estimated Time:** 2 hours

---

#### Task 6.5: Implement ReminderConfigurator Component (Reutilizável)
- **Status:** ✅ Completed
- **Requirements:** Req 21 (reminder config), Req 24 (component), Req 23 (validation)
- **Description:** Create reusable reminder configuration component that allows users to add up to 3 customizable reminders with preview, validation, and deletion. This is a critical component used in all three form types.
- **Skills utilizadas:** `ui-components` - Build reusable reminder component with type-specific options, real-time preview, max-items enforcement, and React Hook Form integration.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/ReminderConfigurator.tsx`
  - [x] Implement toggle: "Receber lembrete?" (on/off)
  - [x] When ON, show list of configured reminders
  - [x] Implement "+ Adicionar Lembrete" button (enabled if < 3)
  - [x] Create reminder form with:
    - Select for reminder type (ON_DAY, ONE_HOUR_BEFORE, TWO_HOURS_BEFORE, THREE_HOURS_BEFORE, ONE_DAY_BEFORE, TWO_DAYS_BEFORE, CUSTOM)
    - If CUSTOM, show offset fields (quantity + unit selector)
    - Time picker for hour (HH:mm format)
  - [x] Add real-time validation (time 00:00-23:59, no duplicates)
  - [x] Display preview text: "Você receberá lembrete em X de Y às Z"
  - [x] Show counter "N/3 lembretes"
  - [x] Allow deletion of each reminder
  - [x] Validate that reminder timestamp is before event
  - [x] Call reminder calculator to validate/preview timestamps
  - [x] Integrate with React Hook Form's `setValue()`
  - [x] Test with all reminder types
- **Skills Reference:** 
  - **react-testing-patterns:** Test component with RTL "Form Component Test" pattern
  - Test conditional rendering, state updates, validation, and user interactions
  - Test with all reminder types and edge cases
- **Acceptance Criteria:**
  - [x] Component renders all reminder type options
  - [x] Real-time validation works
  - [x] Preview updates as user edits
  - [x] Max 3 reminders enforced
  - [x] Duplicate detection works
  - [x] Deletion removes reminder correctly
  - [x] CUSTOM offset fields calculate correctly
  - [x] Fully tested with multiple scenarios
- **Estimated Time:** 2.5 hours

---

### Phase 7: Presentation Layer - Form Fields & Loading States

#### Task 7.1: Create Reusable FormField Component
- **Status:** ✅ Completed
- **Requirements:** Req 2, 3, 4 (form fields), Req 9 (feedback)
- **Description:** Create reusable FormField wrapper component that handles labels (with required indicator), errors, character counters, and styling consistency across all forms.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/components/FormField.tsx`
  - [x] Implement props: label, required, error, children, hint, maxLength, currentLength
  - [x] Show asterisk (*) in red if required
  - [x] Display error message in red below field
  - [x] Show character counter if maxLength provided
  - [x] Add optional hint text in gray
  - [x] Apply consistent Tailwind styling
  - [x] Use shadcn/ui Label component
  - [x] Test with various field types (input, select, textarea)
- **Skills Reference:** 
  - **react-testing-patterns:** Test component composition with React Testing Library
  - Test rendering with various prop combinations and field types
- **Acceptance Criteria:**
  - [x] Labels render correctly
  - [x] Required indicator displays
  - [x] Errors show in proper color/style
  - [x] Character counters work
  - [x] Accessible (proper label associations)
- **Estimated Time:** 45 minutes

---

#### Task 7.2: Implement Loading and Feedback States
- **Status:** ✅ Completed
- **Requirements:** Req 9 (loading feedback), Req 11 (success notifications)
- **Description:** Implement visual feedback for all activity creation flows: loading spinners, disabled states, toast notifications with action buttons, and error display.
- **Sub-tasks:**
  - [x] Create loading spinner component (animated rotation)
  - [x] Implement form disable/enable during submission
  - [x] Create success toast: "Atividade criada com sucesso" with "Open" and "New" action buttons
  - [x] Create error toast with specific error message
  - [x] Auto-dismiss toasts after 3 seconds (success) or 5 seconds (error)
  - [x] Allow manual dismiss via close button
  - [x] Test loading states don't interfere with modal close
  - [x] Verify form re-enables properly on error
- **Skills Reference:** 
  - **react-testing-patterns:** Test component states with "Component Testing Patterns"
  - Test loading, success, and error states with proper assertions
  - Test timing and cleanup in useEffect
- **Acceptance Criteria:**
  - [x] Loading spinner visible during submission
  - [x] Form disabled during submission
  - [x] Success toast displays with action buttons
  - [x] Error toast displays with message
  - [x] Toasts auto-dismiss correctly
  - [x] Error doesn't prevent form submission retry
- **Estimated Time:** 1 hour

---

### Phase 8: Real-Time Synchronization & Caching

#### Task 8.1: Implement Realtime Sync Hook
- **Status:** ✅ Completed
- **Requirements:** Req 7 (sync between views), Req 10 (UI feedback)
- **Description:** Create custom React hook `useActivityRealtime` that subscribes to Supabase Realtime events for activity changes and invalidates React Query caches to trigger automatic re-fetches and UI updates.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/hooks/useActivityRealtime.ts`
  - [x] Subscribe to Supabase Realtime channel for activities
  - [x] Filter by user_id for multi-tenant isolation
  - [x] On INSERT/UPDATE/DELETE, invalidate React Query cache keys
  - [x] Publish custom events for Dashboard/Calendar/Lists to listen to
  - [x] Handle connection loss with fallback polling (30 sec interval)
  - [x] Implement reconnection logic
  - [x] Add subscription cleanup on unmount
  - [x] Test that changes propagate < 100ms
- **Skills Reference:** 
  - **react-testing-patterns:** Hook testing with "Hook Testing Pattern" - use renderHook() and waitFor()
  - Verify subscription behavior, cache invalidation, and edge cases
- **Acceptance Criteria:**
  - [x] Realtime subscription established
  - [x] Changes trigger cache invalidation
  - [x] Components re-render with new data
  - [x] Sync latency < 100ms (measurable)
  - [x] Connection loss handled gracefully
  - [x] Cleanup prevents memory leaks
- **Estimated Time:** 1.5 hours

---

#### Task 8.2: Implement Activity Data Loading with React Query
- **Status:** ✅ Completed
- **Requirements:** Req 20 (dynamic subject loading), Req 7 (sync)
- **Description:** Create React Query hooks for fetching activities and subjects with caching, revalidation, and real-time sync integration. Enables efficient data loading with automatic background updates.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/hooks/useActivities.ts`
  - [x] Create `useActivity.ts` for single activity fetch
  - [x] Create `useSubjects.ts` for subject list with revalidateTag caching
  - [x] Implement 5-minute cache duration for subjects
  - [x] Setup stale-while-revalidate pattern
  - [x] Integrate with `useActivityRealtime` for live updates
  - [x] Handle loading, error, and success states
  - [x] Implement retry logic for network failures
  - [x] Add query key management via QueryClient
- **Skills Reference:** 
  - **react-testing-patterns:** Test hooks with "Hook Testing Pattern" using renderHook
  - Mock fetch calls with MSW patterns
- **Acceptance Criteria:**
  - [x] Data fetches correctly from server
  - [x] Cache works for repeated requests
  - [x] Realtime updates trigger re-fetch
  - [x] Loading states properly handled
  - [x] Errors caught and displayed
- **Estimated Time:** 1.5 hours

---

### Phase 9: Offline-First & IndexedDB

#### Task 9.1: Implement Offline Storage with IndexedDB
- **Status:** ✅ Completed
- **Requirements:** Req 16 (offline handling), Req 13 (session history)
- **Description:** Create offline storage system using Dexie.js for persisting activities created while offline, with automatic sync when connectivity returns. Includes sync queue tracking.
- **Sub-tasks:**
  - [x] Create `src/features/activities/presentation/lib/offlineSync.ts`
  - [x] Setup Dexie database schema: `activities`, `syncQueue`
  - [x] Implement `saveActivityOffline()` function
  - [x] Implement `syncPendingActivities()` function
  - [x] Track sync status (PENDING, SYNCED, FAILED)
  - [x] Implement retry logic (max 3 attempts)
  - [x] Listen to `online` event to trigger sync
  - [x] Detect offline status with `navigator.onLine`
  - [x] Display user notifications for sync status
  - [x] Handle merge conflicts (server vs local)
  - [x] Clear sync queue after successful sync
- **Skills Reference:** 
  - **pwa-offline-patterns:** Implement offline-first synchronization using "Offline-First Data Sync" pattern
  - Use "Local Storage Cache Layer" and "Offline-First Hook" patterns
  - Follow "Online Status Hook" for connectivity detection
- **Acceptance Criteria:**
  - [x] Activities persist to IndexedDB when offline
  - [x] Sync queue created with proper status tracking
  - [x] Online event triggers sync automatically
  - [x] Retries implemented for failed syncs
  - [x] User notified of sync status
  - [x] No data loss during sync
- **Estimated Time:** 1.5 hours

---

#### Task 9.2: Integrate Offline Detection in Forms
- **Status:** ✅ Completed
- **Requirements:** Req 16 (offline messaging)
- **Description:** Update form components to detect offline status, display warnings, and save to IndexedDB instead of calling server action when offline.
- **Sub-tasks:**
  - [x] Create `useIsOnline()` hook for detecting connectivity
  - [x] Update form submit handlers to check offline status
  - [x] Display banner: "Você está offline. A atividade será sincronizada ao conectar."
  - [x] On offline submit, call `saveActivityOffline()` instead of server action
  - [x] Show success toast: "Salvo localmente, será sincronizado ao conectar"
  - [x] Prevent form submission attempts if critical fields missing
  - [x] Close modal after local save
  - [x] Update sync queue status in UI
- **Skills Reference:** 
  - **pwa-offline-patterns:** Use "Online Status Hook" pattern for connectivity detection
  - Apply "Offline-First Hook" to integrate offline storage with form submission
- **Acceptance Criteria:**
  - [x] Offline status detected and displayed
  - [x] Activities save to IndexedDB when offline
  - [x] User receives clear feedback
  - [x] No errors thrown when offline
  - [x] Sync triggers automatically when online
- **Estimated Time:** 1 hour

---

### Phase 10: Property-Based Testing & Correctness Validation

#### Task 10.1: Write Property-Based Tests for Domain Entities
- **Status:** ✅ Completed
- **Requirements:** Req 18 (tests coverage > 85%), Req 25 (reminder tests), Correctness Properties 1-5, 11-13
- **Description:** Create property-based tests using fast-check that validate domain invariants across generated inputs: UUID uniqueness, timestamp validity, deadline constraints, and reminder ordering.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/domain.test.ts`
  - [x] Property test: All activity UUIDs are unique (create 100+ activities)
  - [x] Property test: Timestamps are valid (createdAt <= now, updatedAt >= createdAt)
  - [x] Property test: Deadline validation (dueDate >= today)
  - [x] Property test: Reminder timestamps always before event (Correctness Property 11)
  - [x] Property test: Reminder timestamps never in past (Correctness Property 12)
  - [x] Property test: Max 3 reminders per activity (Correctness Property 13)
  - [x] Generate test data with fast-check arbitraries
  - [x] Verify invariants hold for 1000+ generated examples
  - [x] Add shrinking to simplify failing examples
  - [x] Achieve > 85% coverage of domain layer
- **Skills Reference:** 
  - **react-testing-patterns:** Vitest + property-based testing patterns for domain layer validation
  - Use "Core Principles" section: test behavior, arrange-act-assert, test isolation
  - Run tests with Vitest and generate coverage reports
- **Acceptance Criteria:**
  - [x] All property tests pass with 1000+ examples
  - [x] Coverage > 85% for domain layer
  - [x] Failing examples shrunk to minimal cases
  - [x] Tests run in < 5 seconds
  - [x] All correctness properties validated
- **Estimated Time:** 2 hours

---

#### Task 10.2: Write Unit & Integration Tests for Use Cases
- **Status:** ✅ Completed
- **Requirements:** Req 18 (integration tests), Req 25 (reminder tests)
- **Description:** Create unit and integration tests for all use cases covering happy paths, error scenarios, edge cases, and reminder calculations. Target > 85% coverage of application layer.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/useCases.test.ts`
  - [x] Test `CreateActivityUseCase` with valid inputs for all 3 types
  - [x] Test validation errors returned correctly
  - [x] Test Supabase errors mapped to ActivityError
  - [x] Test reminder timestamp calculation with multiple reminder types
  - [x] Test max 3 reminders validation
  - [x] Test duplicate reminder detection
  - [x] Test activity with no reminders
  - [x] Test timezone handling (UTC storage, local display)
  - [x] Mock repository for unit tests
  - [x] Integration tests with real Supabase instance (test DB)
  - [x] Achieve > 85% coverage of application layer
- **Skills Reference:** 
  - **react-testing-patterns:** Follow "Arrange-Act-Assert Pattern" and test isolation principles
  - Use mock/stub patterns for repositories
  - Setup test fixtures for complex data
- **Acceptance Criteria:**
  - [x] All use case paths tested
  - [x] Error scenarios validated
  - [x] Coverage > 85% of application layer
  - [x] Tests run in < 10 seconds
  - [x] No flaky tests
- **Estimated Time:** 2 hours

---

#### Task 10.3: Write E2E Tests for Complete Workflows
- **Status:** ✅ Completed
- **Requirements:** Req 18 (E2E tests), Req 25 (reminder E2E tests)
- **Description:** Create end-to-end tests with Playwright that validate complete user journeys: creating all 3 activity types with reminders, viewing in Dashboard/Calendar, handling errors, and offline scenarios.
- **Sub-tasks:**
  - [x] Create `e2e/activities.spec.ts`
  - [x] Test: Create Task from "+ Nova Atividade" to appearing in Dashboard
  - [x] Test: Create Exam with all fields and reminders
  - [x] Test: Create Assignment and verify status flow
  - [x] Test: Add 3 reminders and verify preview updates
  - [x] Test: Try to add 4th reminder and get error
  - [x] Test: Invalid input shows error message
  - [x] Test: Error on submit keeps modal open
  - [x] Test: Success toast shows with "Open" and "New" actions
  - [x] Test: Click "Open" navigates to activity detail (if available)
  - [x] Test: Click "New" opens type selector again
  - [x] Test: Multiple activities appear in calendar on correct dates
  - [x] Test: Offline create, sync when online (if applicable)
- **Skills Reference:** 
  - **react-testing-patterns:** Use "E2E Testing Patterns" and "Authentication Flow" fixture patterns
  - Create reusable test fixtures for authenticated sessions
  - Test complete user workflows from login to activity creation
- **Acceptance Criteria:**
  - [x] All critical user paths tested
  - [x] Tests pass on CI/CD pipeline
  - [x] Tests run in < 30 seconds (parallel)
  - [x] No flaky tests (retry-free)
  - [x] Coverage of success and error scenarios
- **Estimated Time:** 2.5 hours

---

#### Task 10.4: Write Validation Tests with > 85% Schema Coverage
- **Status:** ✅ Completed
- **Requirements:** Req 5 (Zod tests), Req 18 (coverage > 85%), Req 23-25 (reminder validation tests)
- **Description:** Create comprehensive tests for all Zod schemas covering valid inputs, invalid inputs, boundary cases, error messages, and all validation rules. Target > 85% coverage of schemas.
- **Sub-tasks:**
  - [x] Create `__tests__/features/activities/schemas.test.ts`
  - [x] Test `createTaskSchema` with valid/invalid inputs
  - [x] Test `createExamSchema` with all exam types
  - [x] Test `createAssignmentSchema` with all assignment types
  - [x] Test `reminderSchema` with all reminder types and custom offsets
  - [x] Test boundary values: min/max lengths, dates, times
  - [x] Test error messages are in Portuguese
  - [x] Test required field validation
  - [x] Test optional field handling (can be undefined)
  - [x] Test date validation (past dates rejected)
  - [x] Test time validation (00:00-23:59)
  - [x] Test discriminated union routes correctly
  - [x] Test reminder max 3 validation
  - [x] Test duplicate reminder detection
  - [x] Achieve > 85% coverage of schemas
- **Skills Reference:** 
  - **react-testing-patterns:** Use "Core Principles" and "Test Isolation" patterns for schema validation
  - Test all code paths (happy path, error cases, edge cases)
  - Use Vitest with proper mocking/stubbing
- **Acceptance Criteria:**
  - [x] All schema paths tested
  - [x] Coverage > 85% of schemas
  - [x] Error messages verified
  - [x] Edge cases covered
  - [x] Tests run in < 5 seconds
- **Estimated Time:** 1.5 hours

---

### Phase 11: Integration & Documentation

#### Task 11.1: Integrate Activity Creation into Dashboard
- **Status:** ✅ Completed
- **Requirements:** Req 1 (modal entry point), Req 7 (sync to dashboard)
- **Description:** Connect the activity creation feature to the Dashboard by adding the "+ Nova Atividade" button, integrating the type selector modal, and ensuring created activities appear in real-time via Realtime sync.
- **Sub-tasks:**
  - [x] Update Dashboard component to include "+ Nova Atividade" button
  - [x] Add `ActivityTypeSelector` modal to Dashboard
  - [x] Manage modal open/close state
  - [x] Subscribe Dashboard to realtime activity changes
  - [x] Re-render when new activities arrive
  - [x] Ensure no duplicate renders
  - [x] Test complete flow: Dashboard -> Modal -> Form -> Activity appears
  - [x] Verify sync happens < 100ms
- **Skills Reference:** 
  - **react-testing-patterns:** Component integration testing - test complete user flow end-to-end
  - Mock server responses and Realtime events
- **Acceptance Criteria:**
  - [x] "+ Nova Atividade" button visible
  - [x] Modal opens on click
  - [x] Form navigated to on type selection
  - [x] Created activity appears in Dashboard < 100ms
  - [x] No unnecessary re-renders
- **Estimated Time:** 1 hour

---

#### Task 11.2: Write Comprehensive Documentation
- **Status:** ✅ Completed
- **Requirements:** All 25 requirements (documentation)
- **Description:** Create complete feature documentation: architecture overview, API reference for use cases, schema documentation, component props, error codes, and user guide for forms.
- **Sub-tasks:**
  - [x] Document architecture: 4-layer overview with diagrams
  - [x] Document use cases: inputs, outputs, error scenarios
  - [x] Document repositories: methods and error handling
  - [x] Document Zod schemas: validation rules per field
  - [x] Document React components: props, events, accessibility
  - [x] Document server actions: input/output contracts
  - [x] Document error codes and messages (Portuguese)
  - [x] Create user guide for form flows
  - [x] Document reminder calculation logic
  - [x] Document RLS policies and security
  - [x] Add inline code comments for complex logic
  - [x] Create migration guide for setup
- **Skills Reference:** 
  - **clean-architecture-patterns:** Follow "Folder Structure Following Clean Architecture" for organization reference
  - Document each layer separately with responsibilities and examples
- **Acceptance Criteria:**
  - [x] Architecture documented
  - [x] All APIs documented
  - [x] Examples provided
  - [x] Error handling documented
  - [x] User guide complete
- **Estimated Time:** 2 hours

---

#### Task 11.3: Quality Assurance & Performance Verification
- **Status:** ✅ Completed
- **Requirements:** Correctness Properties 1-13, Req 18 (test coverage > 85%)
- **Description:** Run full test suites (unit, integration, E2E), verify coverage metrics, measure performance (creation time, sync latency), and validate all correctness properties hold.
- **Sub-tasks:**
  - [x] Run `npm run test` - all unit tests pass
  - [x] Run `npm run test:e2e` - all E2E tests pass
  - [x] Generate coverage report: `npm run test -- --coverage`
  - [x] Verify coverage > 85% for critical paths
  - [x] Measure creation time < 30 seconds for all types
  - [x] Measure sync latency < 100ms
  - [x] Measure Zod validation time < 50ms
  - [x] Test with 100+ concurrent activities
  - [x] Verify RLS blocks cross-user access
  - [x] Check for memory leaks in components
  - [x] Validate all error messages are clear and actionable
  - [x] Create performance report
- **Skills Reference:** 
  - **react-testing-patterns:** Run full test suite with Vitest, check coverage metrics
  - Use "Testing Strategy" section for coverage targets
  - Verify all correctness properties validated through property-based tests
- **Acceptance Criteria:**
  - [x] All tests pass
  - [x] Coverage > 85%
  - [x] Performance targets met
  - [x] No memory leaks
  - [x] RLS policies effective
  - [x] Error messages clear
- **Estimated Time:** 1.5 hours

---

### Phase 12: Polish & Final Deliverables

#### Task 12.1: Polish UI/UX and Accessibility
- **Status:** ✅ Completed
- **Requirements:** All form components, accessibility compliance
- **Description:** Final refinement of UI/UX: smooth animations, consistent spacing, mobile responsiveness, keyboard navigation, screen reader support, and WCAG 2.1 AA compliance.
- **Sub-tasks:**
  - [x] Review all form layouts on mobile, tablet, desktop
  - [x] Verify animations are smooth (< 60fps)
  - [x] Test keyboard navigation (Tab, Shift+Tab, Enter, ESC)
  - [x] Verify focus indicators visible on all buttons
  - [x] Test with screen reader (VoiceOver/NVDA)
  - [x] Verify color contrast ratios (WCAG AA: 4.5:1 for text)
  - [x] Check form error messages are announced
  - [x] Verify labels properly associated with inputs
  - [x] Test modal focus trap
  - [x] Test form reset on error
  - [x] Optimize animations for reduced-motion preference
- **Skills Reference:** 
  - **react-testing-patterns:** Test accessibility with screen readers and keyboard navigation
  - Verify ARIA labels and focus management
- **Acceptance Criteria:**
  - [x] Responsive on all screen sizes
  - [x] Keyboard navigable
  - [x] Screen reader compatible
  - [x] Color contrast compliant
  - [x] Animations smooth (60fps)
  - [x] WCAG 2.1 AA compliant
- **Estimated Time:** 1.5 hours

---

#### Task 12.2: Final Testing & Bug Fixes
- **Status:** ✅ Completed
- **Requirements:** All 25 requirements (acceptance criteria)
- **Description:** Final round of manual testing across browsers and devices, fix any remaining bugs, and verify all acceptance criteria from requirements are met.
- **Sub-tasks:**
  - [x] Test on Chrome, Firefox, Safari, Edge
  - [x] Test on iOS Safari and Android Chrome
  - [x] Manual test all 3 activity type creation flows
  - [x] Manual test all error scenarios
  - [x] Test offline create and sync
  - [x] Test with network throttling (slow 3G)
  - [x] Test with multiple browser tabs
  - [x] Verify all toast messages display correctly
  - [x] Verify all form fields validate correctly
  - [x] Check for console errors/warnings
  - [x] Document any known issues
  - [x] Create bug list for future fix
- **Skills Reference:** 
  - **react-testing-patterns:** E2E testing with Playwright across browsers and devices
  - **pwa-offline-patterns:** Test offline create and sync functionality
- **Acceptance Criteria:**
  - [x] No critical bugs
  - [x] Works on all browsers
  - [x] Works on mobile
  - [x] Offline works
  - [x] All acceptance criteria met
- **Estimated Time:** 2 hours

---

#### Task 12.3: Prepare for Release & Knowledge Transfer
- **Status:** ✅ Completed
- **Requirements:** All 25 requirements (feature complete)
- **Description:** Prepare feature for production release: verify all env variables configured, run security scan, create release notes, and document any manual setup steps.
- **Sub-tasks:**
  - [x] Verify all environment variables documented
  - [x] Run security audit: `npm audit`
  - [x] Check for hardcoded secrets (grep, npm package)
  - [x] Create release notes summarizing feature
  - [x] Document breaking changes (if any)
  - [x] Create deployment checklist
  - [x] Verify database migrations run on production
  - [x] Document rollback procedure
  - [x] Update README with feature description
  - [x] Tag version in git (e.g., v0.2.0)
  - [x] Create handoff documentation for team
- **Skills Reference:** 
  - **supabase-rls-auth:** Reference RLS policies and security best practices in release notes
  - Document database migration steps
- **Acceptance Criteria:**
  - [x] No security issues
  - [x] Env vars documented
  - [x] Release notes created
  - [x] Deployment guide complete
  - [x] Rollback procedure documented
- **Estimated Time:** 1 hour

---

## Summary

**Total Phases:** 12 (Setup → Database → API → Forms → Validation → Sync → Offline → Testing → Integration → Documentation → Polish → Release)

**Total Tasks:** 27 (1-1.3, 2.1-2.3, 3.1-3.2, 4.1-4.2, 5.1-5.2, 6.1-6.5, 7.1-7.2, 8.1-8.2, 9.1-9.2, 10.1-10.4, 11.1-11.3, 12.1-12.3)

**Estimated Total Time:** ~45-50 hours (~3-4 days of focused development)

**Key Dependencies:**
- Phase 1 (Setup) blocks all other phases
- Phase 2 (Domain) needed before Phase 3 (Application)
- Phase 3 (Application) needed before Phase 5 (Validation)
- Phase 4 (Infrastructure) done in parallel with Phase 3-5
- Phase 6 (Components) needs Phase 5 (Validation) complete
- Phase 8-9 (Sync/Offline) can start after Phase 6
- Phase 10-12 (Testing/Polish) starts after Phase 8-9

**Test Coverage Target:** > 85% across all layers (domain, application, presentation schemas)

**Performance Targets:**
- Activity creation: < 30 seconds
- Real-time sync: < 100ms
- Zod validation: < 50ms
- Subject loading: < 500ms

**All 13 Correctness Properties** are validated across unit tests (domain), integration tests (use cases), and E2E tests (user workflows).
