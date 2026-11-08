# Calendar View - Design Document

## Overview

The Calendar View is the central visual interface for managing academic activities across multiple time periods. It consolidates Tasks, Exams, and Assignments into synchronized Month, Week, and Day views, providing students with comprehensive workload visibility at different scales.

**Purpose:** Enable students to quickly assess their academic commitments across different time scales, identify busy periods, drill into specific days for details, and maintain context across different scheduling granularities.

**Key Value:**
- Unified view of all academic activities (Tasks, Exams, Assignments)
- Multiple time scales (month, week, day) for different planning needs
- Visual urgency indicators for prioritization
- Seamless navigation between time periods and views
- Offline access to cached schedule data
- Full accessibility and responsive design


## Architecture

### System Overview

The Calendar is implemented as a modular feature within the Clean Architecture framework, with clear separation between domain logic, application orchestration, infrastructure (data access), and presentation layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                         │
│  (CalendarPage, MonthView, WeekView, DayView, FilterBar)        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                  PRESENTATION LAYER                              │
│  (Server Actions: getCalendarData, formatCalendarData)          │
│  (Zod Schemas: calendarFilterSchema, dateRangeSchema)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│               APPLICATION LAYER                                  │
│  (Use Cases: fetchMonthActivities, fetchWeekActivities, etc.)   │
│  (DTOs: CalendarActivityDTO, CalendarResponseDTO)               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│             INFRASTRUCTURE LAYER                                 │
│  (Supabase Calendar Repository: getData, format, filter)        │
│  (Database Queries: fetchActivitiesForDateRange)                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│  (PostgreSQL: activities, subjects, RLS policies)               │
│  (Indexes: user_id, due_date, event_date, type)                │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User initiates navigation** → CalendarPage component
2. **Component calls Server Action** → `getCalendarData(viewMode, dateRange, filters)`
3. **Server Action validates input** → Zod schema validation
4. **Application orchestrates retrieval** → CalendarUseCase
5. **Infrastructure fetches from database** → Single optimized query with RLS
6. **Data returned to Server Action** → Format with `formatCalendarData()`
7. **Formatted data returned to component** → Component renders view
8. **User can interact** → Navigate views, filter, click on activities


## Components and Interfaces

### Component Tree

```
CalendarPage (root page component)
├── CalendarHeader
│   ├── ViewModeToggle (Month/Week/Day buttons)
│   ├── DateNavigator (Previous/Next buttons)
│   └── FilterBar
│       ├── TypeFilter (All/Tasks/Exams/Assignments)
│       └── SubjectFilter (dropdown)
│
├── CalendarViewContainer (switches between views)
│   │
│   ├── MonthView
│   │   ├── MonthHeader (month/year)
│   │   └── MonthGrid
│   │       └── DayCell (7x6 grid)
│   │           ├── DayNumber
│   │           ├── ActivityIndicators (dots/count badge)
│   │           └── TodayIndicator (if today)
│   │
│   ├── WeekView
│   │   ├── WeekHeader (date range)
│   │   ├── AllDaySection (Activities without times)
│   │   └── TimeSlotGrid (6am-11pm hourly)
│   │       ├── HourLabels (left column)
│   │       ├── CurrentTimeIndicator (red line if today)
│   │       └── DayColumns (7 columns)
│   │           └── TimeSlotActivity (positioned by time)
│   │
│   └── DayView
│       ├── DayHeader (full date, activity count)
│       ├── DayNavigator (Previous/Next day buttons)
│       ├── AllDaySection
│       │   └── ActivityCard[]
│       └── TimedActivitySection
│           ├── TimeSlot[] (grouped by time)
│           └── ActivityCard[]
│
└── OfflineIndicator (if offline)
```

### Key Components

#### CalendarPage
- **Responsibility:** Root page component, manages overall state and navigation
- **Props:** None (page component)
- **State:** currentView (month/week/day), selectedDate, filters
- **Key Methods:** handleViewChange(), handleDateNavigation(), handleFilterChange()

#### MonthView
- **Responsibility:** Display full calendar grid with activity indicators
- **Props:** 
  - `activities: CalendarActivity[]`
  - `selectedDate: Date`
  - `onDayClick: (date: Date) => void`
  - `filters: CalendarFilters`
- **State:** None (presentational)
- **Renders:** 6x7 grid with day cells, activity badges, today indicator

#### WeekView
- **Responsibility:** Display hourly time slots with activities
- **Props:**
  - `activities: CalendarActivity[]`
  - `weekStart: Date`
  - `selectedDate: Date`
  - `onDayClick: (date: Date) => void`
  - `filters: CalendarFilters`
- **State:** scrollPosition (for fixed header)
- **Renders:** All-day section, 17-hour grid (6am-11pm), current time line

#### DayView
- **Responsibility:** Display detailed view of a single day
- **Props:**
  - `activities: CalendarActivity[]`
  - `selectedDate: Date`
  - `onPreviousDay: () => void`
  - `onNextDay: () => void`
  - `onBackToCalendar: () => void`
- **State:** None (presentational)
- **Renders:** Full date header, activity list organized by time

#### DayCell
- **Responsibility:** Single day cell in month view
- **Props:**
  - `date: Date`
  - `activities: CalendarActivity[]`
  - `isToday: boolean`
  - `isCurrentMonth: boolean`
  - `onClick: (date: Date) => void`
  - `filters: CalendarFilters`
- **State:** None (presentational)
- **Renders:** Day number, activity indicators, hover/focus states

#### ActivityCard
- **Responsibility:** Display single activity (in Day View or time slot)
- **Props:**
  - `activity: CalendarActivity`
  - `showTime: boolean`
  - `isHighlighted: boolean`
- **State:** None (presentational)
- **Renders:** Title, subject, type badge, time, priority badge, urgency color

#### FilterBar
- **Responsibility:** Filter UI controls
- **Props:**
  - `filters: CalendarFilters`
  - `subjects: Subject[]`
  - `onFilterChange: (filters: CalendarFilters) => void`
- **State:** Dropdown open/closed
- **Renders:** Type buttons, subject dropdown, clear filters button


## Data Models

### CalendarActivity (DTO)
Unified representation of any activity (Task, Exam, Assignment) for calendar display.

