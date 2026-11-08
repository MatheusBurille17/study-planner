# Project Structure & Organization

## Directory Layout

```
amanda-study-planner/
├── .kiro/                         # Kiro project documentation
│   ├── steering/                  # Development steering guides
│   │   ├── tech.md                # Tech stack & commands
│   │   ├── structure.md           # Project organization (this file)
│   │   └── product.md             # Product overview & specs
│   └── skills/                    # Custom skills (if any)
│
├── .github/
│   └── workflows/                 # GitHub Actions CI/CD
│       ├── test.yml               # Run tests on PR
│       ├── build.yml              # Build on push
│       └── deploy.yml             # Deploy to Vercel
│
├── public/
│   ├── icons/                     # App icons (PWA icons 192x192, 512x512)
│   ├── images/                    # Static images
│   ├── manifest.json              # Web App Manifest
│   └── service-worker.js          # Service Worker
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Authentication routes group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (main)/                # Main app routes group
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── activities/
│   │   │   │   ├── page.tsx       # Activities list
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx   # Activity detail
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── page.tsx       # Calendar view
│   │   │   │   └── [date]/
│   │   │   │       └── page.tsx
│   │   │   ├── subjects/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── notifications/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx         # Main app layout
│   │   │
│   │   ├── api/                   # API Routes & handlers
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── logout/
│   │   │   │   │   └── route.ts
│   │   │   │   └── refresh/
│   │   │   │       └── route.ts
│   │   │   ├── activities/
│   │   │   │   ├── route.ts       # GET, POST
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts   # GET, PUT, DELETE
│   │   │   ├── subjects/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── notifications/
│   │   │   │   ├── subscribe/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── unsubscribe/
│   │   │   │   │   └── route.ts
│   │   │   │   └── send/
│   │   │   │       └── route.ts
│   │   │   └── health/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Root page (redirect to login/dashboard)
│   │   ├── globals.css            # Global Tailwind styles
│   │   └── favicon.ico
│   │
│   ├── features/                  # Feature-based modules (Clean Architecture)
│   │   │
│   │   ├── activities/            # Activities/Tasks feature
│   │   │   ├── domain/            # Business logic & invariants
│   │   │   │   ├── activity.ts    # Activity entity
│   │   │   │   ├── rules.ts       # Business rules
│   │   │   │   └── repository.ts  # Repository interface
│   │   │   │
│   │   │   ├── application/       # Use cases & orchestration
│   │   │   │   ├── useCases/
│   │   │   │   │   ├── createActivity.ts
│   │   │   │   │   ├── updateActivity.ts
│   │   │   │   │   ├── deleteActivity.ts
│   │   │   │   │   ├── getActivity.ts
│   │   │   │   │   └── listActivities.ts
│   │   │   │   └── dto/
│   │   │   │       ├── CreateActivityDTO.ts
│   │   │   │       ├── UpdateActivityDTO.ts
│   │   │   │       └── ActivityResponseDTO.ts
│   │   │   │
│   │   │   ├── infrastructure/    # Implementations & adapters
│   │   │   │   ├── supabaseActivityRepository.ts
│   │   │   │   └── mappers/
│   │   │   │       └── activityMapper.ts
│   │   │   │
│   │   │   └── presentation/      # UI & validation
│   │   │       ├── components/
│   │   │       │   ├── ActivityCard.tsx
│   │   │       │   ├── ActivityForm.tsx
│   │   │       │   ├── ActivityList.tsx
│   │   │       │   └── ActivityFilter.tsx
│   │   │       ├── actions/
│   │   │       │   ├── createActivity.ts     # Server Actions
│   │   │       │   ├── updateActivity.ts
│   │   │       │   ├── deleteActivity.ts
│   │   │       │   └── getActivities.ts
│   │   │       └── schemas/
│   │   │           ├── createActivitySchema.ts
│   │   │           └── updateActivitySchema.ts
│   │   │
│   │   ├── subjects/              # Subjects/Disciplines feature
│   │   │   ├── domain/
│   │   │   │   ├── subject.ts
│   │   │   │   └── repository.ts
│   │   │   ├── application/
│   │   │   │   ├── useCases/
│   │   │   │   │   ├── createSubject.ts
│   │   │   │   │   ├── updateSubject.ts
│   │   │   │   │   ├── deleteSubject.ts
│   │   │   │   │   └── listSubjects.ts
│   │   │   │   └── dto/
│   │   │   │       └── SubjectResponseDTO.ts
│   │   │   ├── infrastructure/
│   │   │   │   └── supabaseSubjectRepository.ts
│   │   │   └── presentation/
│   │   │       ├── components/
│   │   │       │   ├── SubjectCard.tsx
│   │   │       │   ├── SubjectForm.tsx
│   │   │       │   └── SubjectList.tsx
│   │   │       ├── actions/
│   │   │       │   ├── createSubject.ts
│   │   │       │   ├── updateSubject.ts
│   │   │       │   ├── deleteSubject.ts
│   │   │       │   └── getSubjects.ts
│   │   │       └── schemas/
│   │   │           └── subjectSchema.ts
│   │   │
│   │   ├── calendar/              # Calendar view feature
│   │   │   ├── domain/
│   │   │   │   └── calendarRules.ts
│   │   │   ├── application/
│   │   │   │   └── getCalendarEvents.ts
│   │   │   └── presentation/
│   │   │       ├── components/
│   │   │       │   ├── CalendarView.tsx
│   │   │       │   ├── CalendarMonth.tsx
│   │   │       │   ├── CalendarWeek.tsx
│   │   │       │   └── DayCell.tsx
│   │   │       └── actions/
│   │   │           └── getEventsForDate.ts
│   │   │
│   │   ├── dashboard/             # Dashboard feature
│   │   │   ├── domain/
│   │   │   │   └── dashboardRules.ts
│   │   │   ├── application/
│   │   │   │   ├── getDashboardSummary.ts
│   │   │   │   └── getStatistics.ts
│   │   │   └── presentation/
│   │   │       ├── components/
│   │   │       │   ├── DashboardHeader.tsx
│   │   │       │   ├── UpcomingEvents.tsx
│   │   │       │   ├── Statistics.tsx
│   │   │       │   ├── QuickStats.tsx
│   │   │       │   └── WeekOverview.tsx
│   │   │       └── actions/
│   │   │           └── getDashboardData.ts
│   │   │
│   │   ├── notifications/         # Notifications & reminders
│   │   │   ├── domain/
│   │   │   │   ├── notification.ts
│   │   │   │   ├── rules.ts       # Reminder timing rules
│   │   │   │   └── repository.ts
│   │   │   ├── application/
│   │   │   │   ├── useCases/
│   │   │   │   │   ├── subscribeToNotifications.ts
│   │   │   │   │   ├── unsubscribeFromNotifications.ts
│   │   │   │   │   └── sendReminder.ts
│   │   │   │   └── dto/
│   │   │   │       └── NotificationDTO.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── pushService.ts
│   │   │   │   ├── notificationRepository.ts
│   │   │   │   └── vapidKeys.ts
│   │   │   └── presentation/
│   │   │       ├── components/
│   │   │       │   ├── NotificationCenter.tsx
│   │   │       │   └── NotificationSettings.tsx
│   │   │       ├── actions/
│   │   │       │   └── updateNotificationPreferences.ts
│   │   │       └── hooks/
│   │   │           └── useNotifications.ts
│   │   │
│   │   └── auth/                  # Authentication feature
│   │       ├── domain/
│   │       │   ├── user.ts
│   │       │   └── repository.ts
│   │       ├── application/
│   │       │   ├── useCases/
│   │       │   │   ├── login.ts
│   │       │   │   ├── register.ts
│   │       │   │   ├── logout.ts
│   │       │   │   ├── resetPassword.ts
│   │       │   │   └── verifySession.ts
│   │       │   └── dto/
│   │       │       ├── LoginDTO.ts
│   │       │       └── UserResponseDTO.ts
│   │       ├── infrastructure/
│   │       │   ├── supabaseAuthService.ts
│   │       │   └── authRepository.ts
│   │       └── presentation/
│   │           ├── components/
│   │           │   ├── LoginForm.tsx
│   │           │   ├── RegisterForm.tsx
│   │           │   ├── ProtectedRoute.tsx
│   │           │   └── AuthProvider.tsx
│   │           ├── actions/
│   │           │   ├── loginAction.ts
│   │           │   ├── registerAction.ts
│   │           │   └── logoutAction.ts
│   │           ├── hooks/
│   │           │   └── useAuth.ts
│   │           └── schemas/
│   │               ├── loginSchema.ts
│   │               └── registerSchema.ts
│   │
│   └── shared/                    # Shared utilities, components & types
│       ├── components/            # Reusable UI components
│       │   ├── ui/                # shadcn/ui components (auto-imported)
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Navigation.tsx
│       │   │   └── MainLayout.tsx
│       │   ├── common/
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Loading.tsx
│       │   │   └── ErrorBoundary.tsx
│       │   └── icons/             # Custom icons
│       │       └── index.tsx
│       │
│       ├── lib/                   # Utility libraries
│       │   ├── supabase/
│       │   │   ├── client.ts      # Browser client
│       │   │   ├── server.ts      # Server client
│       │   │   └── admin.ts       # Admin client (for edge functions)
│       │   ├── auth/
│       │   │   ├── middleware.ts  # Auth middleware
│       │   │   └── helpers.ts
│       │   ├── notifications/
│       │   │   ├── service-worker-registration.ts
│       │   │   ├── vapidHelper.ts
│       │   │   └── pushHelper.ts
│       │   ├── env.ts             # Environment validation
│       │   └── date.ts            # Date utilities
│       │
│       ├── types/
│       │   ├── database.types.ts  # Generated Supabase types
│       │   ├── index.ts           # Exported types
│       │   ├── activity.ts
│       │   ├── subject.ts
│       │   ├── notification.ts
│       │   └── user.ts
│       │
│       ├── utils/                 # Utility functions
│       │   ├── dateHelpers.ts     # Date formatting, calculations
│       │   ├── validation.ts      # Validation helpers
│       │   ├── formatting.ts      # String formatting
│       │   ├── classNames.ts      # Class name utilities
│       │   └── constants.ts       # Shared constants
│       │
│       ├── constants/             # App-wide constants
│       │   ├── config.ts
│       │   ├── defaultValues.ts
│       │   ├── errorMessages.ts
│       │   ├── reminders.ts       # Reminder timing configs
│       │   └── apiEndpoints.ts
│       │
│       ├── config/                # Shared configuration
│       │   ├── queryClient.ts
│       │   ├── notificationConfig.ts
│       │   └── formConfig.ts
│       │
│       └── hooks/                 # Shared React hooks
│           ├── useQuery.ts
│           ├── useMutation.ts
│           └── useLocalStorage.ts
│
├── supabase/                      # Supabase backend configuration
│   ├── migrations/                # Database migrations (numbered)
│   │   ├── 20240101_init_schema.sql
│   │   ├── 20240102_auth_setup.sql
│   │   ├── 20240103_rls_policies.sql
│   │   └── ...
│   ├── functions/                 # Supabase Edge Functions
│   │   ├── send-reminders/
│   │   │   ├── index.ts
│   │   │   └── deno.json
│   │   ├── sync-calendar/
│   │   │   └── index.ts
│   │   └── health-check/
│   │       └── index.ts
│   ├── tests/                     # Database tests (pgtap)
│   │   ├── schema_tests.pgsql
│   │   ├── rls_tests.pgsql
│   │   └── functions_tests.pgsql
│   ├── seed.sql                   # Database seed data (dev only)
│   └── config.toml                # Supabase config
│
├── e2e/                           # End-to-end tests (Playwright)
│   ├── fixtures/
│   │   └── auth.ts                # Auth fixture
│   ├── specs/
│   │   ├── auth.spec.ts
│   │   ├── activities.spec.ts
│   │   ├── calendar.spec.ts
│   │   └── notifications.spec.ts
│   ├── playwright.config.ts
│   └── utils/
│       └── test-helpers.ts
│
├── __tests__/                     # Unit tests (Vitest)
│   ├── features/
│   │   ├── activities/
│   │   │   ├── domain.test.ts
│   │   │   ├── useCases.test.ts
│   │   │   └── components.test.tsx
│   │   ├── calendar/
│   │   │   └── calendarRules.test.ts
│   │   └── notifications/
│   │       └── reminderRules.test.ts
│   ├── shared/
│   │   ├── utils/
│   │   │   ├── dateHelpers.test.ts
│   │   │   └── validation.test.ts
│   │   └── lib/
│   │       └── supabase.test.ts
│   └── setup.ts                   # Test setup
│
├── .env.example                   # Environment template
├── .env.local                     # Local environment (gitignored)
├── .gitignore
├── .eslintrc.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── package-lock.json
└── README.md
```

