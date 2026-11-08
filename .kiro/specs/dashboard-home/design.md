# Dashboard Feature Design

## Overview

The Dashboard is the central hub of Amanda's Study Planner, providing students with a comprehensive overview of their academic commitments at a glance. It aggregates pending tasks, upcoming exams and assignments, key metrics, and quick action entry points in a unified interface.

**Primary Purpose:**
- Serve as the app's home screen after authentication
- Consolidate all pending academic activities in one place
- Provide actionable insights through statistics and priority alerts
- Enable rapid access to activity creation workflows

**Key User Journey:**
User logs in → Dashboard displays personalized overview → User can quickly view pending work, see deadlines, access statistics, or create new activities without leaving the Dashboard.

**Design Philosophy:**
- Minimize cognitive load through clear information hierarchy
- Prioritize recently updated or deadline-urgent items
- Provide multiple entry points for creating new activities
- Support all device sizes from mobile to desktop
- Maintain full functionality in offline mode

---

## Architecture

### System Component Diagram

The Dashboard operates within the broader application ecosystem:

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Feature                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐        ┌──────────────────────┐   │
│  │   Presentation      │        │  Server Actions      │   │
│  │   Components        │◄───────┤  (Data Retrieval)    │   │
│  │                     │        │                      │   │
│  │ • DashboardPage     │        │ • getDashboardData   │   │
│  │ • DashboardHeader   │        │ • formatDashboardData│   │
│  │ • TasksSection      │        │                      │   │
│  │ • ExamsSection      │        └──────┬───────────────┘   │
│  │ • AssignmentsSection│               │                   │
│  │ • StatsSection      │               ▼                   │
│  │ • ActionsSection    │        ┌──────────────────────┐   │
│  │ • OverdueAlert      │        │  Database Layer      │   │
│  └────────┬────────────┘        │                      │   │
│           │                     │ • PostgreSQL Queries │   │
│           ▼                     │ • RLS Policies       │   │
│  ┌─────────────────────┐        │                      │   │
│  │   React Hooks       │        └──────────────────────┘   │
│  │                     │                                    │
│  │ • useCallback       │                                    │
│  │ • useEffect         │                                    │
│  │ • useState          │                                    │
│  └─────────────────────┘                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │  Browser Storage │
                  │ (Offline Cache)  │
                  └──────────────────┘
```

### Data Flow

**Initial Load:**
1. User navigates to `/dashboard` route
2. `DashboardPage` component mounts
3. `useEffect` triggers `getDashboardData` Server Action
4. Server Action queries Supabase with user RLS context
5. Data returned and formatted with `formatDashboardData`
6. Components receive formatted data via props
7. Browser stores data in cache (Service Worker)

**Manual Refresh:**
1. User initiates refresh (pull-down on mobile or refresh button)
2. Loading state displays in affected sections
3. `getDashboardData` re-executes
4. Cache invalidates and updates
5. Components re-render with fresh data

**Auto-Refresh (Background):**
1. Dashboard tracks last refresh timestamp
2. After 5 minutes of active viewing, data auto-refreshes
3. If user returns after inactivity, immediate refresh triggers
4. Offline mode prevents network requests

---

## Components and Interfaces

### Component Tree

```
DashboardPage
├── DashboardHeader
│   ├── WelcomeGreeting
│   └── CurrentDate
├── OverdueAlert (conditional)
│   └── AlertBanner
├── PendingTasksSection
│   ├── SectionHeader
│   ├── TaskCard (max 5)
│   │   ├── TaskTitle
│   │   ├── DueDate
│   │   ├── PriorityBadge
│   │   └── SubjectBadge
│   └── ViewAllLink
├── UpcomingExamsSection
│   ├── SectionHeader
│   ├── ExamCard (max 5)
│   │   ├── SubjectName
│   │   ├── ExamDate
│   │   ├── ExamTime
│   │   └── ExamType
│   └── ViewAllLink
├── UpcomingAssignmentsSection
│   ├── SectionHeader
│   ├── AssignmentCard (max 5)
│   │   ├── AssignmentTitle
│   │   ├── SubjectName
│   │   ├── DueDate
│   │   └── AssignmentType
│   └── ViewAllLink
├── QuickStatsSection
│   ├── SectionHeader
│   ├── CompletionMetric
│   │   ├── ProgressCircle
│   │   └── Percentage
│   ├── OverdueMetric
│   ├── EstimatedHoursMetric
│   └── PriorityBreakdownMetric
├── QuickActionsSection
│   ├── NewTaskButton
│   ├── NewExamButton
│   └── NewAssignmentButton
└── RefreshControl (mobile)
```

### Component Responsibilities

#### DashboardPage
- **Purpose:** Main container and orchestrator
- **Responsibility:** Manage dashboard-level state, coordinate data fetching, handle refresh logic
- **Props:** Receives formatted dashboard data
- **State:** `isLoading`, `isOffline`, `lastRefreshTime`, `error`

#### DashboardHeader
- **Purpose:** Display personalized welcome and current date
- **Responsibility:** Render greeting with time-based message, show formatted current date
- **Props:** `userName: string`, `currentDate: Date`
- **UI:** Full-width header with subtle background

#### OverdueAlert
- **Purpose:** Alert user to overdue activities
- **Responsibility:** Conditionally display warning banner only when overdue activities exist
- **Props:** `overdueCount: number`, `onViewAll: () => void`
- **UI:** Warning color (orange/red), dismissible or always visible

#### PendingTasksSection
- **Purpose:** Display up to 5 pending tasks
- **Responsibility:** Filter and sort tasks, render cards, provide "View All" link
- **Props:** `tasks: FormattedTask[]`, `onViewAll: () => void`
- **UI:** Card-based layout, truncated titles, priority color coding

#### UpcomingExamsSection
- **Purpose:** Display up to 5 upcoming exams within 14 days
- **Responsibility:** Filter exams by date range, sort by earliest date
- **Props:** `exams: FormattedExam[]`, `onViewAll: () => void`
- **UI:** Card-based layout with date/time prominently displayed

#### UpcomingAssignmentsSection
- **Purpose:** Display up to 5 upcoming assignments within 14 days
- **Responsibility:** Filter assignments by date range, sort by earliest date
- **Props:** `assignments: FormattedAssignment[]`, `onViewAll: () => void`
- **UI:** Card-based layout similar to tasks

#### QuickStatsSection
- **Purpose:** Display 4 key metrics
- **Responsibility:** Render completion %, overdue count, estimated hours, priority breakdown
- **Props:** `stats: DashboardStats`
- **UI:** 4-card grid layout with icons and values

#### QuickActionsSection
- **Purpose:** Provide rapid access to creation forms
- **Responsibility:** Render 3 action buttons with navigation links
- **Props:** None
- **UI:** Prominent button group, responsive stacking

### Component Interfaces (TypeScript)

```typescript
// Main Dashboard data structure
interface DashboardData {
  tasks: FormattedTask[]
  exams: FormattedExam[]
  assignments: FormattedAssignment[]
  stats: DashboardStats
  user: UserInfo
  lastRefreshTime: Date
}