```typescript
interface CalendarActivity {
  id: string                          // UUID
  title: string                       // Activity title (max 60 chars for display)
  originalTitle: string               // Original full title (not truncated)
  type: 'task' | 'exam' | 'assignment'
  subject: {
    id: string
    name: string                      // Max 25 chars for display
    color: string                     // Hex color (#RRGGBB) or defaults by type
  }
  date: Date                          // ISO date for display
  dateString: string                  // Formatted: "Mar 15, 2024"
  time?: string                       // HH:mm format or null for all-day
  timeDisplay?: string                // Formatted: "2:30 PM"
  priority?: 'low' | 'medium' | 'high'
  urgency: 'critical' | 'high' | 'medium' | 'low'
  urgencyDays: number                 // Days until due (calculated)
  isOverdue: boolean
  status?: 'todo' | 'in-progress' | 'completed' | 'pending' | 'submitted' | 'graded'
  description?: string
  userId: string                      // For security (RLS verified)
}
```

### CalendarFilters
```typescript
interface CalendarFilters {
  activityTypes: ('task' | 'exam' | 'assignment')[]  // Empty = show all
  subjectId?: string                                  // Optional subject filter
}
```

### CalendarResponse
```typescript
interface CalendarResponse {
  activities: CalendarActivity[]
  dateRange: {
    start: Date
    end: Date
    displayText: string               // e.g., "March 2024" or "Mar 10-16, 2024"
  }
  todayDate: Date
  timezone: string
  filteredCount: number
  totalCount: number
  cacheInfo: {
    cached: boolean
    cachedAt?: Date
    expiresAt?: Date
  }
}
```

### Internal Database Models (from Activities, Exams, Assignments tables)
These are transformed into CalendarActivity DTOs before returning to presentation layer.


## State Management & Data Flow

### Client State
- **View Mode:** month | week | day
- **Selected Date:** Current date being viewed (changes with navigation)
- **Filters:** Active type and subject filters
- **Offline Status:** online | offline
- **Loading State:** idle | loading | error

**State Location:** CalendarPage component (using React state)

### Server State
- **Activities Data:** Fetched via Server Action, cached in browser
- **Cache TTL:** 1 hour for offline support
- **Real-time Updates:** Via Supabase subscription (future enhancement)

### Data Fetching Strategy

1. **Initial Load:**
   - Fetch current month/week/day data
   - Cache data for offline use
   - Display with optimistic rendering

2. **Navigation:**
   - Check cache first (< 1 hour old)
   - If cached, display immediately
   - If not cached or stale, fetch from server
   - Update cache on success

3. **Filtering:**
   - Apply filters to cached data
   - No new server request (client-side filtering)
   - Update UI reactively

4. **Refresh:**
   - Manual refresh: Fetch latest from server
   - Auto-refresh on reconnection: Fetch latest if offline data exists
   - Show "Synced at X" indicator

### Cache Implementation

Using IndexedDB for client-side caching:

```typescript
// Cache structure
{
  calendarData: {
    key: "calendar_${userId}_${viewMode}_${dateRange}",
    value: CalendarResponse,
    timestamp: Date,
    ttl: 3600000 (1 hour in ms)
  }
}
```

When offline:
- Check IndexedDB for cached data
- Load cached month/week/day if available
- Show "Offline - Last updated: X hours ago"
- Block navigation to uncached time periods
- Block new filtering (use only cached results)


## Server Actions & Data Layer

### Server Action: getCalendarData

```typescript
async function getCalendarData(
  viewMode: 'month' | 'week' | 'day',
  dateOrDateRange: Date | { start: Date, end: Date },
  filters: CalendarFilters,
  userId: string
): Promise<CalendarResponse>
```

**Responsibilities:**
1. Validate inputs with Zod schema
2. Check user authentication (via session)
3. Calculate date range based on view mode and input date
4. Call CalendarUseCase to fetch and format activities
5. Return CalendarResponse or throw error

**Error Handling:**
- Unauthorized: Return 401 error
- Invalid input: Return 400 with validation errors
- Database error: Return 500 with generic error message
- Offline: Return cached data with `cacheInfo.cached = true`

### Server Action: formatCalendarData

```typescript
function formatCalendarData(
  activities: CalendarActivity[],
  viewMode: 'month' | 'week' | 'day'
): FormattedCalendarResponse
```

**Responsibilities:**
1. Format dates according to locale and view mode
2. Truncate titles to appropriate length (60 chars for Week/Day, 40 for Month)
3. Calculate urgency levels and colors
4. Apply color coding by type and subject
5. Group activities by time (for Week/Day views)
6. Return formatted data ready for rendering

### Data Queries

#### Query 1: Fetch Month Activities
```sql
SELECT 
  a.id, a.type, a.title, a.priority, a.status,
  CASE 
    WHEN a.type = 'task' THEN a.due_date
    WHEN a.type = 'exam' THEN a.date
    WHEN a.type = 'assignment' THEN a.due_date
  END as event_date,
  CASE 
    WHEN a.type = 'exam' THEN a.time
    ELSE NULL
  END as event_time,
  s.id as subject_id, s.name as subject_name, s.color as subject_color,
  a.user_id
FROM activities a
LEFT JOIN subjects s ON a.subject_id = s.id
WHERE a.user_id = $1
  AND ((a.type = 'task' AND DATE_TRUNC('month', a.due_date) = DATE_TRUNC('month', $2))
    OR (a.type = 'exam' AND DATE_TRUNC('month', a.date) = DATE_TRUNC('month', $2))
    OR (a.type = 'assignment' AND DATE_TRUNC('month', a.due_date) = DATE_TRUNC('month', $2)))
ORDER BY event_date ASC, event_time ASC;
```

**Indexes needed:**
- `(user_id, type, due_date)` - For task filtering
- `(user_id, type, date)` - For exam filtering
- `(user_id, type)` - For type-based queries

#### Query 2: Fetch Week Activities
```sql
SELECT [same columns as above]
FROM activities a
LEFT JOIN subjects s ON a.subject_id = s.id
WHERE a.user_id = $1
  AND ((a.type = 'task' AND a.due_date BETWEEN $2 AND $3)
    OR (a.type = 'exam' AND a.date BETWEEN $2 AND $3)
    OR (a.type = 'assignment' AND a.due_date BETWEEN $2 AND $3))
ORDER BY event_date ASC, event_time ASC;
```

