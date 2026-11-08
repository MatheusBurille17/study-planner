# Clean Architecture Patterns for Amanda's Study Planner

## Overview

Clean Architecture patterns and domain-driven design principles applied to Amanda's Study Planner. Focuses on separation of concerns, dependency inversion, and testability across Domain, Application, Infrastructure, and Presentation layers.

## When to Use This Skill

Load this skill when:
- Creating new features or feature modules
- Designing domain entities and business rules
- Implementing use cases and application services
- Writing repository implementations
- Building React components that interact with business logic
- Refactoring existing code to improve architecture
- Testing business logic in isolation
- Deciding where code belongs (which layer)

## Layered Architecture Overview

```
┌─────────────────────────────────────┐
│      PRESENTATION LAYER             │  React Components
│  - UI Components                    │  Server Actions
│  - Form Validation (Zod)            │  Schemas
│  - User Interaction Handling        │
└──────────────┬──────────────────────┘
               │ depends on
┌──────────────▼──────────────────────┐
│     APPLICATION LAYER               │  Use Cases
│  - Use Case Orchestration           │  DTOs
│  - Business Logic Coordination      │  Service Layer
│  - No Framework Knowledge           │
└──────────────┬──────────────────────┘
               │ depends on
┌──────────────▼──────────────────────┐
│       DOMAIN LAYER                  │  Entities
│  - Business Rules                   │  Value Objects
│  - Entity Invariants                │  Interfaces
│  - No External Dependencies         │  Domain Services
└──────────────┬──────────────────────┘
               │ interfaces
┌──────────────▼──────────────────────┐
│   INFRASTRUCTURE LAYER              │  Repositories
│  - Repository Implementations       │  Adapters
│  - External Service Integration     │  Mappers
│  - Supabase Client                  │
└─────────────────────────────────────┘
```

## Layer Responsibilities

### Domain Layer (Business Rules)

The core of the application - contains pure business logic with **zero external dependencies**.

**What belongs here:**
- Entity definitions with embedded business rules
- Value objects
- Repository interfaces (contracts)
- Domain services
- Enums and constants
- Business exceptions

**What does NOT belong here:**
- Supabase or database code
- API clients
- UI framework code
- React or Next.js imports
- External library dependencies (except types)

#### Domain Entity Pattern

```typescript
// src/features/activities/domain/activity.ts
import { z } from 'zod';

// Value object for priority
export enum ActivityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// Entity with business logic
export class Activity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly title: string,
    readonly description: string | undefined,
    readonly priority: ActivityPriority,
    readonly status: 'todo' | 'in-progress' | 'completed',
    readonly dueDate: Date | undefined,
    readonly estimatedTimeMinutes: number | undefined,
    readonly createdAt: Date,
    readonly updatedAt: Date
  ) {
    this.validate();
  }

  // Business rule: title cannot be empty
  private validate(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Activity title cannot be empty');
    }

    if (this.title.length > 200) {
      throw new Error('Activity title cannot exceed 200 characters');
    }
  }

  // Business logic: is deadline overdue?
  isOverdue(): boolean {
    if (!this.dueDate) return false;
    if (this.status === 'completed') return false;
    return new Date() > this.dueDate;
  }

  // Business logic: can mark as complete?
  canMarkComplete(): boolean {
    return this.status !== 'completed';
  }

  // Business logic: create copy with updated status
  markComplete(): Activity {
    if (!this.canMarkComplete()) {
      throw new Error('Cannot mark already completed activity');
    }

    return new Activity(
      this.id,
      this.userId,
      this.title,
      this.description,
      this.priority,
      'completed',
      this.dueDate,
      this.estimatedTimeMinutes,
      this.createdAt,
      new Date()
    );
  }

  // Business logic: urgency calculation
  calculateUrgency(): number {
    if (this.status === 'completed') return 0;
    if (!this.dueDate) return 0;

    const hoursUntilDue =
      (this.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);

    const priorityScore = {
      [ActivityPriority.HIGH]: 3,
      [ActivityPriority.MEDIUM]: 2,
      [ActivityPriority.LOW]: 1,
    }[this.priority];

    return priorityScore / Math.max(1, hoursUntilDue);
  }
}

// Repository interface - defines contract
export interface IActivityRepository {
  save(activity: Activity): Promise<void>;
  getById(id: string, userId: string): Promise<Activity | null>;
  listByUser(userId: string): Promise<Activity[]>;
  delete(id: string, userId: string): Promise<void>;
}
```