// Formatted Task for display
interface FormattedTask {
  id: string
  title: string
  dueDate: string  // "MMM DD, YYYY"
  priority: 'low' | 'medium' | 'high'
  priorityLabel: string  // "High", "Medium", "Low"
  subjectName?: string
  status: 'todo' | 'in-progress' | 'completed'
}

// Formatted Exam for display
interface FormattedExam {
  id: string
  subjectName: string
  date: string  // "MMM DD, YYYY"
  time?: string  // "h:mm AM/PM"
  type: 'written' | 'oral' | 'practical'
}

// Formatted Assignment for display
interface FormattedAssignment {
  id: string
  title: string
  subjectName: string
  dueDate: string  // "MMM DD, YYYY"
  type: 'written' | 'presentation' | 'project'
}

// Statistics for display
interface DashboardStats {
  completionPercentage: number  // 0-100, integer
  completionPercentageLabel: string  // "72%"
  overdueCount: number
  estimatedHours: number  // decimal, 1 place
  estimatedHoursLabel: string  // "5.5 hrs"
  priorityBreakdown: {
    high: number
    medium: number
    low: number
  }
  priorityBreakdownLabel: string  // "3 High, 2 Medium, 1 Low"
}

// User info for personalization
interface UserInfo {
  id: string
  firstName: string
  email: string
}

// Welcome message type
interface WelcomeMessage {
  greeting: 'morning' | 'afternoon' | 'evening'
  greetingText: string  // "Good morning", "Good afternoon", "Good evening"
  currentDate: string  // "Tuesday, March 12, 2024"
}

// Error response type
interface DashboardError {
  code: string  // e.g., "FETCH_FAILED", "PERMISSION_DENIED"
  message: string
  isRetryable: boolean
}
```

---

## Data Models

### Database Schema (Supabase PostgreSQL)

The Dashboard queries existing tables that are created by the Activity Management feature:

#### Tasks (activities table, type = 'task')
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id),
  due_date TIMESTAMP,
  priority VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high'
  status VARCHAR(20) DEFAULT 'todo',  -- 'todo', 'in-progress', 'completed'
  estimated_time_minutes INT,
  type VARCHAR(20) NOT NULL,  -- 'task', 'exam', 'assignment'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for Dashboard queries
CREATE INDEX idx_activities_user_status 
  ON activities(user_id, status)
  WHERE type = 'task';

CREATE INDEX idx_activities_user_due_date 
  ON activities(user_id, due_date)
  WHERE type IN ('task', 'exam', 'assignment') 
  AND status != 'completed';
```

#### Exams (exams table)
```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  exam_date DATE NOT NULL,
  exam_time VARCHAR(5),  -- HH:mm format
  exam_type VARCHAR(20),  -- 'written', 'oral', 'practical'
  content TEXT[],  -- Array of topics
  location VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for Dashboard queries
CREATE INDEX idx_exams_user_date 
  ON exams(user_id, exam_date);
```

#### Assignments (assignments table)
```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMP NOT NULL,
  assignment_type VARCHAR(20),  -- 'written', 'presentation', 'project'
  criteria TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'submitted', 'graded'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for Dashboard queries
CREATE INDEX idx_assignments_user_due_date 
  ON assignments(user_id, due_date)
  WHERE status != 'submitted' AND status != 'graded';
```

#### Subjects (subjects table)
```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  color VARCHAR(7),  -- Hex color #RRGGBB
  professor VARCHAR(150),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index for joining with activities
CREATE INDEX idx_subjects_user_id 
  ON subjects(user_id);
```

### Row-Level Security Policies

```sql
-- Dashboard query must only see user's own data
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own activities"
  ON activities
  FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own exams"
  ON exams
  FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own assignments"
  ON assignments
  FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own subjects"
  ON subjects
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Data Retrieval Query

The Dashboard Server Action executes an optimized query that returns all necessary data:

```sql
-- Single query returns all dashboard data
SELECT 
  -- Tasks
  (SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'dueDate', due_date,
      'priority', priority,
      'subjectId', subject_id,
      'estimatedTimeMinutes', estimated_time_minutes,
      'status', status
    )
    ORDER BY due_date ASC
    LIMIT 5
  )
  FROM activities
  WHERE user_id = $1 
    AND type = 'task'
    AND status IN ('todo', 'in-progress')
  ) as pending_tasks,
  
  -- Exams within 14 days
  (SELECT json_agg(
    json_build_object(
      'id', id,
      'subjectId', subject_id,
      'date', exam_date,
      'time', exam_time,
      'type', exam_type
    )
    ORDER BY exam_date ASC
    LIMIT 5
  )
  FROM exams
  WHERE user_id = $1 
    AND exam_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
  ) as upcoming_exams,
  
  -- Assignments within 14 days
  (SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'subjectId', subject_id,
      'dueDate', due_date,
      'type', assignment_type,
      'status', status
    )
    ORDER BY due_date ASC
    LIMIT 5
  )
  FROM assignments
  WHERE user_id = $1 
    AND due_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '14 days'
    AND status NOT IN ('submitted', 'graded')
  ) as upcoming_assignments,
  
  -- Statistics calculations
  (SELECT json_build_object(
    'completionPercentage', 
      ROUND(
        CAST(COUNT(CASE WHEN status = 'completed' THEN 1 END) AS DECIMAL) 
        / NULLIF(COUNT(*), 0) * 100
      )::INT,
    'overdueCount',
      COUNT(CASE 
        WHEN due_date < CURRENT_DATE AND status != 'completed' 
        THEN 1 
      END),
    'estimatedHours',
      ROUND(
        COALESCE(SUM(estimated_time_minutes), 0)::DECIMAL / 60, 1
      )
  )
  FROM activities
  WHERE user_id = $1 
    AND status IN ('todo', 'in-progress')
    AND type = 'task'
  ) as statistics,
  
  -- Subject names for joins
  (SELECT json_object_agg(id, name)
  FROM subjects
  WHERE user_id = $1
  ) as subject_map;