#### Query 3: Fetch Day Activities
Same as week query but with single day range (`$2 = $3`).

**Performance Optimization:**
- Single query fetches all activity types (avoids N+1)
- LEFT JOIN with subjects (single join, not nested queries)
- Indexes ensure < 100ms query time
- Results cached in browser (1 hour TTL)
- Lazy loading for navigation (only load adjacent months/weeks on demand)


## Database Schema & RLS

### Activities Table (Combined - Tasks, Exams, Assignments)

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'exam', 'assignment')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  
  -- Task-specific fields
  due_date DATE,
  priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) CHECK (status IN ('todo', 'in-progress', 'completed', 'pending', 'submitted', 'graded')),
  estimated_time_minutes INTEGER,
  
  -- Exam-specific fields
  date DATE,
  time VARCHAR(5),  -- HH:mm format
  exam_type VARCHAR(20) CHECK (exam_type IN ('written', 'oral', 'practical')),
  location VARCHAR(255),
  
  -- Assignment-specific fields
  assignment_type VARCHAR(20) CHECK (assignment_type IN ('written', 'presentation', 'project')),
  criteria TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CHECK (
    (type = 'task' AND due_date IS NOT NULL AND priority IS NOT NULL) OR
    (type = 'exam' AND date IS NOT NULL) OR
    (type = 'assignment' AND due_date IS NOT NULL)
  )
);
```

### Subjects Table

```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),  -- Hex color code
  professor VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Indexes for Calendar Performance

```sql
-- Calendar view queries
CREATE INDEX idx_activities_user_due_date ON activities(user_id, due_date) 
  WHERE type = 'task' OR type = 'assignment';
CREATE INDEX idx_activities_user_event_date ON activities(user_id, date) 
  WHERE type = 'exam';
CREATE INDEX idx_activities_user_type ON activities(user_id, type);

-- Subject lookup
CREATE INDEX idx_subjects_user_id ON subjects(user_id);

-- RLS policies
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_subjects_user_id ON subjects(user_id);
```

### Row-Level Security (RLS)

```sql
-- Enable RLS on activities and subjects
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Activities: Users can only see their own activities
CREATE POLICY activities_select ON activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY activities_insert ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY activities_update ON activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY activities_delete ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- Subjects: Users can only see their own subjects
CREATE POLICY subjects_select ON subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY subjects_insert ON subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY subjects_update ON subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY subjects_delete ON subjects
  FOR DELETE USING (auth.uid() = user_id);
```


## UI Layout & Styling

### Color System

#### Activity Type Colors (Primary)
- **Task:** #3B82F6 (Blue-500)
- **Exam:** #EF4444 (Red-500)
- **Assignment:** #10B981 (Green-500)

#### Urgency Indicators (Secondary)
- **Critical (Due today/overdue):** #DC2626 (Red-600) - Red badge with white text
- **High (1-3 days):** #F97316 (Orange-500) - Orange badge
- **Medium (4-7 days):** #EAB308 (Yellow-500) - Yellow badge
- **Low (8+ days):** #9CA3AF (Gray-400) - Gray badge

#### UI Colors (Tailwind palette)
- **Background:** #FFFFFF (white) or #F9FAFB (light gray for body)
- **Border:** #E5E7EB (gray-200)
- **Text Primary:** #111827 (gray-900)
- **Text Secondary:** #6B7280 (gray-500)
- **Hover:** #F3F4F6 (gray-100)
- **Today Indicator:** #3B82F6 (blue-500) circle or background
- **Overdue Background:** #FEE2E2 (red-100)
- **Focus Outline:** #2563EB (blue-600) 3px solid

### Responsive Layouts

#### Mobile Layout (< 768px)

**Month View:**
- 7-column grid (Sun-Sat)
- Day cells: 40x50px minimum
- Day number: 12px
- Activity indicators: 1-2 dots or small badge "3+"
- Navigation: Full-width buttons below calendar

**Week View:**
- Days displayed vertically (one day per row)
- All-day section: Full width
- Time slots: Vertical scrolling
- Current time line visible only on today's date
- Touch targets: 44x44px minimum

**Day View:**
- Full-width layout
- Activities in vertical list
- All-day section at top
- Timed activities below

#### Tablet Layout (768px - 1024px)

**Month View:**
- 7-column grid
- Day cells: 80x80px
- Activity indicators: 2-3 dots or badge
- Readable text (14px)

**Week View:**
- 5 days displayed horizontally (1 row visible, scroll to see next 2 days)
- Or all 7 days in 2 rows

#### Desktop Layout (> 1024px)

**Month View:**
- 7-column grid (standard calendar)
- Day cells: 120x100px
- Full title display (40 chars)
- Multiple activity indicators visible
- Optimal information density

**Week View:**
- All 7 days visible horizontally
- Full time slot grid (6am-11pm, 1 hour per row, 60px height)
- Activities with full titles
- Left sidebar: Hour labels

**Day View:**
- Centered max-width container (800px)
- Full-width time slots
- Activities with full details

### Tailwind CSS Implementation

**Day Cell (Month View):**
```tsx
<div className="
  border border-gray-200
  rounded-lg
  p-2
  min-h-[100px]
  hover:bg-gray-50
  cursor-pointer
  focus:outline-none
  focus:ring-2
  focus:ring-blue-500
  relative
">
  <span className="text-sm font-semibold text-gray-900">{dayNumber}</span>
  <div className="mt-1 flex flex-col gap-1">
    {/* Activity indicators */}
  </div>
</div>
```

**Activity Badge (Month View):**
```tsx
<div className="
  w-2 h-2
  rounded-full
  [color-determined-by-type]
" aria-label={`${activityType}: ${activityTitle}`} />
```

**Activity Card (Week/Day View):**
```tsx
<div className="
  bg-white
  border-l-4
  [border-color-by-type]
  rounded
  p-3
  [urgency-background-color]
  hover:shadow-md
  cursor-pointer
  transition-shadow
">
  <div className="font-medium text-sm">{title}</div>
  <div className="text-xs text-gray-500 mt-1">{subject}</div>
  {time && <div className="text-xs text-gray-600">{time}</div>}
</div>
```

### Accessibility Considerations in Styling

