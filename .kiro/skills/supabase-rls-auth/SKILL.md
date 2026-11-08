# Supabase Row-Level Security & Authentication for Amanda's Study Planner

## Overview

Row-Level Security (RLS) and authentication patterns for Supabase PostgreSQL database. Essential for securing user data, implementing multi-tenant isolation, and building secure auth flows in Amanda's Study Planner.

## When to Use This Skill

Load this skill when:
- Designing database schemas with user isolation
- Implementing RLS policies
- Setting up authentication flows (login, register, logout, session management)
- Writing or reviewing SQL migrations
- Testing RLS policies
- Debugging data access issues or security concerns
- Configuring Supabase Auth settings
- Building API endpoints that access user data

## Authentication Architecture

### User Model (Supabase Auth)

```sql
-- Supabase automatically creates auth.users table
-- Structure:
-- id: UUID
-- email: string
-- encrypted_password: string (handled by Supabase)
-- email_confirmed_at: timestamp
-- phone: string
-- phone_confirmed_at: timestamp
-- last_sign_in_at: timestamp
-- raw_app_meta_data: jsonb
-- raw_user_meta_data: jsonb
-- created_at: timestamp
-- updated_at: timestamp
```

### Public User Profile Table

```sql
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  theme 'light' | 'dark' default 'light',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.users
  for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id);

-- Allow new user insert on signup
create policy "Enable insert for new users during signup"
  on public.users
  for insert
  with check (auth.uid() = id);
```

## RLS Policy Patterns

### Pattern 1: User Ownership (Most Common)

Used when each row belongs to a specific user.

```sql
-- Activities table with user ownership
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  priority text default 'medium',
  status text default 'todo',
  due_date timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table public.activities enable row level security;

-- Users can only read their own activities
create policy "Users can read own activities"
  on public.activities
  for select
  using (auth.uid() = user_id);

-- Users can only insert activities for themselves
create policy "Users can create own activities"
  on public.activities
  for insert
  with check (auth.uid() = user_id);

-- Users can only update their own activities
create policy "Users can update own activities"
  on public.activities
  for update
  using (auth.uid() = user_id);

-- Users can only delete their own activities
create policy "Users can delete own activities"
  on public.activities
  for delete
  using (auth.uid() = user_id);
```

### Pattern 2: Shared Data with Permissions

For data that might be shared or have different permission levels.

```sql
-- Notification subscriptions
create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  is_active boolean default true,
  created_at timestamp default now()
);

alter table public.notification_subscriptions enable row level security;

-- Users can read their own subscriptions
create policy "Users can read own subscriptions"
  on public.notification_subscriptions
  for select
  using (auth.uid() = user_id);

-- Users can insert their own subscriptions
create policy "Users can create own subscriptions"
  on public.notification_subscriptions
  for insert
  with check (auth.uid() = user_id);

-- Users can delete their own subscriptions
create policy "Users can delete own subscriptions"
  on public.notification_subscriptions
  for delete
  using (auth.uid() = user_id);
```

### Pattern 3: Admin-Only Data

For system data that regular users shouldn't modify.

```sql
-- Settings (admin only)
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb,
  updated_at timestamp default now()
);

alter table public.app_settings enable row level security;

-- Only authenticated users can read (no data exposure)
create policy "Anyone can read public settings"
  on public.app_settings
  for select
  using (true);  -- Or create limited view for non-admins

-- Only admins can update (check via JWT or admin table)
create policy "Only admins can update settings"
  on public.app_settings
  for update
  using (
    exists(
      select 1 from public.admins
      where admin_id = auth.uid()
    )
  );
```

## Authentication Flow Implementation

### Server-Side Auth Helper

```typescript
// src/shared/lib/auth/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createAuthenticatedSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    }
  );
}

export async function getCurrentUser() {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect('/login');
  }

  return data.user;
}
```

### Login Server Action