```

---

## UI Layout & Styling

### Mobile Layout (< 768px)

```
┌──────────────────────────────────────┐
│  📱 Good Morning, Amanda!             │
│  Tuesday, March 12, 2024              │
├──────────────────────────────────────┤
│ ⚠️  You have 2 overdue items          │
├──────────────────────────────────────┤
│ PENDING TASKS                         │
│ ┌──────────────────────────────────┐ │
│ │ Study Chapter 3...               │ │
│ │ 🔴 High | Mar 14, 2024 | Math   │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Complete Exercises 2.1-2.5...    │ │
│ │ 🟡 Medium | Mar 15, 2024 | Math  │ │
│ └──────────────────────────────────┘ │
│ [View all pending tasks]              │
├──────────────────────────────────────┤
│ UPCOMING EXAMS                        │
│ ┌──────────────────────────────────┐ │
│ │ Physics Final                     │ │
│ │ Mar 20, 2024 at 2:00 PM          │ │
│ │ Type: Written                     │ │
│ └──────────────────────────────────┘ │
│ [View all exams]                      │
├──────────────────────────────────────┤
│ QUICK STATS                           │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ 📊 70%        │ │ ⏰ 12.5 hrs    │ │
│ │ Completed     │ │ Estimated     │ │
│ └───────────────┘ └───────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ ⏰ 2 Overdue  │ │ 3H 2M 1L      │ │
│ │ Activities    │ │ By Priority   │ │
│ └───────────────┘ └───────────────┘ │
├──────────────────────────────────────┤
│ QUICK ACTIONS                         │
│ [+ New Task                          ] │
│ [+ New Exam                          ] │
│ [+ New Assignment                    ] │
└──────────────────────────────────────┘
```

### Tablet Layout (768px - 1024px)

```
┌────────────────────────────────────────────────────┐
│  📱 Good Morning, Amanda!                           │
│  Tuesday, March 12, 2024                            │
├────────────────────────────────────────────────────┤
│ ⚠️  You have 2 overdue items                        │
├────────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────────┐ │
│ │ PENDING TASKS          │ │ UPCOMING EXAMS     │ │
│ │ ┌──────────────────┐   │ │ ┌────────────────┐ │ │
│ │ │ Study Chapter 3..│   │ │ │ Physics Final  │ │ │
│ │ │ 🔴 High | Mar 14 │   │ │ │ Mar 20 at 2 PM │ │ │
│ │ └──────────────────┘   │ │ └────────────────┘ │ │
│ │ [View all]             │ │ [View all]         │ │
│ └────────────────────────┘ └────────────────────┘ │
│ ┌────────────────────────┐ ┌────────────────────┐ │
│ │ UPCOMING ASSIGNMENTS   │ │ QUICK STATS        │ │
│ │ ┌──────────────────┐   │ │ ┌──────┐ ┌──────┐ │ │
│ │ │ Project Report   │   │ │ │ 70%  │ │12.5h │ │ │
│ │ │ Due Mar 18       │   │ │ │Compl │ │Est   │ │ │
│ │ └──────────────────┘   │ │ └──────┘ └──────┘ │ │
│ │ [View all]             │ │ ┌──────┐ ┌──────┐ │ │
│ └────────────────────────┘ │ │2 Over│ │3H 2ML│ │ │
│ ┌────────────────────────────┤ │due  │ │Prior │ │ │
│ │ QUICK ACTIONS              │ │ └──────┘ └──────┘ │ │
│ │ [+ New Task] [+ New Exam]  │ │                  │ │
│ │ [+ New Assignment]         │ └────────────────────┘ │
│ └────────────────────────────┘                        │
└────────────────────────────────────────────────────┘
```

### Desktop Layout (> 1024px)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📱 Good Morning, Amanda!                                            │
│  Tuesday, March 12, 2024                                             │
├─────────────────────────────────────────────────────────────────────┤
│ ⚠️  You have 2 overdue items [View overdue items]                    │
├─────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────┐ │
│ │ PENDING TASKS        │ │ UPCOMING EXAMS       │ │ QUICK STATS  │ │
│ │ ┌────────────────┐   │ │ ┌────────────────┐   │ │ ┌──────────┐ │ │
│ │ │ Study Ch 3     │   │ │ │ Physics Final  │   │ │ │ 70%    ✓ │ │
│ │ │ 🔴 High        │   │ │ │ Mar 20 2:00 PM │   │ │ │Completed │ │
│ │ │ Mar 14, Math   │   │ │ │ Written        │   │ │ └──────────┘ │ │
│ │ └────────────────┘   │ │ └────────────────┘   │ │ ┌──────────┐ │ │
│ │ ┌────────────────┐   │ │ ┌────────────────┐   │ │ │12.5 hrs  │ │
│ │ │ Exercises 2.1..│   │ │ │ Math Midterm   │   │ │ │Estimated │ │
│ │ │ 🟡 Medium      │   │ │ │ Mar 22 10 AM   │   │ │ └──────────┘ │ │
│ │ │ Mar 15, Math   │   │ │ │ Written        │   │ │ ┌──────────┐ │ │
│ │ └────────────────┘   │ │ └────────────────┘   │ │ │2 Overdue │ │
│ │ [View all tasks]     │ │ [View all exams]     │ │ └──────────┘ │ │
│ └──────────────────────┘ └──────────────────────┘ │ ┌──────────┐ │ │
│ ┌──────────────────────┐ ┌──────────────────────┐ │ │3H 2M 1L  │ │
│ │ UPCOMING ASSIGNMENTS │ │ QUICK ACTIONS        │ │ │By Prior. │ │
│ │ ┌────────────────┐   │ │                      │ │ └──────────┘ │ │
│ │ │ Project Report │   │ │ [+ New Task      ]   │ │              │ │
│ │ │ Due Mar 18     │   │ │ [+ New Exam      ]   │ │              │ │
│ │ │ Project        │   │ │ [+ New Assignment]   │ │              │ │
│ │ └────────────────┘   │ │                      │ │              │ │
│ │ ┌────────────────┐   │ └──────────────────────┘ │              │ │
│ │ │ Essay Draft    │   │                          │              │ │
│ │ │ Due Mar 20     │   │                          │              │ │
│ │ │ Written        │   │                          │              │ │
│ │ └────────────────┘   │                          │              │ │
│ │ [View all assign.]   │                          │              │ │
│ └──────────────────────┘                          │              │ │
└─────────────────────────────────────────────────────────────────────┘
```

### Color System

```
Priority Colors (Tasks):
- High Priority:   #EF4444 (red-500)
- Medium Priority: #F59E0B (amber-500)
- Low Priority:    #22C55E (green-500)

Activity Type Colors:
- Tasks:       #3B82F6 (blue-500)
- Exams:       #8B5CF6 (violet-500)
- Assignments: #EC4899 (pink-500)

Semantic Colors:
- Overdue Alert:      #DC2626 (red-600)
- Success/Completed:  #16A34A (green-600)
- Warning/Attention:  #F59E0B (amber-500)
- Info/Neutral:       #6B7280 (gray-500)

Status Indicators:
- Active/Current:  #3B82F6 (blue-500)
- Pending/Future:  #6B7280 (gray-400)
- Completed:       #10B981 (emerald-500)
- Overdue:         #DC2626 (red-600)

Backgrounds:
- Main Background:     #FFFFFF (white) / #F9FAFB (light gray - dark mode)
- Section Background:  #F3F4F6 (gray-100)
- Card Background:     #FFFFFF (white) with subtle shadow
- Header Background:   Linear gradient (subtle, brand-aligned)
```

### Tailwind CSS Classes

**Header Section:**
```tsx
<header className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-6 sm:px-6 md:py-8">
  <h1 className="text-3xl font-bold text-gray-900">Good morning, Amanda!</h1>
  <p className="mt-2 text-gray-600">Tuesday, March 12, 2024</p>
</header>
```

**Alert Banner:**
```tsx
<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
  <p className="text-red-800 font-semibold">
    You have 2 overdue items
  </p>
  <a href="/activities?filter=overdue" className="text-red-600 underline mt-1">
    View overdue items
  </a>
</div>
```