- Focus indicators: 3px outline, high contrast color
- Color + text labels for all coded information
- Sufficient line height (1.5x) for readability
- Adequate padding for touch targets (44x44px minimum)
- No reliance on color alone


## Interaction Patterns

### Click Navigation

**Month View:**
- Click day cell → Navigate to Day View for that day
- Click activity indicator → Navigate to Day View with activity highlighted
- Click "Previous Month" → Load and display previous month
- Click "Next Month" → Load and display next month
- Click filter button → Toggle filter
- Click "Clear Filters" → Reset all filters

**Week View:**
- Click day column header → Navigate to Day View for that day
- Click activity in time slot → (Future: Navigate to activity detail)
- Click "Previous Week" → Load and display previous week
- Click "Next Week" → Load and display next week
- Click "Today" → Jump back to current week

**Day View:**
- Click "Previous Day" arrow → Load and display previous day
- Click "Next Day" arrow → Load and display next day
- Click "Back to Calendar" → Return to Month/Week View
- Click activity → (Future: Navigate to activity detail)

### Touch Navigation (Mobile)

**Swipe Gestures:**
- Swipe left on Month View → Next month
- Swipe right on Month View → Previous month
- Swipe left on Week View → Next week
- Swipe right on Week View → Previous week
- Swipe left on Day View → Next day
- Swipe right on Day View → Previous day

**Tap Interactions:**
- Tap day cell → Navigate to Day View
- Long press activity → (Future: Context menu - edit, delete, mark complete)
- Double tap → (Future: Quick edit)

### Keyboard Navigation

**Tab Order:**
1. View mode buttons (Month/Week/Day)
2. Navigation arrows (Previous/Next)
3. Filter buttons and dropdowns
4. Day cells (in grid order)
5. Activities (in list order)
6. Return/Back buttons

**Keyboard Shortcuts (Future Enhancement):**
- `←/→` arrows: Navigate between days/weeks/months
- `Escape`: Return to calendar view
- `f`: Focus on filter bar
- `t`: Jump to today

### Filtering

**Filter Application:**
- Click type button → Toggle inclusion of that type
- Select subject → Filter to only that subject
- Multiple filters work together (AND logic)
- Filters persist across view changes
- Filters persist during navigation

**Filter States:**
- All visible: No badges
- Some filtered: Show active filter indicator (e.g., "Tasks Only")
- "Clear Filters" button appears when any filter active


## Accessibility Features

### Semantic HTML

**Calendar Table Structure (if using table element):**
```html
<table role="presentation" className="w-full">
  <thead>
    <tr>
      <th scope="col">Sun</th>
      <th scope="col">Mon</th>
      <!-- ... -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <div role="button" tabIndex="0" aria-label="Monday, March 15, 2024, 3 activities: 1 Task, 1 Exam, 1 Assignment">
          <!-- Day cell content -->
        </div>
      </td>
      <!-- ... -->
    </tr>
  </tbody>
</table>
```

**Div-Based Grid Alternative (more flexible):**
```html
<main role="main" aria-label="Calendar">
  <h1>March 2024</h1>
  <div role="grid" className="calendar-grid">
    <div role="row">
      <div role="gridcell" tabIndex="0" aria-label="Monday, March 15, 2024, 3 activities">
        <!-- Day cell -->
      </div>
    </div>
  </div>
</main>
```

### Keyboard Navigation

**Focus Management:**
- Focus visible on all interactive elements
- Tab order: left-to-right, top-to-bottom
- Enter/Space activates buttons and day cells
- Arrow keys navigate day cells (optional enhancement)
- Escape returns to previous view

**ARIA Attributes:**
```tsx
// Day cell ARIA
<div
  role="button"
  tabIndex={0}
  aria-label="Monday, March 15, 2024 - 3 activities: 1 Task, 1 Exam, 1 Assignment"
  aria-selected={isSelected}
  onKeyDown={handleKeyDown}
>
  <!-- Content -->
</div>

// Activity card ARIA
<div
  className="activity-card"
  aria-label="Task: Study Chapter 3 - Mathematics - Due Mar 15 at 3:00 PM - High Priority - 2 days remaining"
>
  <!-- Content -->
</div>

// Filter ARIA
<button
  aria-pressed={isActive}
  aria-label="Filter by Tasks (currently selected)"
>
  Tasks
</button>
```

### Screen Reader Support

**Announcements:**
- Day cell: "Monday, March 15, 2024, 3 activities: 1 Task (blue), 1 Exam (red), 1 Assignment (green)"
- Activity: "Study Chapter 3, Mathematics, Task, Due tomorrow at 3:00 PM, High Priority"
- Filter status: "Filtering by: Mathematics, Tasks only - Clear filters button available"
- Offline status: "Calendar offline - Last updated 2 hours ago"
- View change: "Switched to week view, showing March 10-16, 2024"

### Focus Management

```tsx
// Example: Set focus on header after view change
useEffect(() => {
  const header = ref.current?.querySelector('[data-calendar-header]');
  if (header) {
    header.focus();
  }
}, [viewMode, selectedDate]);
```

### Color & Contrast