#### Domain Service Pattern

For business logic that involves multiple entities or doesn't fit in a single entity:

```typescript
// src/features/activities/domain/activityReminderService.ts
import { Activity } from './activity';

export class ActivityReminderService {
  // Business rule: what activities need reminders?
  getActivitiesNeedingReminders(
    activities: Activity[],
    reminderMinutesBefore: number
  ): Activity[] {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + reminderMinutesBefore * 60000);

    return activities.filter((activity) => {
      if (!activity.dueDate || activity.status === 'completed') {
        return false;
      }

      // Reminder is due if now <= dueDate - reminderMinutes < reminderTime
      const reminderDueAt = new Date(
        activity.dueDate.getTime() - reminderMinutesBefore * 60000
      );

      return now <= reminderDueAt && reminderDueAt < reminderTime;
    });
  }

  // Business rule: calculate study hours
  calculateEstimatedStudyHours(activities: Activity[]): number {
    return activities.reduce((total, activity) => {
      if (activity.estimatedTimeMinutes) {
        return total + activity.estimatedTimeMinutes / 60;
      }
      return total;
    }, 0);
  }
}
```

### Application Layer (Use Cases)

Orchestrates domain logic and coordinates between domain and infrastructure layers.

**What belongs here:**
- Use cases (application services)
- DTOs (Data Transfer Objects)
- Application workflows
- Repository usage (from domain interfaces)
- Transaction coordination

**What does NOT belong here:**
- UI code
- Direct Supabase queries (use repositories)
- React-specific code
- HTTP/API implementation (that's infrastructure)

#### Use Case Pattern

```typescript
// src/features/activities/application/useCases/createActivity.ts
import { Activity, ActivityPriority } from '../../domain/activity';
import { IActivityRepository } from '../../domain/activity';
import { CreateActivityDTO } from '../dto/CreateActivityDTO';
import { ActivityResponseDTO } from '../dto/ActivityResponseDTO';

export class CreateActivityUseCase {
  constructor(private activityRepository: IActivityRepository) {}

  async execute(
    dto: CreateActivityDTO,
    userId: string
  ): Promise<ActivityResponseDTO> {
    // Business logic: create entity with validation
    const activity = new Activity(
      crypto.randomUUID(),
      userId,
      dto.title,
      dto.description,
      (dto.priority as ActivityPriority) || ActivityPriority.MEDIUM,
      'todo',
      dto.dueDate ? new Date(dto.dueDate) : undefined,
      dto.estimatedTimeMinutes,
      new Date(),
      new Date()
    ); // Constructor validates business rules

    // Persist using repository
    await this.activityRepository.save(activity);

    // Return DTO for presentation layer
    return this.toDTO(activity);
  }

  private toDTO(activity: Activity): ActivityResponseDTO {
    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      priority: activity.priority,
      status: activity.status,
      dueDate: activity.dueDate?.toISOString(),
      estimatedTimeMinutes: activity.estimatedTimeMinutes,
      isOverdue: activity.isOverdue(),
      urgency: activity.calculateUrgency(),
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
    };
  }
}
```

#### DTO Pattern

```typescript
// src/features/activities/application/dto/CreateActivityDTO.ts
import { z } from 'zod';

export const createActivityDTOSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedTimeMinutes: z.number().positive().optional(),
});

export type CreateActivityDTO = z.infer<typeof createActivityDTOSchema>;

// Response DTO
export const activityResponseDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in-progress', 'completed']),
  dueDate: z.string().datetime().optional(),
  estimatedTimeMinutes: z.number().optional(),
  isOverdue: z.boolean(),
  urgency: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ActivityResponseDTO = z.infer<typeof activityResponseDTOSchema>;
```

### Infrastructure Layer (Implementations)

Implements interfaces from domain layer and integrates external services.

**What belongs here:**
- Repository implementations
- Supabase client usage
- External API clients
- Data mappers (entity ↔ DTO)
- Configuration for external services

**What does NOT belong here:**
- Business logic
- React code
- User interaction handling
- Domain entity definitions

#### Repository Implementation

```typescript
// src/features/activities/infrastructure/supabaseActivityRepository.ts
import { createServerClient } from '@supabase/ssr';
import { Activity, ActivityPriority, IActivityRepository } from '../domain/activity';

export class SupabaseActivityRepository implements IActivityRepository {
  constructor(private supabase: ReturnType<typeof createServerClient>) {}

  async save(activity: Activity): Promise<void> {
    const { error } = await this.supabase
      .from('activities')
      .upsert({
        id: activity.id,
        user_id: activity.userId,
        title: activity.title,
        description: activity.description,
        priority: activity.priority,
        status: activity.status,
        due_date: activity.dueDate?.toISOString(),
        estimated_time_minutes: activity.estimatedTimeMinutes,
        created_at: activity.createdAt.toISOString(),
        updated_at: activity.updatedAt.toISOString(),
      });

    if (error) {
      throw new Error(`Failed to save activity: ${error.message}`);
    }
  }

  async getById(id: string, userId: string): Promise<Activity | null> {
    const { data, error } = await this.supabase
      .from('activities')
      .select()
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return null; // Not found
    }

    if (error) {
      throw new Error(`Failed to fetch activity: ${error.message}`);
    }

    return this.mapToDomain(data);
  }

  async listByUser(userId: string): Promise<Activity[]> {
    const { data, error } = await this.supabase
      .from('activities')
      .select()
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to list activities: ${error.message}`);
    }

    return data.map((row) => this.mapToDomain(row));
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('activities')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete activity: ${error.message}`);
    }
  }

  private mapToDomain(row: any): Activity {
    return new Activity(
      row.id,
      row.user_id,
      row.title,
      row.description,
      row.priority as ActivityPriority,
      row.status,
      row.due_date ? new Date(row.due_date) : undefined,
      row.estimated_time_minutes,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }
}
```