**Section Header:**
```tsx
<h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Tasks</h2>
```

**Task Card:**
```tsx
<div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
  <div className="flex items-start justify-between">
    <h3 className="font-medium text-gray-900 truncate flex-1">
      Study Chapter 3
    </h3>
    <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full flex-shrink-0" 
          aria-label="High priority"></span>
  </div>
  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
    <span>📅 Mar 14, 2024</span>
    <span className="text-gray-400">•</span>
    <span>🏷️ Math</span>
  </div>
</div>
```

**Stats Card:**
```tsx
<div className="bg-white rounded-lg p-4 border border-gray-200">
  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
  <div className="mt-2 flex items-baseline gap-2">
    <p className="text-3xl font-bold text-blue-600">70%</p>
  </div>
  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '70%' }}></div>
  </div>
</div>
```

**Action Button:**
```tsx
<a href="/activities/new" className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center">
  <span>+</span>
  <span>New Task</span>
</a>
```

**Loading State (Skeleton):**
```tsx
<div className="bg-white rounded-lg p-4 animate-pulse">
  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
  <div className="mt-3 h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

---

## Accessibility Features

### Semantic HTML Structure

```tsx
<main className="dashboard-main" role="main" aria-label="Dashboard home screen">
  <header className="dashboard-header">
    <h1 className="text-3xl font-bold">
      Welcome, <span className="text-blue-600">{firstName}</span>!
    </h1>
  </header>

  {overdueCount > 0 && (
    <section className="overdue-alert" role="region" aria-live="polite" aria-atomic="true">
      <h2 className="sr-only">Overdue alert</h2>
      {/* Alert content */}
    </section>
  )}

  <section className="pending-tasks-section" aria-labelledby="pending-heading">
    <h2 id="pending-heading">Pending Tasks</h2>
    <ul role="list" className="task-list">
      {tasks.map(task => (
        <li key={task.id} className="task-item">
          {/* Task content */}
        </li>
      ))}
    </ul>
  </section>

  <section className="quick-stats-section" aria-labelledby="stats-heading">
    <h2 id="stats-heading">Quick Statistics</h2>
    <div role="region" aria-label="Dashboard metrics" className="stats-grid">
      {/* Stats cards */}
    </div>
  </section>

  <section className="quick-actions-section" aria-labelledby="actions-heading">
    <h2 id="actions-heading">Quick Actions</h2>
    <nav aria-label="Create new activity options">
      {/* Action buttons */}
    </nav>
  </section>
</main>
```

### ARIA Labels and Descriptions

**Priority Badge:**
```tsx
<span 
  className={`priority-badge priority-${priority}`}
  aria-label={`${priorityLabel} priority`}
>
  {priorityLabel}
</span>
```

**Stats Card:**
```tsx
<div 
  className="stat-card"
  aria-label="Task completion rate"
>
  <p className="stat-label">Completion Rate</p>
  <p className="stat-value" aria-live="polite">70%</p>
  <div className="progress-bar" role="progressbar" aria-valuenow={70} aria-valuemin={0} aria-valuemax={100}></div>
</div>
```

**View All Link:**
```tsx
<a 
  href="/activities?filter=pending"
  className="view-all-link"
  aria-label="View all 12 pending tasks"
>
  View all ({totalCount})
</a>
```

### Keyboard Navigation

- **Tab key:** Navigate through all interactive elements in logical order
  - Header → Overdue alert → Pending tasks → Exams → Assignments → Stats → Actions
- **Enter/Space:** Activate buttons and links
- **Skip link:** Hidden skip-to-main-content link at top of page
- **Focus visible:** All focused elements have visible 3px outline

### Screen Reader Support

- Empty state messages announced: "No pending tasks. Great job!"
- Dynamic updates announced via `aria-live="polite"` on stat cards
- Section purpose announced through h2 headings and aria-labelledby
- Time-based greeting context provided ("Good morning" = 5 AM - 12 PM)

### Color + Text Redundancy

All color-coded information includes text labels:
- Priority: Color dot + "High"/"Medium"/"Low" text
- Status: Color indicator + status text
- Metrics: Color background + numeric value

### Contrast Compliance

- Text on backgrounds: 4.5:1 contrast ratio (WCAG AA)
- Interactive elements: 3:1 minimum contrast
- Color palette tested with WCAG contrast checker

---

## Performance Optimizations

### Code Splitting

**Dashboard bundle structure:**
```
- DashboardPage.tsx           (main entry, ~5KB)
  ├── DashboardHeader.tsx     (lazy loaded, ~2KB)
  ├── OverdueAlert.tsx        (lazy loaded, ~1KB)
  ├── PendingTasksSection.tsx (lazy loaded, ~3KB)
  ├── UpcomingExamsSection.tsx (lazy loaded, ~2KB)
  ├── UpcomingAssignmentsSection.tsx (lazy loaded, ~2KB)
  ├── QuickStatsSection.tsx   (lazy loaded, ~3KB)
  ├── QuickActionsSection.tsx (lazy loaded, ~1KB)
  └── hooks/useDashboardData.ts (shared, ~4KB)

Total dashboard component bundle: ~25KB (before gzip)
Gzipped: ~8KB
```

**Lazy Loading Implementation:**
```typescript
import dynamic from 'next/dynamic'

const OverdueAlert = dynamic(() => import('./OverdueAlert'), {
  loading: () => <div className="h-12 bg-gray-100 animate-pulse" />,
  ssr: false
})