- Activity type colors: 4.5:1 contrast ratio minimum
- Text on colored backgrounds: 4.5:1 contrast ratio minimum
- Urgency indicators: Use color + text/icon (not color alone)
- Focus indicator: 3px solid blue (#2563EB) with 4.5:1 contrast

### WCAG 2.1 Level AA Compliance

- All elements keyboard accessible
- Color not the only indicator of information
- Sufficient contrast throughout
- Text resizable up to 200% without loss of functionality
- No flashing content (animations respect prefers-reduced-motion)
- Focus visible on all interactive elements
- Proper heading hierarchy


## Performance Optimizations

### Code Splitting

**Route-based code splitting:**
- Calendar feature lazy-loaded when user navigates to `/calendar` route
- Shared components (CalendarPage, views) bundled once
- Estimated bundle: 80-100KB gzipped

**Component-level optimization:**
- MonthView, WeekView, DayView components lazy-loaded within page
- FilterBar lazy-loaded
- OfflineIndicator lazy-loaded

### Query Optimization

**Single Query Pattern:**
- Fetch all activity types in one query (not separate queries per type)
- Use UNION or conditional logic in WHERE clause
- Join subjects once (not N+1 subject lookups)

**Index Strategy:**
- Composite indexes on (user_id, type, date_field)
- Separate indexes for each date field type (due_date vs event_date)
- Filter on user_id first (RLS ensures this)

**Query Result Caching:**
- Cache entire result for 1 hour
- Invalidate cache on activity creation/update/deletion
- Serve from cache on repeat navigation to same period

### Lazy Loading

**Temporal Lazy Loading:**
- Only load current month initially
- Preload adjacent months on navigation
- Load additional months on demand
- Unload old months from cache after 24 hours

**Component Lazy Loading:**
- Lazy-load week/day view components on first view switch
- Lazy-load filter dropdown options (load subjects on demand)
- Use React.lazy() with Suspense boundaries

### React Optimization

**Memoization:**
- Memoize DayCell component (receives same props often)
- Memoize ActivityCard component
- Memoize FilterBar (prevent re-renders on parent updates)

**State Management:**
- Keep calendar state minimal (view mode, selected date, filters)
- Derive other values (currentWeek, isToday, etc.)
- Use useCallback for event handlers (passed to memoized children)

**Re-render Prevention:**
```tsx
// Memoize to prevent re-renders when parent re-renders
const DayCell = React.memo(({ date, activities, onClick }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison: return true to skip re-render
  return prevProps.date === nextProps.date &&
         prevProps.activities.length === nextProps.activities.length &&
         prevProps.onClick === nextProps.onClick;
});
```

### Bundle Size Targets

- Calendar feature: < 100KB gzipped
- Shared dependencies: Counted separately (date-fns, react-day-picker)
- No additional third-party libraries for calendar rendering


## Error Handling & Edge Cases

### Network Errors

**Scenario 1: Initial load fails**
- Display error message: "Unable to load calendar - please try again"
- Show retry button
- Optionally load cached data if available

**Scenario 2: Navigation fails (month not loading)**
- Keep previous month displayed
- Show inline error: "Unable to load March 2024 - please check your connection"
- Don't block UI

**Scenario 3: Filter operation fails**
- Revert filter to previous state
- Show toast: "Filter error - resetting to previous filter"

### Data Errors

**Scenario 1: Missing required fields**
- Activity skipped from display (not rendered)
- Console warning logged
- No user-visible error (graceful degradation)

**Scenario 2: Invalid date format in database**
- Activity skipped
- Error logged with activity ID
- Display count accurate (excludes invalid activities)

**Scenario 3: Subject not found (deleted)**
- Display activity with generic subject label: "Unknown Subject"
- Still apply type-based coloring
- Allow user to edit activity to assign valid subject

### Display Edge Cases

**Scenario 1: No activities for date range**
- Month View: All day cells show just day numbers (no indicators)
- Week View: "No activities this week" message in center
- Day View: "No activities for this day" message

**Scenario 2: Too many activities on one day**
- Month View: Show "+5" or similar badge instead of individual dots
- Week View: Activities stack vertically with scrollable container
- Day View: Full list visible (scrollable if needed)

**Scenario 3: Very long activity title**
- Month View: Truncate to 40 chars + "..." (title shown in tooltip on hover)
- Week View: Truncate to 60 chars + "..."
- Day View: Show full title (no truncation)
- Full title always available in aria-label

**Scenario 4: Overlapping time slots in Week View**
- Activities positioned side-by-side (50% width each)
- Visual indication of overlap (semi-transparent backgrounds)
- Full details shown in tooltip on hover

### Offline Edge Cases

**Scenario 1: User offline, tries to navigate to uncached month**
- Show message: "March 2024 is not available offline - please check your connection"
- Offer button to try loading anyway
- Maintain current month view

**Scenario 2: Offline, user clears browser cache**
- No calendar data available
- Display: "No offline data available - please connect to internet to load calendar"

**Scenario 3: Reconnection with stale cached data**
- Auto-refresh triggered
- Show "Syncing..." briefly
- Update display with fresh data

### Authentication Edge Cases

**Scenario 1: User session expires while viewing calendar**
- Show: "Session expired - please log in again"
- Provide login link
- Preserve calendar state (return after login)

**Scenario 2: User permissions changed (e.g., subject deleted)**
- Activities with deleted subject still display
- Subject label shows "Unknown Subject"
- User can still interact with activity


## Integration Points

### Integration with Activity Creation

**Location:** `/app/(main)/activities/new` and `/app/(main)/activities/[id]/edit`

**Data Sync:**
- When activity created/updated, invalidate calendar cache for affected date
- Calendar automatically refreshes next time user navigates to affected month
- Or use real-time Supabase subscriptions for instant updates

### Integration with Activity List

**Location:** `/app/(main)/activities`

**Shared Patterns:**
- Same filtering logic (activity type, subject)
- Same color coding
- Same data retrieval (both use getCalendarData server action variants)
- Activities List can reference Calendar: "View on calendar" link

### Integration with Dashboard

**Location:** `/app/(main)/dashboard`

**Data Sharing:**
- Dashboard shows "Next 7 days" - same data as Week View starting from today
- Dashboard uses same formatting functions
- Link from Dashboard to Calendar: "View full calendar"

### Navigation URL Structure

```
/app/(main)/calendar                    # Calendar default (month view)
/app/(main)/calendar?view=month         # Month view explicit
/app/(main)/calendar?view=week          # Week view
/app/(main)/calendar?view=day           # Day view
/app/(main)/calendar?date=2024-03-15    # Specific date
/app/(main)/calendar?filter=tasks       # Filter by type
/app/(main)/calendar?subject=math       # Filter by subject
```

**Query Parameter Combinations:**
```
?view=week&date=2024-03-15&filter=exams&subject=math
# Week view, starting week containing March 15, showing exams for Math only
```

### Data Model Alignment

**Activities Table Alignment:**
- Calendar uses: id, type, title, due_date/date, time, priority, status, subject_id, user_id
- All required fields present in database
- Indexes configured for calendar queries
- RLS policies configured

**Subjects Table Alignment:**
- Calendar uses: id, name, color
- Subjects must exist before activities can reference them
- Color field optional (defaults to type-based color)

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Month View Displays All Days of Current Month

For any month, the Month View grid shall display all days from the 1st to the last day of that month in the correct calendar positions, with each day number appearing exactly once in its correct weekday column.

**Validates: Requirements 1.2, 1.3**

### Property 2: Month View Includes Filler Days for Grid Completion

For any month, the Month View grid shall include filler days from the previous and next months to complete the 6x7 calendar grid, with filler days visually distinct (light gray) from current month days.

**Validates: Requirements 1.4**

### Property 3: Activity Indicators Display on Days with Activities

For any day with one or more activities, the day cell shall display an activity indicator (dot, dots, or count badge) corresponding to the number of activities on that day.

**Validates: Requirements 1.6, 6.1, 6.2**

### Property 4: Empty Days Display Only Day Number

For any day with zero activities, the day cell shall display only the day number with no activity indicators or badges.

**Validates: Requirements 1.7**

### Property 5: Navigation Changes Displayed Month Correctly

For any month navigation action (previous or next), the Month View shall update to display the activities and dates for the targeted month, with the month/year header reflecting the new month.

**Validates: Requirements 1.10, 7.3, 7.7, 7.8**

### Property 6: Week View Displays Seven Consecutive Days

For any week displayed in Week View, exactly seven consecutive calendar days shall be shown in order, with no gaps or duplicates in the day sequence.

**Validates: Requirements 2.2**

### Property 7: Week View Time Slots Span Configured Range

For any Week View display, time slots shall be present for all hours within the configured range (6 AM to 11 PM), with each hour represented by exactly one time slot.

**Validates: Requirements 2.3, 2.9**

### Property 8: Timed Activities Position in Correct Time Slots

For any activity with a scheduled time (Exams) or due time, that activity shall be displayed in the time slot corresponding to its hour of the day (e.g., 2:30 PM activity in the 2 PM hour slot).

**Validates: Requirements 2.4**

### Property 9: All-Day Activities Display in All-Day Section

For any activity without a scheduled time (Tasks, Assignments without times), that activity shall be displayed in the All-Day section, not in the hourly time grid.

**Validates: Requirements 2.5, 2.6, 3.6**

### Property 10: Day View Displays All Activities for Selected Day

For any selected day, the Day View shall display all activities (from all types) that occur on that day, with no activities from other days displayed.

**Validates: Requirements 3.3**

### Property 11: Day View Organizes Activities by Time

For any Day View, timed activities shall be ordered chronologically by their scheduled time, with all-day activities grouped in a dedicated All-Day section.

**Validates: Requirements 3.3, 3.5, 3.6**

### Property 12: Activity Type Color Assignment is Consistent

For any activity, its color in the calendar shall consistently match its type (Tasks=Blue, Exams=Red, Assignments=Green) regardless of which view it's displayed in.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 13: Activities Display with Non-Color Visual Indicators

For any activity, there shall be a visual indicator beyond color alone (text label, border, icon, or pattern) that distinguishes its type, ensuring accessibility for colorblind users.

**Validates: Requirements 4.6**

### Property 14: Urgency Calculated from Days Until Due

For any activity, the urgency level shall be calculated as the number of days from today until the activity's due/event date, categorized as Critical (today/overdue), High (1-3 days), Medium (4-7 days), or Low (8+ days).

**Validates: Requirements 5.1, 5.4, 5.5**

### Property 15: Overdue Activities Marked as Critical

For any activity with a due date in the past and status other than completed, the urgency shall be marked as Critical and displayed with a red indicator.

**Validates: Requirements 5.6, 5.7**

### Property 16: Activity Indicator Count Matches Activity Count

For any day in Month View, the number displayed on the activity indicator (1 dot, 2-3 dots, or "+N" badge) shall match the number of activities on that day.

**Validates: Requirements 6.2**

### Property 17: Multiple Type Colors Shown on Mixed Days

For any day with activities of multiple types, the activity indicator shall display colors representing each type present (e.g., blue dot for Task + red dot for Exam).

**Validates: Requirements 6.4**

### Property 18: Month Navigation Bounds Enforced

When navigating to previous months, the Calendar shall not navigate before January of the current year or the earliest month with activities. Forward navigation shall have no upper limit.

**Validates: Requirements 7.5, 7.6**

### Property 19: Navigation Maintains View Mode

When navigating between time periods (months, weeks, days), the current view mode (Month/Week/Day) shall be preserved and not change.

**Validates: Requirements 7.9, 8.10**

### Property 20: Week Navigation Displays Consecutive Weeks

For any week navigation action, the Week View shall update to display the previous or next consecutive 7-day period with no gaps or overlaps.

**Validates: Requirements 8.2, 8.3**

### Property 21: Week Header Shows Correct Date Range

For any week displayed in Week View, the header shall display the date range in the format "MMM DD - MMM DD, YYYY" representing the first and last days of the displayed week.

**Validates: Requirements 8.4**

### Property 22: Today Indicator Shows in Current Week

When viewing the week containing today's date in Week View, today's date shall be visually highlighted or marked with a distinct indicator.

**Validates: Requirements 8.5**

### Property 23: Day Navigation Updates Activity List

When navigating to a different day in Day View (using previous/next day arrows), the activity list shall update to display the activities from the new day and the header shall reflect the new date.

**Validates: Requirements 9.2, 9.3, 9.4**

### Property 24: Day View Shows Accurate Activity Count

For any day in Day View, the header shall display the correct count of activities for that day, matching the number of activities actually displayed.

**Validates: Requirements 6.7**

### Property 25: Filters Apply Across All Views

For any applied filter (by type or subject), activities in Month View, Week View, and Day View shall display only activities matching the filter criteria.

**Validates: Requirements 10.3, 10.4**

### Property 26: Filters Persist During Navigation

For any navigation action (month/week/day change), the currently applied filters shall remain in effect and filter the newly displayed activities.

**Validates: Requirements 10.5, 10.6**

### Property 27: Filter Clear Removes All Restrictions

When the "Clear Filters" button is clicked, all active filters shall be removed and the calendar shall display all activities without restriction.

**Validates: Requirements 10.8**

### Property 28: No Results Message on Empty Filtered Set

When filters are applied and no activities match the filter criteria, the calendar shall display a "No activities match this filter" message instead of an empty grid.

**Validates: Requirements 10.10**

### Property 29: View Navigation Performance Within Target

For any view navigation action (Month ↔ Week ↔ Day), the display shall update within 1 second, or within 500ms if the data is already cached.

**Validates: Requirements 13.3, 13.4**

### Property 30: Single Query Retrieves All Activities

For any calendar data retrieval operation, all activities for the displayed date range shall be fetched with exactly one database query, not multiple sequential queries.

**Validates: Requirements 13.5, 15.1**

### Property 31: Data Retrieval Filtered by User ID

For any data retrieval operation via Server Action, the query shall filter activities by the authenticated user's ID, ensuring users only see their own activities.

**Validates: Requirements 15.2**

### Property 32: Month View Query Returns Correct Activities

For any month displayed in Month View, the database query shall return all Tasks with dueDate in that month, all Exams with event date in that month, and all Assignments with dueDate in that month, with no other activities included.

**Validates: Requirements 15.3**

### Property 33: Week View Query Returns Correct Activities

For any week displayed in Week View, the database query shall return all activities (all types) with dates within that 7-day period, with no activities from outside the week included.

**Validates: Requirements 15.4**

### Property 34: Day View Query Returns Correct Activities

For any day displayed in Day View, the database query shall return all activities with dates matching that specific day, with no other days' activities included.

**Validates: Requirements 15.5**

### Property 35: Query Results Include Subject Information

For any data retrieval query, the result set shall include subject name and color for each activity through a join with the subjects table, with no additional queries needed to fetch subject data.

**Validates: Requirements 15.6**

### Property 36: Query Errors Return Descriptive Messages

When a data retrieval query fails, the Server Action shall return an error object with a descriptive error message instead of crashing or returning null.

**Validates: Requirements 15.10**

### Property 37: Dates Formatted as "MMM DD, YYYY"

For any date displayed in the calendar, the format shall follow the pattern "MMM DD, YYYY" (e.g., "Mar 15, 2024"), regardless of the view or context.

**Validates: Requirements 16.1**

### Property 38: Times Formatted as "h:mm AM/PM"

For any time displayed in the calendar, the format shall follow the pattern "h:mm AM/PM" (e.g., "2:30 PM"), with no 24-hour format used.

**Validates: Requirements 16.2**

### Property 39: Month Names Display in Full

For any month displayed in the calendar header, the month name shall be the full English name (e.g., "March") not abbreviated (e.g., "Mar").

**Validates: Requirements 16.3**

### Property 40: Activity Titles Truncated for Month View

For any activity title displayed in Month View, the title shall be truncated to a maximum of 40 characters with an ellipsis ("...") appended if longer, while the full original title is preserved in the data model.

**Validates: Requirements 16.5, 17.3**

### Property 41: Activity Titles Truncated for Week/Day View

For any activity title displayed in Week View or Day View, the title shall be truncated to a maximum of 60 characters with an ellipsis ("...") appended if longer, while the full original title is preserved in the data model.

**Validates: Requirements 16.6**

### Property 42: Subject Names Truncated Consistently

For any subject name displayed in the calendar, the name shall be truncated to a maximum of 25 characters with an ellipsis ("...") appended if longer, while the full original name is preserved in the data model.

**Validates: Requirements 16.7**

### Property 43: Date Range Formatted for Week View

For any week displayed in Week View, the date range in the header shall be formatted as "MMM DD - MMM DD, YYYY" (e.g., "Mar 10 - Mar 16, 2024").

**Validates: Requirements 16.9**

### Property 44: Round-Trip Data Integrity

For any set of activities retrieved from the database, when the activities are formatted for display and then re-queried from the database, the data in the second query shall exactly match the data from the first query, with no mutations or data loss.

**Validates: Requirements 17.1, 17.4, 17.5, 17.6**

### Property 45: Formatting Does Not Mutate Source Data

For any activity, when its title, date, or time is formatted for display (truncated, reformatted), the original unformatted values shall remain unchanged in the database and in the data model.

**Validates: Requirements 17.2, 17.3**

### Property 46: Offline Mode Displays Cached Data

When the application is offline, the Calendar shall display the last cached version of activities for previously loaded date ranges, with an offline indicator showing the cache age.

**Validates: Requirements 14.1, 14.2**

### Property 47: Offline Navigation Uses Cache

When navigating between time periods (months/weeks) while offline, the calendar shall display cached data for previously loaded periods, or show a message for uncached periods.

**Validates: Requirements 14.3, 14.4**

### Property 48: Reconnection Triggers Data Refresh

When network connectivity is restored after being offline, the Calendar shall automatically fetch fresh data for the currently displayed date range and update the display.

**Validates: Requirements 14.5**

### Property 49: Offline Cache Expires After TTL

For any cached activity data, the cache shall expire and be considered stale after 1 hour (3600 seconds), after which fresh data from the server shall be fetched on the next retrieval attempt.

**Validates: Requirements 14.6**

### Property 50: Offline Interactions Work Without Errors

When the application is offline, calendar interactions (navigation between time periods, filtering, view switching) shall function without errors or exceptions, using cached data where available.

**Validates: Requirements 14.8**


## Testing Strategy

### Dual Testing Approach

The Calendar feature requires both unit testing and property-based testing for comprehensive correctness:

- **Unit Tests:** Verify specific examples, edge cases, and error conditions with concrete test data
- **Property Tests:** Verify universal properties that must hold across all inputs and combinations

Both approaches are complementary and necessary. Unit tests catch concrete bugs; property tests verify general correctness principles.

### Unit Testing

**Scope:** Specific examples, edge cases, error conditions

**Examples:**
- Initial load defaults to Month View
- Day View empty state displays "No activities for this day"
- Performance: Initial load < 2 seconds
- Offline: Show offline indicator when disconnected
- Error handling: Display error message on query failure
- Database: Query execution < 1 second

**Target Coverage:** 70%+ of presentation layer components

### Property-Based Testing

**Scope:** Universal properties that hold across all inputs

**Test Framework:** fast-check (JavaScript property-based testing)

**Configuration:** Minimum 100 iterations per test, with randomized inputs

**Property Test Examples:**

```typescript
// Property 1: Month View displays all days of month
test('Property 1: Month Grid Contains All Days of Month', () => {
  fc.assert(
    fc.property(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      (monthDate) => {
        const grid = generateMonthGrid(monthDate);
        const daysInMonth = getDaysInMonth(monthDate);
        
        // All day numbers from 1 to last day should be present
        for (let day = 1; day <= daysInMonth; day++) {
          expect(grid.some(cell => cell.dayNumber === day)).toBe(true);
        }
        
        // Each day number should appear exactly once
        const dayNumbers = grid.map(cell => cell.dayNumber);
        expect(dayNumbers.filter(n => n >= 1).length).toBe(daysInMonth);
      }
    ),
    { numRuns: 100 }
  );
});
// Feature: calendar-view, Property 1: Month Grid Contains All Days of Month

// Property 2: Activity Indicator Count Matches Activity Count
test('Property 16: Activity Indicator Count Matches Activity Count', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.uuid(),
          type: fc.oneof(fc.constant('task'), fc.constant('exam'), fc.constant('assignment')),
          date: fc.date(),
          title: fc.string()
        }),
        { maxLength: 20 }
      ),
      (activities) => {
        const dayActivities = activities.filter(a => isSameDay(a.date, testDate));
        const indicator = getActivityIndicator(dayActivities);
        
        // Indicator count should match activity count
        if (dayActivities.length === 0) {
          expect(indicator).toBe(null);
        } else if (dayActivities.length <= 3) {
          expect(indicator.dotsCount).toBe(dayActivities.length);
        } else {
          expect(indicator.badgeCount).toBe(dayActivities.length);
        }
      }
    ),
    { numRuns: 100 }
  );
});
// Feature: calendar-view, Property 16: Activity Indicator Count

// Property 3: Single Database Query Returns Correct Activities
test('Property 30: Single Query Retrieves All Activities', () => {
  fc.assert(
    fc.property(
      fc.record({
        year: fc.integer({ min: 2024, max: 2025 }),
        month: fc.integer({ min: 1, max: 12 })
      }),
      async ({ year, month }) => {
        const userId = 'test-user-id';
        const monthDate = new Date(year, month - 1, 1);
        
        // Should execute exactly one query
        const queryCount = measureQueryCount();
        const activities = await getCalendarData('month', monthDate, {}, userId);
        
        expect(queryCount.afterCall).toBe(1);
        
        // All returned activities should be from the requested month
        for (const activity of activities) {
          const activityMonth = activity.date.getMonth() + 1;
          const activityYear = activity.date.getFullYear();
          expect(activityMonth).toBe(month);
          expect(activityYear).toBe(year);
        }
      }
    ),
    { numRuns: 100 }
  );
});
// Feature: calendar-view, Property 30: Single Query Retrieves All Activities

// Property 4: Formatting Does Not Mutate Source Data
test('Property 45: Formatting Does Not Mutate Source Data', () => {
  fc.assert(
    fc.property(
      fc.record({
        id: fc.uuid(),
        title: fc.string({ minLength: 50, maxLength: 200 }),
        date: fc.date(),
        time: fc.option(fc.string())
      }),
      (activity) => {
        const originalTitle = activity.title;
        const originalDate = new Date(activity.date);
        
        // Format for display
        const formatted = formatActivityForDisplay(activity, 'month');
        
        // Original should be unchanged
        expect(activity.title).toBe(originalTitle);
        expect(activity.date.getTime()).toBe(originalDate.getTime());
        
        // Formatted version should be truncated
        if (originalTitle.length > 40) {
          expect(formatted.title.length).toBeLessThanOrEqual(43); // 40 + "..."
        }
      }
    ),
    { numRuns: 100 }
  );
});
// Feature: calendar-view, Property 45: Formatting Does Not Mutate Source Data

// Property 5: Urgency Calculated Correctly
test('Property 14: Urgency Calculated from Days Until Due', () => {
  fc.assert(
    fc.property(
      fc.record({
        daysUntilDue: fc.integer({ min: -100, max: 100 })
      }),
      ({ daysUntilDue }) => {
        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + daysUntilDue);
        
        const urgency = calculateUrgency(dueDate, 'completed');
        
        // Verify urgency level matches days remaining
        if (daysUntilDue <= 0 && !isCompleted) {
          expect(urgency).toBe('critical');
        } else if (daysUntilDue <= 3 && daysUntilDue > 0) {
          expect(urgency).toBe('high');
        } else if (daysUntilDue <= 7 && daysUntilDue > 3) {
          expect(urgency).toBe('medium');
        } else {
          expect(urgency).toBe('low');
        }
      }
    ),
    { numRuns: 100 }
  );
});
// Feature: calendar-view, Property 14: Urgency Calculated from Days Until Due
```

### Component Tests

**Scope:** Individual component rendering and interaction

**Examples:**
- MonthView: Renders grid with correct structure
- WeekView: Displays 7 days with time slots
- DayView: Shows all activities for selected day
- FilterBar: Applies and clears filters
- ActivityCard: Displays all required fields

**Target Coverage:** 80%+ of presentation layer

### Integration Tests

**Scope:** Data flow between layers (presentation → application → infrastructure)

**Examples:**
- User clicks month navigation → Server Action called → Database queried → Data returned → Component re-renders
- User applies filter → Filter persisted → View updated with filtered data
- User goes offline → Cached data displayed → User returns online → Fresh data loaded

**Target Coverage:** 70%+ of critical user flows

### E2E Tests (Playwright)

**Scope:** Complete user workflows

**Examples:**
- User loads calendar → Sees current month → Clicks day → Day view displays
- User navigates months → Filters by type → Filters persist
- User goes offline → Views cached data → Comes online → Data refreshes
- Performance: Initial load < 2 seconds, view switch < 500ms

**Target Coverage:** Critical user paths (≥80%)

### Accessibility Testing

**Manual Testing Required:**
- Screen reader announces content correctly (NVDA, JAWS, VoiceOver)
- Keyboard navigation works without traps
- Focus indicators visible on all interactive elements
- Tab order is logical and predictable
- ARIA labels and descriptions present and accurate

**Automated Checks:**
- axe-core accessibility audit (should pass all checks)
- Contrast ratios ≥ 4.5:1 for text
- All interactive elements > 44px touch targets

### Performance Testing

**Metrics to Monitor:**
- Initial page load: < 2 seconds (Lighthouse)
- Time to Interactive: < 3 seconds
- View navigation: < 500ms cached, < 1s uncached
- Query execution: < 1 second
- Bundle size: < 100KB gzipped

**Tools:**
- Lighthouse (CI and manual)
- Chrome DevTools Performance tab
- Database query analyzer
- Bundle analyzer (webpack-bundle-analyzer)