#### Data Mapper Pattern

```typescript
// src/features/activities/infrastructure/mappers/activityMapper.ts
import { Activity } from '../../domain/activity';

// Database row type (from Supabase)
interface ActivityRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  estimated_time_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export class ActivityMapper {
  static toDomain(raw: ActivityRow): Activity {
    return new Activity(
      raw.id,
      raw.user_id,
      raw.title,
      raw.description || undefined,
      raw.priority as any,
      raw.status as any,
      raw.due_date ? new Date(raw.due_date) : undefined,
      raw.estimated_time_minutes || undefined,
      new Date(raw.created_at),
      new Date(raw.updated_at)
    );
  }

  static toDatabase(entity: Activity): Omit<ActivityRow, 'id' | 'created_at'> {
    return {
      user_id: entity.userId,
      title: entity.title,
      description: entity.description || null,
      priority: entity.priority,
      status: entity.status,
      due_date: entity.dueDate?.toISOString() || null,
      estimated_time_minutes: entity.estimatedTimeMinutes || null,
      updated_at: entity.updatedAt.toISOString(),
    };
  }
}
```

### Presentation Layer (UI & API)

React components and server actions that interact with users.

**What belongs here:**
- React components
- Server Actions
- Form validation schemas (Zod)
- hooks (useActivities, etc.)
- UI-specific state management
- Route handlers (API endpoints)