const QuickStatsSection = dynamic(() => import('./QuickStatsSection'), {
  loading: () => <div className="h-40 bg-gray-100 animate-pulse" />
})
```

### Query Optimization

**Single query design:**
- All Dashboard data fetched in 1 database query (no N+1 problems)
- Query uses PostgreSQL aggregation functions for calculations
- Subqueries return limited datasets (max 5 items per section)
- Indexes on (user_id, status), (user_id, due_date) for fast filtering

**Query performance target:**
- Query execution: < 100ms
- Network round-trip: < 500ms
- Total fetch time: < 1 second

### Image & Icon Optimization

**Icons:**
- Use Lucide React icons (lightweight, tree-shakeable)
- Icons included inline, no separate icon files
- Font-based icons for priority/status indicators

**Images:**
- None by default (typography-first design)
- If background images added, use Next.js Image component with:
  ```typescript
  <Image
    src="/header-gradient.png"
    alt=""
    fill
    className="object-cover"
    priority={false}
  />
  ```

### Caching Strategy

**Browser Cache:**
- Dashboard data cached for 5 minutes in memory
- Service Worker caches HTML/CSS/JS for 1 hour
- Cache invalidates on manual refresh or inactivity > 5 minutes

**Offline Cache (Service Worker):**
- Cache data for 1 hour
- Last updated timestamp displayed: "Last updated: 2 hours ago"
- Auto-purges expired cache daily

---

## Error Handling & Edge Cases

### No Data Scenarios

**Scenario 1: First-time user (no activities created)**
```
┌──────────────────────────────────┐
│ Welcome, Amanda!                 │
│ Tuesday, March 12, 2024          │
├──────────────────────────────────┤
│ PENDING TASKS                    │
│ ✅ No pending tasks. Great job!  │
│                                  │
│ UPCOMING EXAMS                   │
│ ✅ No upcoming exams. You're     │
│    all set!                      │
│                                  │
│ QUICK STATS                      │
│ 0% Completed | 0 Overdue | 0 hrs │
│                                  │
│ QUICK ACTIONS                    │
│ [+ New Task] [+ New Exam]...     │
└──────────────────────────────────┘
```

**Scenario 2: All activities completed**
```
│ PENDING TASKS                    │
│ ✅ No pending tasks. Great job!  │
│                                  │
│ QUICK STATS                      │
│ 100% Completed | 0 Overdue       │
└──────────────────────────────────┘
```

### Network Failures

**Initial Load Fails:**
```
┌──────────────────────────────────┐
│ Dashboard                        │
├──────────────────────────────────┤
│                                  │
│ ❌ Could not load dashboard      │
│                                  │
│ [Retry] [View Offline Cache]     │
│                                  │
└──────────────────────────────────┘
```

**Refresh Fails (with partial data):**
```
┌──────────────────────────────────┐
│ [✓ Last loaded 2 minutes ago]    │
│                                  │
│ ⚠️  Could not refresh            │
│ [Retry]                          │
│                                  │
│ [Display cached data below...]   │
└──────────────────────────────────┘
```

**Action Button Error (while viewing Dashboard):**
```
User clicks "+ New Task" while offline:
┌──────────────────────────────────┐
│ 🔓 Offline                       │
│                                  │
│ Cannot create activities offline. │
│ Please reconnect to continue.    │
│ [OK]                             │
└──────────────────────────────────┘
```

### Offline Mode Handling

**Offline Indicators:**
- Subtle "Offline - Last updated: 2 hours ago" banner at top
- Quick Action buttons disabled with tooltip: "Not available offline"
- Cached data displayed with visual distinction (e.g., slightly dimmed)

**Offline Behavior:**
- Dashboard displays last cached version
- Manual refresh shows "Unable to refresh - no internet connection"
- Auto-refresh suspended in offline mode
- When connectivity restored, automatic refresh triggers

### Stale Data Indicators

**Timestamp Display:**
- Always show last update time: "Last updated: just now" | "2 minutes ago" | "30 minutes ago"
- Format: Relative time using date-fns `formatDistanceToNow()`

```tsx
<p className="text-xs text-gray-500">
  Last updated: {formatDistanceToNow(lastRefreshTime, { addSuffix: true })}
</p>
```

### Error Recovery

**Retry Logic:**
```typescript
const handleRetry = async () => {
  setIsLoading(true)
  setError(null)
  try {
    const data = await getDashboardData()
    setDashboardData(data)
  } catch (err) {
    setError({
      code: 'FETCH_FAILED',
      message: 'Failed to load dashboard. Please try again.',
      isRetryable: true
    })
  } finally {
    setIsLoading(false)
  }
}
```

**Graceful Degradation:**
- If stats calculation fails, show "Unable to calculate" instead of breaking layout
- If subject names unavailable, show subject IDs or "Unknown Subject"
- If dates malformed, show date format "Invalid Date" (visible to help debug)

---

## Integration Points

### Navigation & Link Structure

**From Dashboard to Activity List:**
```
Dashboard → Pending Tasks "View all" link → /activities?status=pending&sort=due_date
Dashboard → Upcoming Exams "View all" link → /activities?type=exam&date_range=14d
Dashboard → Overdue Alert "View overdue" link → /activities?status=overdue
```

**From Dashboard to Creation Forms:**
```
Dashboard → "+ New Task" button → /activities/new?type=task
Dashboard → "+ New Exam" button → /activities/new?type=exam
Dashboard → "+ New Assignment" button → /activities/new?type=assignment
```

**From Dashboard to Settings:**
```
Dashboard → Notification preferences link → /settings/notifications
```

### URL Structure

**Dashboard Route:**
```
GET /dashboard
  - Primary entry point
  - Server Action: getDashboardData()
  - Requires authenticated session
```

**Activity Creation Routes:**
```
GET /activities/new?type=task
GET /activities/new?type=exam
GET /activities/new?type=assignment
```

**Activity List with Filters:**
```
GET /activities?status=pending&sort=due_date
GET /activities?type=exam&date_range=14d
GET /activities?status=overdue
```

### Data Sync & Real-Time Updates (Future)

**Supabase Real-Time Subscriptions (Post-MVP):**
```typescript
// Listen for activity changes
const subscription = supabase
  .from('activities')
  .on('*', payload => {
    // Invalidate cache and refresh Dashboard
    updateDashboardCache()
  })
  .subscribe()