```typescript
// src/features/auth/presentation/actions/loginAction.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginSchema } from '../schemas/loginSchema';

export async function loginAction(formData: {
  email: string;
  password: string;
}) {
  // Validate input
  const validation = loginSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors };
  }

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
          } catch {
            // Handle cookie errors silently
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  redirect('/dashboard');
}
```

### Register Server Action with Profile Creation

```typescript
// src/features/auth/presentation/actions/registerAction.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { registerSchema } from '../schemas/registerSchema';

export async function registerAction(formData: {
  email: string;
  password: string;
  fullName: string;
}) {
  const validation = registerSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors };
  }

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

  // Sign up user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (signUpError) {
    return { success: false, error: signUpError.message };
  }

  // Create user profile
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: validation.data.email,
        full_name: validation.data.fullName,
      });

    if (profileError) {
      return { success: false, error: 'Failed to create profile' };
    }
  }

  redirect('/dashboard');
}
```

## Protected Server Actions

```typescript
// src/features/activities/presentation/actions/createActivity.ts
'use server';

import { createAuthenticatedSupabaseClient } from '@/shared/lib/auth/middleware';
import { createActivitySchema } from '../schemas/createActivitySchema';

export async function createActivity(data: unknown) {
  // Get authenticated user (redirects if not authenticated)
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = createActivitySchema.safeParse(data);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors };
  }

  // Insert activity (RLS policy enforces user_id = auth.uid())
  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      ...validation.data,
      user_id: authData.user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: activity };
}
```

## RLS Testing Patterns

### Test RLS Policy Isolation

```sql
-- Test: User A cannot see User B's activities
begin;
  set local role authenticated;
  set local "request.jwt.claims.sub" = 'user-a-uuid';

  insert into public.activities (user_id, title)
  values ('user-a-uuid', 'User A Task');

  set local "request.jwt.claims.sub" = 'user-b-uuid';

  select count(*) from public.activities; -- Should return 0

rollback;
```

### pgTap Test Pattern

```sql
-- supabase/tests/rls_tests.pgsql
begin;

  select plan(4);

  -- Test 1: User can select own activities
  set local role authenticated;
  set local "request.jwt.claims.sub" = 'test-user-uuid';

  insert into public.activities (user_id, title)
  values ('test-user-uuid', 'My Task');

  select is(
    (select count(*) from public.activities),
    1::bigint,
    'User can see own activities'
  );

  -- Test 2: User cannot see other users' activities
  set local "request.jwt.claims.sub" = 'other-user-uuid';

  select is(
    (select count(*) from public.activities),
    0::bigint,
    'User cannot see other users activities'
  );

  select * from finish();

rollback;
```

## Security Best Practices

1. **Always enforce user_id in RLS:** Every row should belong to a user
2. **Use auth.uid() not claims:** More reliable than checking JWT claims
3. **Test RLS policies:** Write tests to verify isolation
4. **Avoid "select *" from auth tables:** Never expose auth internals
5. **Encrypt sensitive data:** Use Supabase encrypted columns for PII
6. **Audit access:** Log security-relevant operations
7. **Use connection pooling:** Reduce connection overhead
8. **Rotate secrets regularly:** API keys, VAPID keys, etc.
9. **CORS configuration:** Only allow your domain
10. **Disable email confirmations for testing only:** Use mock emails

## Common RLS Mistakes

❌ **Forgetting to enable RLS**
```sql
-- Policy won't work without this
alter table public.activities enable row level security;
```

✅ **Always enable RLS on user-data tables**

❌ **Using email instead of auth.uid()**
```sql
-- Email can change, uuid is immutable
where email = auth.jwt() ->> 'email'  -- ❌ Wrong
```

✅ **Use auth.uid()**
```sql
where user_id = auth.uid()  -- ✅ Correct
```

❌ **Forgetting default deny**
```sql
-- Without RLS, data is public
create table public.activities (...);
-- Need to enable RLS and add policies
```

✅ **RLS denies by default**
```sql
alter table public.activities enable row level security;
-- Now only policies grant access
```

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row-Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [NextAuth patterns with Supabase](https://supabase.com/docs/guides/auth/social-login)
