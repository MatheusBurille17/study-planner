# React & TypeScript Testing Patterns for Amanda's Study Planner

## Overview

React component testing patterns optimized for the Amanda's Study Planner project using Vitest, React Testing Library, and Playwright. Covers unit tests for components, hooks, server actions, and E2E testing for critical user flows.

## When to Use This Skill

Load this skill when:
- Writing or refactoring React components
- Testing custom hooks and state management
- Writing tests for server actions
- Debugging component behavior
- Ensuring E2E coverage for critical paths (auth, task creation, calendar interactions)
- Testing form submissions and validation
- Setting up test fixtures or mocking strategies

## Testing Stack

- **Unit Tests:** Vitest + React Testing Library
- **E2E Tests:** Playwright
- **Mocking:** Mock Service Worker (MSW) for API calls
- **Fixtures:** Custom auth fixtures for E2E tests
- **Database Tests:** pgtap for Supabase schema validation

## Core Principles

### 1. Test Behavior, Not Implementation

❌ **Wrong:**
```typescript
// Testing internal state
const [todos, setTodos] = useState([]);
expect(component.state.todos).toEqual([]);
```

✅ **Correct:**
```typescript
// Testing what user sees
const items = screen.getAllByRole('listitem');
expect(items).toHaveLength(3);
```

### 2. Arrange-Act-Assert Pattern

```typescript
test('should create activity when form is submitted', () => {
  // Arrange: Set up test data and components
  const user = userEvent.setup();
  render(<ActivityForm />);
  
  // Act: Perform user interactions
  await user.type(screen.getByLabelText('Title'), 'Study React');
  await user.click(screen.getByRole('button', { name: /create/i }));
  
  // Assert: Verify outcomes
  expect(screen.getByText('Activity created')).toBeInTheDocument();
});
```

### 3. Test Isolation

Each test should be independent:
- Reset mocks between tests
- Use unique data per test
- Clean up subscriptions/timers
- Don't rely on test execution order

## Component Testing Patterns

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { ActivityCard } from '@/features/activities/presentation/components/ActivityCard';

describe('ActivityCard', () => {
  it('should display activity details', () => {
    const activity = {
      id: '1',
      title: 'Study React Hooks',
      priority: 'high',
      dueDate: new Date('2024-12-25'),
      status: 'todo',
    };

    render(<ActivityCard activity={activity} />);

    expect(screen.getByText('Study React Hooks')).toBeInTheDocument();
    expect(screen.getByText(/high priority/i)).toBeInTheDocument();
  });

  it('should mark activity as complete when button clicked', async () => {
    const user = userEvent.setup();
    const mockOnComplete = vi.fn();

    render(<ActivityCard activity={activity} onComplete={mockOnComplete} />);

    await user.click(screen.getByRole('button', { name: /complete/i }));

    expect(mockOnComplete).toHaveBeenCalledWith('1');
  });
});
```

### Form Component Test

```typescript
describe('ActivityForm', () => {
  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<ActivityForm />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();

    render(<ActivityForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/title/i), 'New Task');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'high');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Task',
        priority: 'high',
      })
    );
  });
});
```

### Hook Testing Pattern

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivities } from '@/shared/hooks/useActivities';

describe('useActivities', () => {
  it('should fetch activities on mount', async () => {
    const { result } = renderHook(() => useActivities());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activities).toHaveLength(3);
  });

  it('should handle filter changes', async () => {
    const { result } = renderHook(() => useActivities());
    const user = userEvent.setup();

    act(() => {
      result.current.setFilter({ priority: 'high' });
    });

    await waitFor(() => {
      expect(result.current.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ priority: 'high' })
        ])
      );
    });
  });
});
```

## Server Action Testing

```typescript
import { createActivity } from '@/features/activities/presentation/actions/createActivity';

describe('createActivity server action', () => {
  it('should create activity with valid data', async () => {
    const result = await createActivity({
      title: 'Study Session',
      priority: 'medium',
      dueDate: new Date('2024-12-25'),
    });

    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
  });

  it('should return validation error for missing title', async () => {
    const result = await createActivity({
      title: '',
      priority: 'medium',
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Title is required');
  });
});
```

## E2E Testing Patterns

### Authentication Flow