// Cleanup on unmount
useEffect(() => {
  return () => {
    subscription?.unsubscribe()
  }
}, [])
```

This enables push-based updates instead of polling, improving real-time responsiveness.


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Pending Tasks Display

For any user with pending tasks (status = 'todo' or 'in-progress'), the Dashboard SHALL display those tasks in the Pending Tasks section, limited to 5 items, sorted by due date in ascending order.

**Validates: Requirements 1.2, 1.3**

### Property 2: Pending Tasks Completeness

For any pending task belonging to the user, if it is fetched from the database, the Dashboard SHALL display it with all required fields: title, due date, priority level, and subject name (if available).

**Validates: Requirements 1.4**

### Property 3: View All Link for Pending Tasks

For any Dashboard state, if the count of pending tasks exceeds 5, the Pending Tasks section SHALL display a "View All" link. If the count is ≤ 5, the link SHALL NOT display.

**Validates: Requirements 1.5**

### Property 4: Task Status Removal on Completion

For any completed task (status = 'completed'), when the Dashboard is refreshed, that task SHALL no longer appear in the Pending Tasks section.

**Validates: Requirements 1.7**

### Property 5: Upcoming Exams Date Filtering

For any exam belonging to the user, an exam SHALL appear in the Upcoming Exams section if and only if its date falls between today (inclusive) and today + 14 days (inclusive).

**Validates: Requirements 2.2**

### Property 6: Upcoming Exams Display

For any user with upcoming exams (within 14 days), the Dashboard SHALL display those exams in the Upcoming Exams section, limited to 5 items, sorted by date in ascending order.

**Validates: Requirements 2.2, 2.3**

### Property 7: Upcoming Exams Completeness

For any upcoming exam, the Dashboard SHALL display it with all required fields: exam subject name, exam date, exam time (if available), and exam type.

**Validates: Requirements 2.4**

### Property 8: Upcoming Assignments Date Filtering

For any assignment belonging to the user, an assignment SHALL appear in the Upcoming Assignments section if and only if its due date falls between today (inclusive) and today + 14 days (inclusive), and its status is not 'submitted' or 'graded'.

**Validates: Requirements 3.2**

### Property 9: Upcoming Assignments Display

For any user with upcoming assignments (within 14 days), the Dashboard SHALL display those assignments in the Upcoming Assignments section, limited to 5 items, sorted by due date in ascending order.

**Validates: Requirements 3.2, 3.3**

### Property 10: Completion Percentage Calculation

For any user, the completion percentage displayed on the Dashboard SHALL equal (count of tasks with status 'completed') / (total count of tasks) * 100, rounded to the nearest integer. For zero total tasks, completion percentage SHALL be 0%.

**Validates: Requirements 4.2, 4.7**

### Property 11: Overdue Count Calculation

For any user, the overdue count displayed on the Dashboard SHALL equal the count of all activities (tasks, exams, assignments) where due date < today AND status != 'completed'.

**Validates: Requirements 4.3**

### Property 12: Estimated Hours Calculation

For any user, the estimated hours displayed on the Dashboard SHALL equal the sum of all pending task estimated times in minutes, divided by 60, and rounded to 1 decimal place. If sum is 0, display SHALL be "0 hrs estimated".

**Validates: Requirements 4.4, 4.8**

### Property 13: Priority Breakdown Accuracy

For any user, the priority breakdown displayed on the Dashboard SHALL show the exact count of pending tasks with high priority, medium priority, and low priority, formatted as "X High, Y Medium, Z Low".

**Validates: Requirements 4.5**

### Property 14: Stats Section Updates on Refresh

For any Dashboard state, when data is refreshed and underlying activity data changes, the Quick Statistics section metrics SHALL update to reflect the new calculations.

**Validates: Requirements 4.6**

### Property 15: Overdue Alert Display Conditional

For any Dashboard state, an overdue alert banner SHALL display if and only if the overdue count > 0. When overdue count = 0, the banner SHALL NOT display.

**Validates: Requirements 6.1, 6.5**

### Property 16: Overdue Alert Count Accuracy

For any Dashboard state with overdue activities, the overdue alert banner text SHALL contain the exact count of overdue items (e.g., "You have 2 overdue items").

**Validates: Requirements 6.2**

### Property 17: Overdue Alert Updates After Completion

For any user with overdue activities, when an overdue activity is marked as completed and the Dashboard is refreshed, the overdue alert count SHALL decrease by 1 (or the banner SHALL disappear if count reaches 0).

**Validates: Requirements 6.6**

### Property 18: Welcome Message Personalization

For any user, the Dashboard header SHALL display a welcome message containing the user's first name retrieved from the authenticated user context.

**Validates: Requirements 7.2**

### Property 19: Time-Based Greeting Accuracy

For any Dashboard load, the greeting displayed in the header SHALL be "Good morning" if current hour is 5-11, "Good afternoon" if current hour is 12-17, and "Good evening" if current hour is 18-4.

**Validates: Requirements 7.3**

### Property 20: Date Formatting Consistency

For any date displayed on the Dashboard (due dates, exam dates, etc.), the format SHALL be "MMM DD, YYYY" (e.g., "Mar 15, 2024").

**Validates: Requirements 14.1**

### Property 21: Time Formatting Consistency

For any time displayed on the Dashboard (exam time, etc.), the format SHALL be "h:mm AM/PM" (e.g., "2:30 PM").

**Validates: Requirements 14.2**

### Property 22: Hours Formatting with Decimal

For any estimated hours value displayed on the Dashboard, the format SHALL be rounded to exactly 1 decimal place (e.g., "5.5 hrs").

**Validates: Requirements 14.3**

### Property 23: Percentage Formatting with Symbol

For any completion percentage displayed on the Dashboard, the format SHALL be an integer followed by % symbol (e.g., "72%").

**Validates: Requirements 14.4**

### Property 24: Priority Label Formatting

For any priority level displayed on the Dashboard, the text SHALL be "High", "Medium", or "Low" based on the underlying priority value.

**Validates: Requirements 14.5**

### Property 25: Title Truncation at 60 Characters

For any task, exam, or assignment title displayed on the Dashboard that exceeds 60 characters, the displayed text SHALL be truncated to 60 characters with an ellipsis appended (e.g., "Study Chapter 3: Advanced Topics in...").

**Validates: Requirements 14.6**

### Property 26: Subject Name Truncation at 30 Characters

For any subject name displayed on the Dashboard that exceeds 30 characters, the displayed text SHALL be truncated to 30 characters with an ellipsis appended.

**Validates: Requirements 14.7**

### Property 27: Responsive Mobile Layout

For any Dashboard viewed on a mobile viewport (< 768px width), the layout SHALL display all sections in a single-column stack with no horizontal overflow.

**Validates: Requirements 9.1**

### Property 28: Responsive Tablet Layout

For any Dashboard viewed on a tablet viewport (768px - 1024px width), the layout SHALL display sections in a two-column grid arrangement.

**Validates: Requirements 9.2**

### Property 29: Responsive Desktop Layout

For any Dashboard viewed on a desktop viewport (> 1024px width), the layout SHALL display sections in a multi-column responsive grid appropriate to available space.

**Validates: Requirements 9.3**

### Property 30: Mobile Button Stacking

For any Dashboard viewed on a mobile viewport, the Quick Actions buttons SHALL stack vertically and occupy full width of their container.

**Validates: Requirements 9.5**

### Property 31: Semantic HTML Heading Hierarchy

For any Dashboard, all major sections (Pending Tasks, Upcoming Exams, etc.) SHALL have associated heading elements (h2 or h3) creating a logical content hierarchy with h1 at page level.

**Validates: Requirements 10.1, 10.2**

### Property 32: Keyboard Navigation Support

For any Dashboard, all interactive elements (buttons, links, sections) SHALL be reachable and activatable using Tab, Enter, and Space keys in a logical tab order.

**Validates: Requirements 10.3**

### Property 33: Descriptive Link Labels

For any "View All" link on the Dashboard, the link text or aria-label SHALL contain descriptive language indicating what is being viewed (e.g., "View all pending tasks").

**Validates: Requirements 10.9**

### Property 34: Data Retrieval Single Query

For any Dashboard load, the server action `getDashboardData()` SHALL execute exactly one database query returning all required data (pending tasks, upcoming exams, upcoming assignments, statistics).

**Validates: Requirements 13.1, 13.3, 11.3**

### Property 35: Data Retrieval Query Performance

For any Dashboard data retrieval request, the database query execution time SHALL be less than 1 second.

**Validates: Requirements 13.7**

### Property 36: Data Retrieval RLS Enforcement

For any user accessing the Dashboard, the database query SHALL only return data where user_id matches the authenticated user's ID through Supabase Row-Level Security policies.

**Validates: Requirements 13.2**

### Property 37: Round-Trip Data Integrity

For any activity data fetched, formatted for display, and then re-fetched from storage, the original raw data and re-fetched raw data SHALL match exactly (excluding display formatting).

**Validates: Requirements 15.1, 15.5**

### Property 38: Offline Data Display

For any offline Dashboard access, the last cached version of the data SHALL display, retrieved from Service Worker cache or browser storage.

**Validates: Requirements 12.1**

### Property 39: Offline Indicator Display

For any Dashboard displayed in offline mode, a subtle offline indicator (e.g., "Offline - Last updated: 2 hours ago") SHALL display to inform the user of offline status.

**Validates: Requirements 12.2**

### Property 40: Offline Action Buttons Disabled

For any Dashboard displayed in offline mode, all Quick Actions buttons (+ New Task, + New Exam, + New Assignment) SHALL be disabled and a tooltip explaining offline limitation SHALL display on hover/focus.

**Validates: Requirements 12.3**

### Property 41: Auto-Refresh After Inactivity

For any Dashboard viewed for more than 5 minutes without user interaction, the Dashboard data SHALL automatically refresh to fetch the latest information.

**Validates: Requirements 8.4**

### Property 42: Empty State Messaging

For any section on the Dashboard with no items to display (e.g., no pending tasks), a descriptive empty state message SHALL display (e.g., "No pending tasks. Great job!").

**Validates: Requirements 1.6, 2.6, 3.6, 10.5**

---

## Error Handling

### Data Retrieval Errors

**Scenario:** Database query fails (timeout, connection loss, permission denied)

```
Response Structure:
{
  success: false,
  error: {
    code: "FETCH_FAILED",
    message: "Unable to load dashboard. Please check your connection.",
    isRetryable: true
  },
  data: null
}
```

**User Experience:**
- Display error banner at top: "❌ Could not load dashboard"
- Show retry button
- If offline cache exists, offer "View Offline Data" button
- Log error to monitoring service

### Refresh Failures (Partial Data)

**Scenario:** User has old data cached, refresh attempt fails

**Response:**
```
Display existing cached data with:
- "⚠️  Could not refresh - last updated 30 minutes ago"
- Retry button
- Implicit success if user navigates away/returns later
```

### RLS Policy Violations

**Scenario:** User attempts unauthorized data access (should not happen in normal flow)

```
Response: 
{
  success: false,
  error: {
    code: "PERMISSION_DENIED",
    message: "Not authorized to access this data",
    isRetryable: false
  }
}
```

**Action:** Log out user, redirect to login

### Calculation Errors

**Scenario:** Stats calculation fails (SQL error, NaN from division by zero)

```
Fallback Display:
- Completion: "Unable to calculate"
- Overdue: "0" (safe default)
- Estimated hours: "0 hrs"
- Priority breakdown: "0 High, 0 Medium, 0 Low"
```

### Format String Errors

**Scenario:** Invalid date format causes pretty printer to fail

```
Display: 
- Task: "Study Chapter 3" (title ok) + "Invalid Date" (for due date)
- This makes error visible to help debug while not breaking layout
```

### Offline-Specific Errors

**Scenario:** User clicks "+ New Task" while offline

```
Display Modal:
├─ 🔓 Offline
├─ "Cannot create activities while offline"
├─ "Please reconnect to continue"
└─ [OK button]
```

---

## Testing Strategy

### Unit Tests (Vitest)

**Test Files:**
```
__tests__/features/dashboard/
├── domain/
│   ├── dashboardRules.test.ts
│   └── calculation.test.ts
├── application/
│   └── formatDashboardData.test.ts
├── presentation/
│   ├── DashboardHeader.test.tsx
│   ├── PendingTasksSection.test.tsx
│   ├── QuickStatsSection.test.tsx
│   └── DashboardPage.test.tsx
└── utils/
    └── dateFormatting.test.ts