**What does NOT belong here:**
- Business logic (belongs in domain/application)
- Direct Supabase queries (use use cases and server actions)
- Entity validation (that's domain responsibility)

#### Server Action Pattern

```typescript
// src/features/activities/presentation/actions/createActivity.ts
'use server';

import { createAuthenticatedSupabaseClient } from '@/shared/lib/auth/middleware';
import { CreateActivityUseCase } from '../../application/useCases/createActivity';
import { SupabaseActivityRepository } from '../../infrastructure/supabaseActivityRepository';
import { createActivityDTOSchema } from '../../application/dto/CreateActivityDTO';

export async function createActivity(data: unknown) {
  // Validate input at boundary
  const validation = createActivityDTOSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors };
  }

  // Get authenticated user
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Use case orchestration
    const repository = new SupabaseActivityRepository(supabase);
    const useCase = new CreateActivityUseCase(repository);

    const result = await useCase.execute(validation.data, authData.user.id);

    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: message };
  }
}
```

#### React Component Pattern

```typescript
// src/features/activities/presentation/components/ActivityForm.tsx
'use client';

import { useState } from 'react';
import { createActivity } from '../actions/createActivity';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

export function ActivityForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      dueDate: formData.get('dueDate'),
    };

    const result = await createActivity(data);

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    // Success - reset and show success message
    setIsLoading(false);
    // Trigger revalidation or redirect
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <Input name="title" placeholder="Activity title" required />
      <Input name="description" placeholder="Description" />
      <select name="priority" defaultValue="medium">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <Input name="dueDate" type="datetime-local" />

      {error && <div className="text-red-500">{error}</div>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Activity'}
      </Button>
    </form>
  );
}
```

## Dependency Injection Pattern

```typescript
// src/features/activities/application/container.ts
import { createServerClient } from '@supabase/ssr';
import { CreateActivityUseCase } from './useCases/createActivity';
import { SupabaseActivityRepository } from '../infrastructure/supabaseActivityRepository';

// Dependency Container
export class ActivityContainer {
  static createUseCase(supabase: ReturnType<typeof createServerClient>) {
    const repository = new SupabaseActivityRepository(supabase);
    return new CreateActivityUseCase(repository);
  }
}
```

## Folder Structure Following Clean Architecture

```
src/features/activities/
├── domain/                          # Pure business logic
│   ├── activity.ts                  # Entity with rules
│   ├── activityReminderService.ts  # Domain service
│   └── repository.ts                # Interface (contract)
│
├── application/                     # Use cases & coordination
│   ├── useCases/
│   │   ├── createActivity.ts
│   │   ├── updateActivity.ts
│   │   └── deleteActivity.ts
│   ├── dto/
│   │   ├── CreateActivityDTO.ts
│   │   └── ActivityResponseDTO.ts
│   └── container.ts                 # Dependency injection
│
├── infrastructure/                  # External integrations
│   ├── supabaseActivityRepository.ts
│   └── mappers/
│       └── activityMapper.ts
│
└── presentation/                    # UI & HTTP layer
    ├── components/
    │   ├── ActivityCard.tsx
    │   ├── ActivityForm.tsx
    │   └── ActivityList.tsx
    ├── actions/
    │   ├── createActivity.ts
    │   ├── updateActivity.ts
    │   └── deleteActivity.ts
    ├── hooks/
    │   └── useActivities.ts
    └── schemas/
        └── createActivitySchema.ts
```

## Key Principles

1. **Dependency Inversion:** High-level modules depend on abstractions (interfaces), not concrete implementations
2. **Single Responsibility:** Each class/function has one reason to change
3. **Open/Closed:** Open for extension, closed for modification
4. **DRY:** Don't repeat yourself - extract common logic
5. **YAGNI:** You Aren't Gonna Need It - don't over-engineer

## Testing Strategy

- **Domain tests:** 90%+ coverage - test business rules in isolation
- **Application tests:** 80%+ coverage - test use case orchestration with mocked repositories
- **Infrastructure tests:** 70%+ coverage - test repository implementations with test database
- **Presentation tests:** 70%+ coverage - test component rendering and user interactions

## Common Mistakes

❌ **Business logic in components**
```typescript
// ❌ Wrong - logic in component
function ActivityList() {
  const isOverdue = activity.dueDate < new Date();
}
```

✅ **Business logic in domain**
```typescript
// ✅ Correct - logic in entity
export class Activity {
  isOverdue(): boolean {
    return this.dueDate < new Date();
  }
}
```

❌ **Repositories in use cases**
```typescript
// ❌ Wrong - direct Supabase in use case
export class CreateActivityUseCase {
  async execute(data) {
    await supabase.from('activities').insert(...);
  }
}
```

✅ **Use case uses repository interface**
```typescript
// ✅ Correct - injected repository
export class CreateActivityUseCase {
  constructor(private repository: IActivityRepository) {}
  async execute(data) {
    await this.repository.save(...);
  }
}
```

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