## Naming Conventions

### Files
- **Components:** PascalCase (e.g., `TaskCard.tsx`, `DashboardHeader.tsx`)
- **Services:** camelCase with "Service" suffix (e.g., `taskService.ts`)
- **Hooks:** camelCase with "use" prefix (e.g., `useTasks.ts`)
- **Types:** PascalCase (e.g., `models.ts` contains types `Task`, `Exam`)
- **Utils:** camelCase (e.g., `dateHelpers.ts`, `validation.ts`)

### Variables & Functions
- **Functions:** camelCase (e.g., `getTasksForDate()`, `isDeadlineSoon()`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_REMINDER_HOURS`, `API_BASE_URL`)
- **React Components:** PascalCase (e.g., `function TaskCard() {}`)

### CSS Classes (if using BEM or similar)
- Use lowercase with hyphens (e.g., `.task-card`, `.task-card__title`, `.task-card--urgent`)

## Core Data Models

### Task
```
- id: string (UUID)
- title: string (required)
- description?: string
- discipline?: string
- dueDate?: Date
- priority: 'low' | 'medium' | 'high'
- status: 'todo' | 'in-progress' | 'completed'
- estimatedTime?: number (minutes)
- tags?: string[]
- createdAt: Date
- updatedAt: Date
```

### Exam
```
- id: string (UUID)
- discipline: string (required)
- date: Date (required)
- time: string
- content: string[]
- type: 'written' | 'oral' | 'practical'
- location?: string
- notes?: string
- createdAt: Date
- updatedAt: Date
```

### Assignment
```
- id: string (UUID)
- discipline: string (required)
- dueDate: Date (required)
- description: string (required)
- type: 'written' | 'presentation' | 'project'
- criteria?: string
- status: 'pending' | 'submitted' | 'graded'
- createdAt: Date
- updatedAt: Date
```

## Key Architectural Decisions

1. **Feature-Based Architecture:** Each major feature (activities, subjects, calendar, etc.) is a self-contained module with clear layer separation
2. **Clean Architecture Layers:** Domain → Application → Infrastructure → Presentation, with dependencies pointing inward
3. **Domain-Driven Design:** Rich domain models in the domain layer with business rules and entities
4. **Repository Pattern:** Abstractions in domain layer, implementations in infrastructure layer
5. **Monolithic Modular:** Organized as a single Next.js app with feature modules that can evolve independently
6. **Next.js App Router:** Server-first approach with Server Actions for mutations
7. **Supabase PostgreSQL:** Single source of truth for data, with RLS policies for row-level security
8. **Offline-First with Sync:** Client-side caching with Supabase real-time sync
9. **PWA Capabilities:** Service Worker and Web App Manifest for installation and offline functionality
10. **SOLID Principles:** Applied throughout the codebase for maintainability

## Code Organization Principles

- **Single Responsibility:** Each layer has one clear purpose (Domain handles rules, Application handles use cases, Infrastructure handles external services, Presentation handles UI)
- **Dependency Inversion:** High-level modules depend on abstractions, not concrete implementations
- **DRY (Don't Repeat Yourself):** Shared utilities in `src/shared/`
- **Component Composition:** Build complex UIs from small, focused components
- **Use Cases as Service Layer:** Application layer contains orchestration logic
- **Type Safety:** Full TypeScript with strict mode throughout
- **Server/Client Separation:** Leverage Next.js Server Actions for mutations, minimize client-side state
- **Feature Isolation:** Features are independent and can be developed/tested in parallel
- **Lazy Loading:** Import features as needed, tree-shake unused code


## Naming Conventions (Detailed)

### Files & Directories
- **Components:** PascalCase (e.g., `ActivityCard.tsx`, `DashboardHeader.tsx`)
- **Page routes:** lowercase with hyphens (e.g., `page.tsx`, `[id]/`)
- **Hooks:** camelCase with "use" prefix (e.g., `useActivities.ts`, `useNotifications.ts`)
- **Server Actions:** camelCase with verb prefix (e.g., `createActivity.ts`, `updateSubject.ts`)
- **Utils/Helpers:** camelCase (e.g., `dateHelpers.ts`, `validation.ts`)
- **Services:** camelCase with "Service" or "Repository" suffix (e.g., `supabaseActivityRepository.ts`, `pushService.ts`)
- **Schemas:** camelCase with "Schema" suffix (e.g., `createActivitySchema.ts`)
- **Types/Interfaces:** PascalCase in dedicated files (e.g., `Activity.ts`, `User.ts`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_REMINDER_HOURS`, `PRIORITY_LEVELS`)