```

**Key Tests:**

1. **formatDashboardData()** - Pretty Printer
   - Test date formatting: `"Mar 15, 2024"`
   - Test time formatting: `"2:30 PM"`
   - Test hours rounding: `"5.5 hrs"`
   - Test title truncation: `> 60 chars → ellipsis`
   - Test priority mapping: `'high' → "High"`

2. **Calculation Tests**
   - Completion %: `14 / 20 * 100 = 70%`
   - Overdue count: `Activities with due < today AND status != 'completed'`
   - Estimated hours: `Sum of pending task minutes / 60, rounded to 1 decimal`
   - Priority breakdown: Count by priority level

3. **Component Tests**
   - DashboardHeader: User name, greeting, date display
   - PendingTasksSection: Task rendering, limit to 5, sorting
   - QuickStatsSection: Stats card rendering, values
   - OverdueAlert: Conditional display based on count

4. **Date/Time Tests**
   - Time-of-day greeting: Morning (5-11), Afternoon (12-17), Evening (18-4)
   - Locale-specific formatting

### Property-Based Tests (fast-check)

Each property from the design document is implemented as a single property-based test:

```
features/dashboard/tests/properties/

Property 1: PendingTasksDisplay.test.ts
  - Generate: Random user ID, 2-8 pending tasks with various due dates
  - Verify: Dashboard shows ≤5 tasks, sorted by due date
  - Tag: Feature: dashboard-home, Property 1: Pending Tasks Display
  - Iterations: 100+

Property 2: PendingTasksCompleteness.test.ts
  - Generate: Random pending tasks
  - Verify: Each task shows title, due date, priority, subject
  - Tag: Feature: dashboard-home, Property 2: Pending Tasks Completeness
  - Iterations: 100+

Property 5: UpcomingExamsDateFiltering.test.ts
  - Generate: Exams with dates before today, within 14 days, after 14 days
  - Verify: Only exams within 14 days appear in section
  - Tag: Feature: dashboard-home, Property 5: Upcoming Exams Date Filtering
  - Iterations: 100+

Property 10: CompletionPercentageCalculation.test.ts
  - Generate: Random task counts (0-100 total, 0-total completed)
  - Verify: Percentage = completed/total * 100, rounded to integer
  - Tag: Feature: dashboard-home, Property 10: Completion Percentage Calculation
  - Iterations: 100+

Property 18: WelcomeMessagePersonalization.test.ts
  - Generate: Random user first names
  - Verify: Header displays correct user name
  - Tag: Feature: dashboard-home, Property 18: Welcome Message Personalization
  - Iterations: 100+

Property 20: DateFormattingConsistency.test.ts
  - Generate: Random valid dates across different years/months
  - Verify: All dates formatted as "MMM DD, YYYY"
  - Tag: Feature: dashboard-home, Property 20: Date Formatting Consistency
  - Iterations: 100+

Property 27: ResponsiveMobileLayout.test.tsx
  - Generate: Random dashboard data
  - Test: Render at 360px, 480px, 768px viewports
  - Verify: Single column layout, no overflow at < 768px
  - Tag: Feature: dashboard-home, Property 27: Responsive Mobile Layout
  - Iterations: 100+

Property 37: RoundTripDataIntegrity.test.ts
  - Generate: Random dashboard activities (tasks, exams, assignments)
  - Process: Fetch → Format → Re-fetch
  - Verify: Original and re-fetched raw data match exactly
  - Tag: Feature: dashboard-home, Property 37: Round-Trip Data Integrity
  - Iterations: 100+

[Continue for all 42 properties...]
```

### Integration Tests (Vitest + Mock Database)

**Test Files:**
```
__tests__/features/dashboard/integration/