```typescript
// e2e/fixtures/auth.ts
export const authenticatedTest = test.extend({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');

    // Fill credentials
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');

    await use(page);
  },
});
```

### User Flow Test

```typescript
import { authenticatedTest as test } from '@/e2e/fixtures/auth';

test('should create and view activity', async ({ authenticatedPage: page }) => {
  // Navigate to activities
  await page.click('a[href="/activities"]');

  // Create new activity
  await page.click('button:has-text("New Activity")');
  await page.fill('[name="title"]', 'Study TypeScript');
  await page.selectOption('[name="priority"]', 'high');
  await page.click('button:has-text("Create")');

  // Verify activity appears in list
  expect(page.locator('text=Study TypeScript')).toBeVisible();

  // Click to view details
  await page.click('text=Study TypeScript');

  // Verify details page
  expect(page.url()).toContain('/activities/');
  expect(page.locator('text=High priority')).toBeVisible();
});
```

### Calendar Interaction Test

```typescript
test('should navigate between months in calendar', async ({ authenticatedPage: page }) => {
  await page.click('a[href="/calendar"]');

  const currentMonth = await page.locator('h2[data-testid="current-month"]');
  expect(currentMonth).toContainText('December 2024');

  await page.click('button[data-testid="next-month"]');
  expect(currentMonth).toContainText('January 2025');

  await page.click('button[data-testid="prev-month"]');
  expect(currentMonth).toContainText('December 2024');
});
```

## Mock Service Worker (MSW) Setup

```typescript
// __tests__/setup.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/activities', () => {
    return HttpResponse.json([
      { id: '1', title: 'Task 1', status: 'todo' },
      { id: '2', title: 'Task 2', status: 'completed' },
    ]);
  }),

  http.post('/api/activities', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({ id: '3', ...data }, { status: 201 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Query Testing Pattern

```typescript
describe('Activity queries', () => {
  it('should filter by priority', async () => {
    const { result } = renderHook(() => useActivities({ priority: 'high' }));

    await waitFor(() => {
      expect(result.current.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ priority: 'high' })
        ])
      );
    });

    expect(result.current.activities).not.toContainEqual(
      expect.objectContaining({ priority: 'low' })
    );
  });
});
```

## Best Practices

1. **Use data-testid sparingly:** Prefer accessible queries (role, label, text)
2. **Test user flows:** Focus on critical paths (auth, create, edit, delete, view)
3. **Keep tests focused:** One assertion per test or logically grouped assertions
4. **Use fixtures for complex setup:** Reuse auth, database state across tests
5. **Mock external services:** Use MSW for API calls, mock Supabase client
6. **Test accessibility:** Use screen queries that reflect user perspective
7. **Async handling:** Always await user interactions and waitFor conditions
8. **Clean up:** Unmount components, clear mocks between tests
9. **Meaningful messages:** Use descriptive test names that explain behavior
10. **Coverage targets:** Aim for 80%+ coverage on critical features

## Common Mistakes to Avoid

❌ **Testing implementation details**
- Don't query by `data-testid` for everything
- Don't check internal state directly
- Don't verify mock calls instead of user outcomes

❌ **Flaky tests**
- Don't use fixed timeouts (use waitFor instead)
- Don't rely on specific DOM order
- Don't depend on test execution order

❌ **Over-mocking**
- Don't mock everything
- Don't mock the component you're testing
- Do test real component integration when possible

## File Structure

```
__tests__/
├── setup.ts                    # Global test setup
├── features/
│   ├── activities/
│   │   ├── domain.test.ts
│   │   ├── useCases.test.ts
│   │   └── components.test.tsx
│   ├── calendar/
│   │   └── calendarRules.test.ts
│   └── notifications/
│       └── reminderRules.test.ts
├── shared/
│   ├── utils/
│   │   ├── dateHelpers.test.ts
│   │   └── validation.test.ts
│   └── hooks/
│       └── useActivities.test.ts
└── fixtures/
    └── mockData.ts

e2e/
├── fixtures/
│   └── auth.ts
├── specs/
│   ├── auth.spec.ts
│   ├── activities.spec.ts
│   ├── calendar.spec.ts
│   └── notifications.spec.ts
└── utils/
    └── test-helpers.ts
```

## References

- [React Testing Library Docs](https://testing-library.com/react)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/)
- Testing Library best practices for accessibility