### Variables & Functions
- **Functions:** camelCase with verb prefix (e.g., `getActivityById()`, `isDeadlineSoon()`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_TITLE_LENGTH`, `DEFAULT_PAGE_SIZE`)
- **React Components:** PascalCase function (e.g., `function ActivityCard() {}`)
- **React Props interfaces:** ComponentNameProps (e.g., `ActivityCardProps`)
- **Boolean variables/functions:** camelCase starting with is/has/can (e.g., `isLoading`, `hasError`, `canDelete`)
- **Enums:** PascalCase with values in UPPER_SNAKE_CASE (e.g., `enum Priority { LOW, MEDIUM, HIGH }`)

### CSS & Tailwind
- **Primary:** Use Tailwind classes only - no custom CSS unless absolutely necessary
- **Custom CSS:** lowercase with hyphens (e.g., `.activity-card`, `.activity-card__title`)
- **BEM notation:** For complex components needing custom styles

## Core Data Models

### Activity (Task)
```typescript
{
  id: string                                      // UUID
  title: string                                   // Required, max 200 chars
  description?: string                            // Max 2000 chars
  subjectId?: string                              // Foreign key to Subject
  dueDate?: Date                                  // Optional deadline
  priority: 'low' | 'medium' | 'high'            // Default: 'medium'
  status: 'todo' | 'in-progress' | 'completed'   // Default: 'todo'
  estimatedTimeMinutes?: number                   // Minutes estimate
  tags?: string[]                                 // Array of tags
  userId: string                                  // Foreign key to User (RLS)
  createdAt: Date
  updatedAt: Date
}
```

### Subject (Discipline)
```typescript
{
  id: string                                      // UUID
  name: string                                    // Required, max 100 chars
  code?: string                                   // Course code, max 50 chars
  color?: string                                  // Hex color for UI (#RRGGBB)
  professor?: string                              // Professor name, max 150 chars
  userId: string                                  // Foreign key to User (RLS)
  createdAt: Date
  updatedAt: Date
}
```

### Exam
```typescript
{
  id: string                                      // UUID
  subjectId: string                               // Foreign key to Subject
  date: Date                                      // Exam date (required)
  time?: string                                   // Exam time (HH:mm format)
  content?: string[]                              // Topics covered
  type: 'written' | 'oral' | 'practical'         // Exam type
  location?: string                               // Exam location/room
  notes?: string                                  // Additional notes
  userId: string                                  // Foreign key to User (RLS)
  createdAt: Date
  updatedAt: Date
}
```

### Assignment
```typescript
{
  id: string                                      // UUID
  subjectId: string                               // Foreign key to Subject
  title: string                                   // Assignment title
  description: string                             // Assignment description
  dueDate: Date                                   // Submission deadline
  type: 'written' | 'presentation' | 'project'
  criteria?: string                               // Grading criteria
  status: 'pending' | 'submitted' | 'graded'    // Default: 'pending'
  userId: string                                  // Foreign key to User (RLS)
  createdAt: Date
  updatedAt: Date
}
```

### Notification Subscription
```typescript
{
  id: string                                      // UUID
  userId: string                                  // Foreign key to User (RLS)
  endpoint: string                                // Push notification endpoint
  p256dh: string                                  // VAPID key p256dh
  auth: string                                    // VAPID key auth
  isActive: boolean                               // Subscription active status
  createdAt: Date
  updatedAt: Date
}
```

## Key Architectural Decisions

1. **Feature-Based Modules:** Each feature is a self-contained module with clear layer separation, enabling independent development and testing
2. **Clean Architecture Layers:** Domain → Application → Infrastructure → Presentation, enforcing dependency inversion and separation of concerns
3. **Domain-Driven Design:** Rich domain models encapsulate business rules and invariants; no anemic models
4. **Repository Pattern:** Domain layer defines repository interfaces; infrastructure layer provides Supabase implementations
5. **Server-First with Server Actions:** Leverage Next.js Server Actions for all mutations, minimizing client state and reducing API latency
6. **Type Safety First:** TypeScript strict mode mandatory; Zod schemas validate all inputs at system boundaries
7. **Supabase as Backend:** PostgreSQL with Row-Level Security policies, Supabase Auth for authentication, Edge Functions for scheduled tasks
8. **PWA-Ready Architecture:** Service Worker for offline support, Web App Manifest for installability, Web Push for reminders
9. **Monolithic Modular Design:** Single Next.js deployment with feature modules that can scale/separate if needed
10. **SOLID Principles:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion applied throughout

## Code Organization Principles

### Layer Responsibilities

**Domain Layer:**
- Business rules and invariants
- Entity definitions with embedded logic
- Repository interfaces (contracts)
- No external dependencies
- No framework knowledge
- Example: `Activity` entity knows what a valid priority is

**Application Layer:**
- Use case orchestration
- DTOs (Data Transfer Objects)
- Business logic composition
- Depends only on domain layer
- Example: `CreateActivityUseCase` orchestrates validation, repository calls, notifications

**Infrastructure Layer:**
- Repository implementations using Supabase
- External service integration
- Adapters and mappers
- Depends on domain and application layers
- Example: `SupabaseActivityRepository` implements activity storage

**Presentation Layer:**
- UI components (React)
- Server Actions for API calls
- Validation schemas (Zod)
- Form handling
- Depends on all layers
- Example: `ActivityForm` component with server action

### General Best Practices
- **Single Responsibility:** Each file/function does one thing well, making code testable and maintainable
- **Dependency Inversion:** Always depend on abstractions (interfaces), not concrete implementations
- **DRY (Don't Repeat Yourself):** Shared utilities and components in `src/shared/`, no code duplication
- **Component Composition:** Build complex UIs from small, focused, single-purpose components
- **Use Cases as Orchestrators:** Application layer coordinates domain logic, repository calls, and side effects
- **Type Safety:** Full TypeScript strict mode; no `any` types; comprehensive type coverage
- **Server/Client Boundary:** Leverage Server Actions for mutations, keep client state minimal and derived
- **Feature Isolation:** Features are independent; can be developed/tested in parallel with minimal coordination
- **Progressive Enhancement:** Build core functionality first, enhance with PWA capabilities
- **Error Handling:** Explicit error types, proper propagation, meaningful error messages for users
- **Testing Pyramid:** Unit tests for domain (90%+), integration tests for use cases (80%+), E2E for user flows (70%+)

## Import Organization

Follow this order to keep imports clean and scannable:

```typescript
// 1. React/Next.js core
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. External libraries (alphabetical)
import { format } from 'date-fns'
import { z } from 'zod'

// 3. Shared utilities and types
import { Button } from '@/shared/components'
import { formatDate } from '@/shared/utils/dateHelpers'

// 4. Feature layers (in order: domain → app → infra → presentation)
import { Activity } from '@/features/activities/domain/activity'
import { createActivityUseCase } from '@/features/activities/application/useCases/createActivity'
import { supabaseActivityRepository } from '@/features/activities/infrastructure/supabaseActivityRepository'

// 5. Same feature (relative imports)
import { ActivityCard } from './ActivityCard'
import { useActivityForm } from './useActivityForm'
```

## File Size Guidelines

- **Components:** 150-300 lines (split into smaller components if larger)
- **Hooks:** 50-100 lines (extract custom logic if larger)
- **Use cases:** 30-50 lines (orchestration only, delegate to domain)
- **Domain entities:** 40-80 lines (business rules and validation)
- **Types/Schemas:** Keep focused, one entity type per file
- **Utilities:** Keep functions small and pure, max 50 lines per function

## Testing Strategy

**Domain Tests (Unit):**
- Test business rules and entity invariants
- No mocking, test pure functions
- Target: 90%+ coverage

**Application Tests (Integration):**
- Test use case orchestration
- Mock repositories and external services
- Target: 80%+ coverage

**Infrastructure Tests:**
- Test repository implementations
- Use test database or mocked client
- Test database queries and mappers
- Target: 70%+ coverage

**Presentation Tests:**
- Component unit tests with shallow rendering
- Server action tests with mocked use cases
- Target: 70%+ coverage

**E2E Tests (Playwright):**
- Full user workflows
- Real database (test database)
- Real UI interactions
- Target: Cover critical paths (auth, create, read, update, delete)

## Documentation Standards

- **README.md:** Quick start, overview, tech stack links
- **Feature README:** Feature-specific setup and architecture (optional for complex features)
- **Code comments:** Only for "why", not "what" (code should be self-documenting)
- **Type annotations:** Always use explicit types, especially for function signatures
- **Error messages:** Clear, actionable, user-friendly
- **Server Action docs:** Document what each action does and what it returns

