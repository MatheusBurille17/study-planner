# Next.js Server Actions & API Patterns for Amanda's Study Planner

## Overview

Server Actions and Route Handlers patterns for Amanda's Study Planner. Focuses on secure, type-safe server-side operations with proper error handling, validation, and authentication.

## When to Use This Skill

Load this skill when:
- Creating new server actions for data mutations
- Building API route handlers
- Handling form submissions
- Implementing file uploads
- Setting up authentication endpoints
- Debugging server-side errors
- Implementing real-time subscriptions
- Working with streaming responses

## Server Actions Fundamentals

### Basic Server Action Pattern

Server Actions are async functions that run on the server, callable from the client.

```typescript
// src/features/activities/presentation/actions/createActivity.ts
'use server';

import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/shared/lib/auth/middleware';

// Define schema at module level
const createActivitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
  estimatedTimeMinutes: z.number().int().positive().optional(),
  subjectId: z.string().uuid().optional(),
});

type CreateActivityInput = z.infer<typeof createActivitySchema>;
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function createActivity(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Validate input
    const validation = createActivitySchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0].message,
      };
    }

    // 2. Authenticate user
    const supabase = await createAuthenticatedSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 3. Execute business logic (use case)
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: authData.user.id,
        title: validation.data.title,
        description: validation.data.description || null,
        priority: validation.data.priority,
        due_date: validation.data.dueDate ? new Date(validation.data.dueDate) : null,
        estimated_time_minutes: validation.data.estimatedTimeMinutes || null,
        subject_id: validation.data.subjectId || null,
        status: 'todo',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Database error:', error);
      return { success: false, error: 'Failed to create activity' };
    }

    return { success: true, data: { id: data.id } };
  } catch (error) {
    console.error('Server action error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

### Form Submission Pattern

```typescript
// src/features/activities/presentation/components/ActivityForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { createActivity } from '../actions/createActivity';

export function ActivityForm() {
  const [pending, setPending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(false);

    setPending(async () => {
      const result = await createActivity({
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        dueDate: formData.get('dueDate'),
        estimatedTimeMinutes: formData.get('estimatedTimeMinutes')
          ? parseInt(formData.get('estimatedTimeMinutes') as string)
          : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      // Optionally revalidate or redirect
      // revalidatePath('/activities');
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          disabled={pending}
        />
      </div>

      <div>
        <label htmlFor="priority">Priority</label>
        <select name="priority" disabled={pending} defaultValue="medium">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">Activity created!</div>}

      <button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Activity'}
      </button>
    </form>
  );
}
```

## Advanced Server Action Patterns

### Server Action with Revalidation

```typescript
// src/features/activities/presentation/actions/updateActivity.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createAuthenticatedSupabaseClient } from '@/shared/lib/auth/middleware';

export async function updateActivity(id: string, data: unknown) {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify ownership
  const { data: activity } = await supabase
    .from('activities')
    .select('id')
    .eq('id', id)
    .eq('user_id', authData.user.id)
    .single();

  if (!activity) {
    return { success: false, error: 'Activity not found or unauthorized' };
  }

  // Update
  const { error } = await supabase
    .from('activities')
    .update(data)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Revalidate cache for this user's activities
  revalidatePath('/activities');
  revalidatePath('/dashboard');

  return { success: true };
}
```

### Server Action with Redirect

```typescript
// src/features/auth/presentation/actions/loginAction.ts
'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function loginAction(email: string, password: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Redirect on success
  redirect('/dashboard');
}
```

### Server Action with Streaming

```typescript
// src/app/api/activities/stream/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ReadableStream } from 'stream/web';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create readable stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { data: activities, error } = await supabase
          .from('activities')
          .select()
          .eq('user_id', authData.user.id)
          .stream();

        if (error) {
          controller.error(error);
          return;
        }

        for await (const activity of activities) {
          controller.enqueue(`data: ${JSON.stringify(activity)}\n\n`);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Route Handlers

### Basic Route Handler Pattern

```typescript
// src/app/api/activities/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET - List activities
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const priority = searchParams.get('priority');
  const status = searchParams.get('status');

  let query = supabase
    .from('activities')
    .select()
    .eq('user_id', authData.user.id);

  if (priority) {
    query = query.eq('priority', priority);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('due_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST - Create activity
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: authData.user.id,
        ...body,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
```

### Dynamic Route Handler

```typescript
// src/app/api/activities/[id]/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch specific activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('activities')
    .select()
    .eq('id', params.id)
    .eq('user_id', authData.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT - Update activity
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Similar auth and error handling...
  const body = await request.json();

  const { data, error } = await supabase
    .from('activities')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

// DELETE - Remove activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Similar auth handling...

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', params.id)
    .eq('user_id', authData.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
```

## Error Handling Patterns

### Centralized Error Handler

```typescript
// src/shared/lib/api/errorHandler.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
}
```

### Error Handling in Server Action

```typescript
export async function someAction(data: unknown) {
  try {
    // Validation
    const validation = schema.safeParse(data);
    if (!validation.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid input',
        validation.error.flatten()
      );
    }

    // Authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Business logic
    const result = await doSomething(validation.data, user.id);

    return { success: true, data: result };
  } catch (error) {
    const errorInfo = handleApiError(error);
    return { success: false, ...errorInfo };
  }
}
```

## Real-Time Subscriptions with Server Actions

```typescript
// src/app/api/activities/subscribe/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          const subscription = supabase
            .from(`activities:user_id=eq.${authData.user.id}`)
            .on('*', (payload) => {
              controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
            })
            .subscribe();

          // Keep connection alive
          const interval = setInterval(() => {
            controller.enqueue(': keepalive\n\n');
          }, 30000);

          // Cleanup on close
          request.signal.addEventListener('abort', () => {
            clearInterval(interval);
            subscription.unsubscribe();
            controller.close();
          });
        } catch (error) {
          controller.error(error);
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}
```

## Best Practices

1. **Always validate input:** Use Zod schemas
2. **Check authentication:** Verify user before operations
3. **Verify ownership:** Ensure user can access/modify resource
4. **Handle errors gracefully:** Return meaningful error messages
5. **Revalidate cache:** Use revalidatePath after mutations
6. **Use transactions:** Wrap multiple operations
7. **Log important operations:** Track for debugging
8. **Type inputs and outputs:** Use TypeScript for safety
9. **Keep actions focused:** One responsibility per action
10. **Test thoroughly:** Unit test logic, E2E test flows

## Common Mistakes

❌ **Not validating input**
```typescript
// Wrong - trusts client input
export async function createActivity(data: any) {
  await db.activities.insert(data);
}
```

✅ **Validate at server boundary**
```typescript
// Correct - validates before processing
export async function createActivity(data: unknown) {
  const validated = schema.parse(data);
  await db.activities.insert(validated);
}
```

❌ **Forgetting to check ownership**
```typescript
// Wrong - any authenticated user can delete
export async function deleteActivity(id: string) {
  await db.activities.delete(id);
}
```

✅ **Verify ownership**
```typescript
// Correct - RLS + server-side check
export async function deleteActivity(id: string) {
  const { data: activity } = await supabase
    .from('activities')
    .select('user_id')
    .eq('id', id)
    .single();

  if (activity?.user_id !== user.id) {
    throw new Error('Unauthorized');
  }

  await supabase.from('activities').delete().eq('id', id);
}
```

## References

- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js API Route Security](https://nextjs.org/docs/pages/building-your-application/data-fetching/getting-started)