getDashboardData.test.ts
  - Mock Supabase client
  - Mock 50 activities (tasks, exams, assignments)
  - Verify single query execution
  - Verify correct data filtering and calculations
  - Verify < 1 second execution

formatAndRoundTrip.test.ts
  - Test: Fetch data → Format → Store → Re-fetch
  - Verify: No data mutation during formatting
  - Verify: All calculated values are accurate
```

### Component Tests (React Testing Library)

```
__tests__/features/dashboard/components/

DashboardPage.test.tsx
  - Test: Component mounts, data loads, sections render
  - Test: Refresh button triggers data reload
  - Test: Error state displays with retry
  - Test: Offline mode displays cached data

PendingTasksSection.test.tsx
  - Test: Renders task list with up to 5 items
  - Test: "View All" link shows when count > 5
  - Test: Empty state message when no tasks
  - Test: Tasks sorted by due date
  
QuickActionsSection.test.tsx
  - Test: Three buttons render and are accessible
  - Test: Buttons disabled in offline mode
  - Test: Navigation links correct
```

### E2E Tests (Playwright)

```
e2e/specs/dashboard.spec.ts

Test 1: Dashboard loads with user data
  - Login as test user
  - Navigate to /dashboard
  - Verify all sections render within 2 seconds
  - Verify data is present

Test 2: Refresh updates data
  - Create new task via API
  - Click refresh button on dashboard
  - Verify new task appears in pending tasks

Test 3: Offline support
  - Load dashboard with data
  - Simulate offline (DevTools)
  - Verify cached data displays
  - Verify offline indicator shows
  - Verify Quick Action buttons disabled

Test 4: Responsive layout
  - Load dashboard at mobile (375px)
  - Verify single-column layout
  - Load at tablet (800px)
  - Verify two-column layout
  - Load at desktop (1920px)
  - Verify multi-column layout

Test 5: Keyboard navigation
  - Tab through all interactive elements
  - Verify focus visible on each
  - Activate buttons with Enter/Space
  - Verify navigation works
```

### Accessibility Testing (axe)

```
__tests__/features/dashboard/accessibility/

accessibility.test.tsx
  - Run axe audit on mounted Dashboard
  - Verify no accessibility violations
  - Verify contrast ratios WCAG AA
  - Verify semantic HTML structure
  - Verify ARIA labels present

keyboard.test.tsx
  - Tab through all interactive elements
  - Verify logical tab order
  - Verify focus indicators visible
  - Verify no keyboard traps
```

### Performance Testing

```
e2e/specs/dashboard.performance.spec.ts

Test 1: Initial Load Performance
  - Navigate to /dashboard cold
  - Measure First Contentful Paint
  - Verify < 2 seconds
  - Measure Time to Interactive
  - Verify < 3 seconds
  - Measure bundle size
  - Verify < 50KB (gzipped)

Test 2: Subsequent Load Performance
  - Load dashboard, leave page
  - Return to dashboard
  - Measure load time with warm cache
  - Verify < 500ms
```

### Database Query Testing (pgtap)

```
supabase/tests/dashboard_queries.pgsql

Test 1: Single query returns all sections
  - Execute getDashboardData query
  - Verify returns pending tasks, exams, assignments, stats
  - Verify execution < 1 second

Test 2: RLS policies enforce user filtering
  - Create test data for multiple users
  - Query as User A
  - Verify only User A's data returned
```

---

## Implementation Checklist

### Phase 1: Core Components & Data Layer
- [ ] `DashboardPage` component scaffold
- [ ] `getDashboardData` Server Action
- [ ] `formatDashboardData` utility function
- [ ] Database queries and indexes created
- [ ] RLS policies configured

### Phase 2: UI Components
- [ ] `DashboardHeader` with greeting and date
- [ ] `PendingTasksSection` with cards and "View All"
- [ ] `UpcomingExamsSection` with cards and "View All"
- [ ] `UpcomingAssignmentsSection` with cards and "View All"
- [ ] `QuickStatsSection` with 4 metric cards
- [ ] `QuickActionsSection` with 3 buttons
- [ ] `OverdueAlert` banner (conditional)

### Phase 3: Styling & Responsiveness
- [ ] Tailwind CSS classes applied
- [ ] Mobile layout tested (< 768px)
- [ ] Tablet layout tested (768-1024px)
- [ ] Desktop layout tested (> 1024px)
- [ ] Touch targets at 44px minimum on mobile

### Phase 4: Accessibility
- [ ] Semantic HTML with proper heading hierarchy
- [ ] ARIA labels and descriptions added
- [ ] Keyboard navigation tested
- [ ] Color + text redundancy verified
- [ ] Contrast ratios meet WCAG AA
- [ ] Screen reader tested

### Phase 5: Performance
- [ ] Code splitting for lazy components
- [ ] Single database query verified
- [ ] Query indexes created
- [ ] Bundle size < 50KB (gzipped)
- [ ] First Contentful Paint < 2 seconds
- [ ] Time to Interactive < 3 seconds

### Phase 6: Offline Support
- [ ] Service Worker caching configured
- [ ] Offline cache display implemented
- [ ] Offline indicator added
- [ ] Quick Action buttons disabled offline
- [ ] Auto-refresh on reconnection

### Phase 7: Error Handling
- [ ] Error messages implemented
- [ ] Retry logic added
- [ ] Fallback displays for failed calculations
- [ ] Edge case handling (no data, network failures)

### Phase 8: Testing
- [ ] Unit tests for utilities and calculations
- [ ] Property-based tests for all 42 properties
- [ ] Component tests for all sections
- [ ] Integration tests for data layer
- [ ] E2E tests for critical workflows
- [ ] Accessibility tests passing
- [ ] Performance tests passing

---

## Success Criteria Summary

### Functional
✓ Dashboard displays 5 sections: Pending Tasks, Upcoming Exams, Assignments, Stats, Quick Actions  
✓ All data displays with consistent formatting  
✓ "View All" links appear when data exceeds limits  
✓ Overdue alert appears with correct count  
✓ Welcome header with personalized greeting  
✓ All calculations (completion %, overdue, hours) are accurate  

### Performance
✓ Initial load < 2 seconds (FCP)  
✓ Time to Interactive < 3 seconds  
✓ Cached load < 500ms  
✓ Single database query  
✓ Bundle size < 50KB (gzipped)  

### Responsive
✓ Mobile (< 768px): Single-column stack  
✓ Tablet (768-1024px): Two-column grid  
✓ Desktop (> 1024px): Multi-column layout  
✓ No horizontal overflow on any device  

### Accessibility
✓ Semantic HTML with proper heading hierarchy  
✓ Keyboard navigation fully functional  
✓ Screen reader support verified  
✓ Contrast ratios WCAG AA  
✓ ARIA labels present and descriptive  

### Offline
✓ Cached data displays offline  
✓ Offline indicator shows  
✓ Quick Actions disabled offline  
✓ Auto-refresh on reconnection  

### Data Integrity
✓ Round-trip data unchanged after formatting  
✓ All calculations correct  
✓ RLS policies enforce user filtering  
✓ No data loss or mutation

