# Implementation Plan: Dashboard Home Screen

## Overview

The Dashboard implementation follows a layered architecture: database infrastructure → data retrieval → UI components → styling → accessibility → performance optimization → offline support → comprehensive testing. Each task builds on previous work, with testing tasks embedded close to implementation to catch issues early.

---

## Tasks

### Phase 1: Core Infrastructure & Data Layer

- [x] 1. Set up database schema and indexes for Dashboard queries
  - Create activities table with indexes on (user_id, status) and (user_id, due_date) if not already present
  - Create exams table with index on (user_id, exam_date) if not already present
  - Create assignments table with index on (user_id, due_date) if not already present
  - Create subjects table with index on user_id if not already present
  - Verify all tables have proper foreign key relationships and cascading deletes
  - **Skills utilizadas:** `database-queries` - Create performance indices on activities, exams, assignments for efficient query execution.
  - _Requirements: 1.1, 2.1, 3.1, 13.1_

- [x] 2. Configure Row-Level Security (RLS) policies for Dashboard data access
  - Enable RLS on activities, exams, assignments, and subjects tables
  - Create RLS policies for activities: "Users see own activities"
  - Create RLS policies for exams: "Users see own exams"
  - Create RLS policies for assignments: "Users see own assignments"
  - Create RLS policies for subjects: "Users see own subjects"
  - Test RLS enforcement with different user accounts
  - **Skills utilizadas:** `database-queries` - Implement RLS policies for data isolation and cross-user protection.
  - _Requirements: 13.2, 13.3_

- [x] 3. Create getDashboardData Server Action
  - Implement Server Action in src/features/dashboard/presentation/actions/getDashboardData.ts
  - Single optimized database query fetching: pending tasks (max 5), upcoming exams (14-day window, max 5), upcoming assignments (14-day window, max 5), statistics (completion %, overdue count, estimated hours)
  - Include subject name mapping for display
  - Add error handling with meaningful error messages
  - Return structured response with {success, data, error} format
  - **Skills utilizadas:** `fetching-data` - Implement optimized Server Action for dashboard data retrieval with error handling.
  - _Requirements: 13.1, 13.3, 13.7_

  - [x]* 3.1 Write property test for getDashboardData query performance
    - **Property 35: Data Retrieval Query Performance**
    - **Validates: Requirements 13.7**

  - [x]* 3.2 Write property test for RLS enforcement
    - **Property 36: Data Retrieval RLS Enforcement**
    - **Validates: Requirements 13.2**

- [x] 4. Create formatDashboardData utility function (Pretty Printer)
  - Implement in src/features/dashboard/application/formatDashboardData.ts
  - Format all dates as "MMM DD, YYYY" (e.g., "Mar 15, 2024")
  - Format all times as "h:mm AM/PM" (e.g., "2:30 PM")
  - Format estimated hours with 1 decimal place (e.g., "5.5 hrs")
  - Format completion percentage as integer with % (e.g., "72%")
  - Format priority levels as "High", "Medium", "Low"
  - Truncate titles > 60 chars with ellipsis
  - Truncate subject names > 30 chars with ellipsis
  - Return typed DashboardData interface with all formatted fields
  - **Skills utilizadas:** `property-testing` - Use property-based tests to validate date/time formatting consistency across locales and edge cases.
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x]* 4.1 Write property test for date formatting
    - **Property 20: Date Formatting Consistency**
    - **Validates: Requirements 14.1**

  - [x]* 4.2 Write property test for time formatting
    - **Property 21: Time Formatting Consistency**
    - **Validates: Requirements 14.2**

  - [x]* 4.3 Write property test for hours formatting
    - **Property 22: Hours Formatting with Decimal**
    - **Validates: Requirements 14.3**

  - [x]* 4.4 Write property test for title truncation
    - **Property 25: Title Truncation at 60 Characters**
    - **Validates: Requirements 14.6**

  - [x]* 4.5 Write property test for subject name truncation
    - **Property 26: Subject Name Truncation at 30 Characters**
    - **Validates: Requirements 14.7**

  - [x]* 4.6 Write property test for round-trip data integrity
    - **Property 37: Round-Trip Data Integrity**
    - **Validates: Requirements 15.1, 15.5**

### Phase 2: Core UI Components

- [x] 5. Build DashboardPage container component
  - Create src/features/dashboard/presentation/components/DashboardPage.tsx
  - Manage dashboard-level state: isLoading, error, lastRefreshTime, isOffline
  - Call getDashboardData on mount via useEffect
  - Implement refresh logic with loading state
  - Implement error handling with retry button
  - Pass formatted data to child components via props
  - Implement auto-refresh after 5 minutes of inactivity
  - Use Page Visibility API to pause auto-refresh in background
  - **Skills utilizadas:** `ui-components` - Build container component with state management, refresh logic, and error handling.
  - _Requirements: 1.1, 2.1, 3.1, 8.1, 8.3, 8.4_

  - [x]* 5.1 Write unit test for DashboardPage refresh logic
    - Test manual refresh triggers data reload
    - Test auto-refresh after 5 minutes
    - _Requirements: 8.3, 8.4_

- [x] 6. Build DashboardHeader component
  - Create src/features/dashboard/presentation/components/DashboardHeader.tsx
  - Display personalized welcome message with user's first name (e.g., "Good morning, Amanda!")
  - Show time-based greeting: "Good morning" (5 AM - 12 PM), "Good afternoon" (12 PM - 6 PM), "Good evening" (6 PM - 5 AM)
  - Display current date in format: "Tuesday, March 12, 2024"
  - Use Tailwind CSS with gradient background (blue-50 to indigo-50)
  - Semantic HTML with h1 for main greeting
  - **Skills utilizadas:** `ui-components` - Build header component with time-based greeting and formatted date display.
  - _Requirements: 7.2, 7.3, 7.4_

  - [x]* 6.1 Write property test for time-based greeting accuracy
    - **Property 19: Time-Based Greeting Accuracy**
    - **Validates: Requirements 7.3**

  - [x]* 6.2 Write property test for welcome message personalization
    - **Property 18: Welcome Message Personalization**
    - **Validates: Requirements 7.2**

- [x] 7. Build OverdueAlert component (conditional)
  - Create src/features/dashboard/presentation/components/OverdueAlert.tsx
  - Conditionally render only when overdueCount > 0
  - Display warning banner with red/orange color (bg-red-50, border-l-4 border-red-500)
  - Show count: "You have X overdue items"
  - Include link to /activities?status=overdue
  - Use semantic HTML with role="region" and aria-live="polite"
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x]* 7.1 Write property test for overdue alert conditional display
    - **Property 15: Overdue Alert Display Conditional**
    - **Validates: Requirements 6.1, 6.5**

  - [x]* 7.2 Write property test for overdue alert count accuracy
    - **Property 16: Overdue Alert Count Accuracy**
    - **Validates: Requirements 6.2**

- [x] 8. Build PendingTasksSection component
  - Create src/features/dashboard/presentation/components/PendingTasksSection.tsx
  - Display max 5 pending tasks (status = 'todo' or 'in-progress'), sorted by dueDate ascending
  - For each task show: title, dueDate, priority (color + label), subject
  - Display empty state: "No pending tasks. Great job!"
  - Show "View all pending tasks" link when count > 5
  - Link navigates to /activities?status=pending&sort=due_date
  - Use semantic HTML with h2 and ul/li for task list
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x]* 8.1 Write property test for pending tasks display
    - **Property 1: Pending Tasks Display**
    - **Validates: Requirements 1.2, 1.3**

  - [x]* 8.2 Write property test for pending tasks completeness
    - **Property 2: Pending Tasks Completeness**
    - **Validates: Requirements 1.4**

  - [x]* 8.3 Write property test for view all link conditional
    - **Property 3: View All Link for Pending Tasks**
    - **Validates: Requirements 1.5**

  - [x]* 8.4 Write property test for task status removal on completion
    - **Property 4: Task Status Removal on Completion**
    - **Validates: Requirements 1.7**

- [x] 9. Build UpcomingExamsSection component
  - Create src/features/dashboard/presentation/components/UpcomingExamsSection.tsx
  - Display max 5 upcoming exams with date within next 14 days, sorted by date ascending
  - For each exam show: subjectName, date, time (if available), type (written/oral/practical)
  - Display empty state: "No upcoming exams. You're all set!"
  - Show "View all exams" link when count > 5
  - Link navigates to /activities?type=exam&date_range=14d
  - Use semantic HTML with h2 and ul/li
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x]* 9.1 Write property test for upcoming exams date filtering
    - **Property 5: Upcoming Exams Date Filtering**
    - **Validates: Requirements 2.2**

  - [x]* 9.2 Write property test for upcoming exams display
    - **Property 6: Upcoming Exams Display**
    - **Validates: Requirements 2.2, 2.3**

  - [x]* 9.3 Write property test for upcoming exams completeness
    - **Property 7: Upcoming Exams Completeness**
    - **Validates: Requirements 2.4**

- [x] 10. Build UpcomingAssignmentsSection component
  - Create src/features/dashboard/presentation/components/UpcomingAssignmentsSection.tsx
  - Display max 5 upcoming assignments with due date within next 14 days, sorted by dueDate ascending
  - For each assignment show: title, subjectName, dueDate, type (written/presentation/project)
  - Display empty state: "No upcoming assignments. You're good to go!"
  - Show "View all assignments" link when count > 5
  - Link navigates to /activities?type=assignment&date_range=14d
  - Only include assignments with status NOT 'submitted' or 'graded'
  - Use semantic HTML with h2 and ul/li
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x]* 10.1 Write property test for upcoming assignments date filtering
    - **Property 8: Upcoming Assignments Date Filtering**
    - **Validates: Requirements 3.2**

  - [x]* 10.2 Write property test for upcoming assignments display
    - **Property 9: Upcoming Assignments Display**
    - **Validates: Requirements 3.2, 3.3**

- [x] 11. Build QuickStatsSection component
  - Create src/features/dashboard/presentation/components/QuickStatsSection.tsx
  - Display 4 metric cards in grid layout:
    1. Completion %: (completed tasks / total tasks) * 100, with progress circle or bar
    2. Overdue count: count of activities with dueDate < today AND status != 'completed'
    3. Estimated hours: sum of pending task estimatedTimeMinutes / 60, rounded to 1 decimal
    4. Priority breakdown: "X High, Y Medium, Z Low"
  - Each card shows label, value, and visual indicator
  - Use appropriate icons (Lucide React)
  - Responsive grid: 1 column mobile, 2 columns tablet, 4 columns desktop
  - Use semantic HTML with role="region" for stats container
  - Each card has aria-label describing metric
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x]* 11.1 Write property test for completion percentage calculation
    - **Property 10: Completion Percentage Calculation**
    - **Validates: Requirements 4.2, 4.7**

  - [x]* 11.2 Write property test for overdue count calculation
    - **Property 11: Overdue Count Calculation**
    - **Validates: Requirements 4.3**

  - [x]* 11.3 Write property test for estimated hours calculation
    - **Property 12: Estimated Hours Calculation**
    - **Validates: Requirements 4.4, 4.8**

  - [x]* 11.4 Write property test for priority breakdown accuracy
    - **Property 13: Priority Breakdown Accuracy**
    - **Validates: Requirements 4.5**

  - [x]* 11.5 Write property test for stats section updates on refresh
    - **Property 14: Stats Section Updates on Refresh**
    - **Validates: Requirements 4.6**

- [x] 12. Build QuickActionsSection component
  - Create src/features/dashboard/presentation/components/QuickActionsSection.tsx
  - Display 3 action buttons: "+ New Task", "+ New Exam", "+ New Assignment"
  - Links navigate to: /activities/new?type=task, /activities/new?type=exam, /activities/new?type=assignment
  - Buttons visually prominent with blue background, white text
  - Mobile: stack vertically full-width
  - Tablet/Desktop: horizontal layout
  - Use semantic nav element with aria-label="Create new activity options"
  - Buttons disabled in offline mode with tooltip
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

### Phase 3: Styling & Responsive Design

- [x] 13. Implement mobile layout (< 768px) with Tailwind CSS
  - Single-column stack for all sections
  - Full-width cards with appropriate padding (px-4 py-4)
  - Text truncation for abbreviated display where needed
  - Touch target size: 44px minimum for buttons
  - Quick Actions buttons: stack vertically, full-width
  - Font sizes: 16px minimum for body text, 24px for headings
  - Test on actual mobile devices or emulator (375px, 480px, 640px)
  - _Requirements: 9.1, 9.5, 9.6_

  - [x]* 13.1 Write property test for responsive mobile layout
    - **Property 27: Responsive Mobile Layout**
    - **Validates: Requirements 9.1**

- [x] 14. Implement tablet layout (768px - 1024px) with Tailwind CSS
  - Two-column grid layout
  - Sections arranged: Pending Tasks & Upcoming Exams side-by-side, Assignments & Stats below
  - Quick Actions buttons: horizontal layout if space available
  - Increased spacing between sections
  - Full text display (not abbreviated)
  - Test on tablet sizes (768px, 900px, 1024px)
  - _Requirements: 9.2_

  - [x]* 14.1 Write property test for responsive tablet layout
    - **Property 28: Responsive Tablet Layout**
    - **Validates: Requirements 9.2**

- [x] 15. Implement desktop layout (> 1024px) with Tailwind CSS
  - Responsive grid layout with 3 main columns when appropriate
  - Optimal line lengths and spacing
  - All sections visible without scrolling when possible
  - Quick Actions buttons: prominent horizontal layout
  - Hover states on interactive elements
  - Test on desktop sizes (1280px, 1920px, 2560px)
  - _Requirements: 9.3_

  - [x]* 15.1 Write property test for responsive desktop layout
    - **Property 29: Responsive Desktop Layout**
    - **Validates: Requirements 9.3**

- [x] 16. Implement color system and visual hierarchy
  - Apply Tailwind CSS color palette from design doc:
    - High priority: red-500, Medium: amber-500, Low: green-500
    - Cards: white background with subtle border and shadow
    - Section headers: gray-900 font with bold weight
    - Stats cards: blue-50 background with blue-600 primary values
    - Overdue alert: red-50 background with red-500 left border
  - Consistent spacing and gaps between sections (16px, 24px, 32px)
  - Header gradient: from blue-50 to indigo-50
  - Empty state text: gray-600
  - Loading skeleton: gray-200 animate-pulse
  - _Requirements: 9.4, 10.6_

- [x] 17. Test responsive layouts at multiple breakpoints
  - Verify no horizontal overflow at 375px (mobile), 768px (tablet), 1280px (desktop)
  - Check text readability at all sizes
  - Verify touch targets 44px on mobile
  - Verify sections stack/arrange correctly
  - Check Quick Actions button layout at each breakpoint
  - Use browser DevTools responsive mode and physical devices
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 18. Implement touch target sizing for mobile (44px minimum)
  - All buttons: at least 44x44px with sufficient padding
  - All interactive elements: 44px minimum height
  - All clickable areas: sufficient spacing between to avoid accidental taps
  - Use Tailwind classes: py-3, px-4 for buttons to ensure minimum size
  - Test on actual mobile devices with finger-based interaction
  - _Requirements: 9.5_

  - [x]* 18.1 Write property test for mobile button stacking
    - **Property 30: Mobile Button Stacking**
    - **Validates: Requirements 9.5**

### Phase 4: Accessibility Implementation

- [x] 19. Implement semantic HTML with proper heading hierarchy
  - Page structure: main > h1 (page title) > section > h2 (section titles) > content
  - DashboardPage: h1 for Dashboard title or skip (implicit via context)
  - Each section (Pending Tasks, Exams, Assignments, Stats): h2
  - Each subsection if any: h3 (e.g., stat card titles)
  - Semantic landmarks: main, section, aside, nav
  - No skipped heading levels
  - Test heading structure with browser inspector or axe
  - _Requirements: 10.1, 10.2_

  - [x]* 19.1 Write property test for semantic heading hierarchy
    - **Property 31: Semantic HTML Heading Hierarchy**
    - **Validates: Requirements 10.1, 10.2**

- [x] 20. Add ARIA labels and descriptions to components
  - Dashboard sections: aria-labelledby pointing to h2 IDs
  - Overdue alert: role="region" aria-live="polite" aria-atomic="true"
  - Quick Stats: role="region" aria-label="Dashboard metrics"
  - Each stat card: aria-label="[metric name]: [value]" (e.g., "Completion rate: 70%")
  - "View All" links: aria-label="View all [X items]" (e.g., "View all pending tasks (12)")
  - Empty state divs: aria-label="[section name] is empty"
  - Priority badges: aria-label="[priority level] priority"
  - _Requirements: 10.7, 10.8, 10.9_

- [x] 21. Implement keyboard navigation and focus management
  - All interactive elements (buttons, links) keyboard accessible via Tab
  - Tab order logical and predictable: header → alert → pending tasks → exams → assignments → stats → actions
  - Focus visible on all elements: 3px outline or border (use Tailwind focus:outline-2 focus:outline-blue-500)
  - No keyboard traps: users can Tab through all elements without getting stuck
  - Enter/Space activates buttons and links
  - Skip link: hidden "Skip to main content" link at top of page navigates to main element
  - Test with Tab, Shift+Tab navigation
  - _Requirements: 10.3_

  - [x]* 21.1 Write property test for keyboard navigation support
    - **Property 32: Keyboard Navigation Support**
    - **Validates: Requirements 10.3**

- [x] 22. Verify color + text redundancy
  - All color-coded information includes text labels:
    - Priority indicators: red/amber/green dot + "High"/"Medium"/"Low" text
    - Status indicators: color background + status text label
    - Metric cards: colored background + label text describing metric
    - Empty states: text message not just visual space
  - No information conveyed by color alone
  - Test with Accessibility Insights or axe tool
  - _Requirements: 10.6_

- [x] 23. Test with screen readers (NVDA, JAWS, VoiceOver)
  - Use NVDA (Windows) or JAWS trial to test full content announcement
  - Navigate through all sections in screen reader
  - Verify all headings announced correctly
  - Verify ARIA labels announced
  - Verify button purpose clear from label
  - Verify dynamic updates announced (aria-live regions)
  - Verify task/exam/assignment details announced
  - Test stat card values announced
  - _Requirements: 10.7_

- [x] 24. Verify contrast ratios meet WCAG AA standards
  - Main text on background: 4.5:1 minimum contrast
  - Large text (18px+): 3:1 minimum contrast
  - Interactive elements: 3:1 minimum contrast
  - Use WebAIM contrast checker or axe to verify all text
  - Priority colors + black text meet 4.5:1 (adjust if needed)
  - Stat card values on background colors meet 4.5:1
  - Overdue alert text on red background meets 4.5:1
  - Link text on background meets 4.5:1
  - _Requirements: 10.3_

- [x] 25. Verify focus indicators visible on all interactive elements
  - Every button, link, and interactive element has visible focus state
  - Focus indicator: 3px outline or border in contrasting color
  - Focus indicator not hidden or too subtle (avoid outline: none)
  - Use Tailwind: focus:outline-2 focus:outline-blue-500 focus:rounded
  - Test with Tab navigation through all elements
  - Verify focus visible in low-light conditions
  - _Requirements: 10.3_

- [x] 26. Run accessibility audit with axe DevTools
  - Install axe DevTools browser extension
  - Run automated audit on Dashboard component
  - Fix all accessibility violations
  - Verify no errors or critical warnings
  - Document any known limitations
  - _Requirements: 10.1, 10.2, 10.3_

### Phase 5: Performance Optimization

- [x] 27. Set up code splitting for lazy-loading components
  - Use Next.js dynamic() to lazy-load lower-priority sections
  - Candidates for lazy loading: QuickStatsSection, UpcomingExamsSection, UpcomingAssignmentsSection
  - Add loading skeletons for lazy-loaded components
  - Measure bundle size before and after
  - Verify lazy-loaded chunks load without errors
  - _Requirements: 11.4_

- [x] 28. Create database indexes for Dashboard query optimization
  - Create index on activities(user_id, status) if not present
  - Create index on activities(user_id, due_date) if not present
  - Create index on exams(user_id, exam_date) if not present
  - Create index on assignments(user_id, due_date) if not present
  - Verify indexes created in Supabase dashboard
  - Test query execution time with and without indexes
  - _Requirements: 11.8, 13.1_

- [x] 29. Optimize database query for < 1 second execution
  - Measure getDashboardData query execution time
  - Use EXPLAIN ANALYZE to profile query
  - Verify all subqueries efficient
  - Verify joins use indexes
  - Use PostgreSQL aggregation (json_agg, json_build_object) for efficiency
  - Test with large datasets (1000+ activities)
  - Verify query execution < 1 second
  - _Requirements: 13.7_

- [x] 30. Implement browser caching strategy (5-minute TTL)
  - Store formatted dashboard data in memory after fetch
  - Track lastRefreshTime timestamp
  - Compare current time to lastRefreshTime before re-fetching
  - Invalidate cache after 5 minutes or manual refresh
  - Prevent unnecessary network requests during cache validity period
  - _Requirements: 8.2, 11.7_

- [x] 31. Test and verify bundle size < 50KB (gzipped)
  - Build Dashboard component and measure bundle size
  - Use Next.js build analyzer or webpack-bundle-analyzer
  - Target: Dashboard component < 50KB gzipped
  - Identify large dependencies and consider alternatives
  - Tree-shake unused code
  - Verify bundle size in production build
  - _Requirements: 11.2, 11.6_

- [x] 32. Profile and optimize Time to Interactive (TTI) < 3 seconds
  - Use Lighthouse to measure Time to Interactive
  - Identify bottlenecks (JavaScript parsing, rendering, etc.)
  - Optimize long tasks (code-splitting, defer non-critical logic)
  - Measure TTI before and after optimizations
  - Target: TTI < 3 seconds on 4G network with mobile device simulation
  - _Requirements: 11.1_

- [x] 33. Measure and verify First Contentful Paint (FCP) < 2 seconds
  - Use Lighthouse to measure First Contentful Paint
  - Optimize critical rendering path
  - Move non-critical CSS/JS to async loading
  - Measure FCP before and after optimizations
  - Target: FCP < 2 seconds on 4G network with mobile device simulation
  - Verify on realistic hardware (e.g., Lighthouse throttling settings)
  - _Requirements: 11.1_

### Phase 6: Offline Support

- [x] 34. Configure Service Worker for Dashboard caching
  - Update Service Worker to cache Dashboard HTML, CSS, and JS bundles
  - Set cache name for versioning (e.g., 'dashboard-v1')
  - Implement cache-first strategy for static assets
  - Implement network-first strategy for data requests
  - Cache Dashboard page shell and critical resources
  - _Requirements: 12.1_

- [x] 35. Implement offline data display with cache
  - Detect offline status using navigator.onLine and online/offline events
  - Retrieve cached data from IndexedDB or localStorage
  - Display cached data when offline
  - Show timestamp of cached data: "Last updated: 2 hours ago"
  - Use date-fns formatDistanceToNow() for relative time display
  - _Requirements: 12.1, 12.2_

- [x] 36. Add offline indicator to UI
  - Display subtle offline indicator when navigator.onLine = false
  - Banner text: "Offline - Last updated: 2 hours ago"
  - Use gray or muted colors for offline state
  - Position indicator at top or bottom of Dashboard
  - Remove indicator automatically when online
  - _Requirements: 12.2_

- [x] 37. Disable Quick Action buttons in offline mode
  - Disable "+ New Task", "+ New Exam", "+ New Assignment" buttons when offline
  - Add disabled attribute and visual styling (opacity-50, cursor-not-allowed)
  - Add tooltip: "Not available offline. Please reconnect to create activities."
  - Show tooltip on hover or focus
  - Test button disabled state in offline mode
  - _Requirements: 12.3_

- [x] 38. Implement auto-refresh on connectivity restoration
  - Listen to online event (window.addEventListener('online', ...))
  - When online event fires, automatically call getDashboardData()
  - Show brief loading indicator or refresh animation
  - Update all sections with latest data
  - Remove offline indicator
  - _Requirements: 12.4_

- [x] 39. Set up offline cache TTL (1 hour)
  - Store cached dashboard data with timestamp
  - Implement cache expiration: data stale after 1 hour
  - When user returns after cache expires, show "Cache expired" message
  - Allow user to refresh when online (if available)
  - Clear expired cache daily
  - _Requirements: 12.5_

### Phase 7: Error Handling & Edge Cases

- [x] 40. Implement error messages for failed data retrieval
  - Show error banner at top: "❌ Could not load dashboard"
  - Display specific error message (e.g., "Network timeout" or "Permission denied")
  - Provide retry button
  - If offline cache available, offer "View Offline Data" button
  - Log error to monitoring service (Sentry, LogRocket, etc.)
  - _Requirements: 8.7, 13.8_

- [x] 41. Implement retry logic for failed requests
  - Add retry button on error banner
  - On retry, show loading indicator
  - Call getDashboardData() again
  - Clear error state on successful retry
  - Implement exponential backoff (1s, 2s, 4s) for repeated failures
  - _Requirements: 8.7_

- [x] 42. Handle no data scenarios (empty states)
  - Pending Tasks empty: "✅ No pending tasks. Great job!"
  - Upcoming Exams empty: "✅ No upcoming exams. You're all set!"
  - Upcoming Assignments empty: "✅ No upcoming assignments. You're good to go!"
  - Show empty state messages in place of section content
  - Include relevant emoji or icon for visual clarity
  - _Requirements: 1.6, 2.6, 3.6, 10.5_

  - [x]* 42.1 Write property test for empty state messaging
    - **Property 42: Empty State Messaging**
    - **Validates: Requirements 1.6, 2.6, 3.6, 10.5**

- [x] 43. Handle network failures gracefully
  - Catch network errors in getDashboardData try/catch block
  - Return error response with descriptive message
  - Display error state in UI
  - Provide retry option
  - If previous successful load exists, show cached data with refresh indicator
  - _Requirements: 8.7_

- [x] 44. Handle calculation errors (fallback values)
  - If completion percentage calculation fails: display "Unable to calculate"
  - If overdue count fails: default to 0
  - If estimated hours fails: default to "0 hrs"
  - If priority breakdown fails: default to "0 High, 0 Medium, 0 Low"
  - Log calculation errors for debugging
  - _Requirements: 13.8_

- [x] 45. Handle format string errors
  - If date formatting fails: display "Invalid Date" (helps with debugging)
  - If time formatting fails: display "Invalid Time"
  - If title truncation fails: display full title with no ellipsis
  - Prevent format errors from breaking component layout
  - Log format errors to monitoring
  - _Requirements: 13.8_

### Phase 8: Integration & Navigation

- [x] 46. Set up /dashboard route as main entry point
  - Create src/app/(main)/dashboard/page.tsx
  - Import and render DashboardPage component
  - Ensure route requires authentication (redirect to login if not auth'd)
  - Add route to main navigation (sidebar/header)
  - Set as default route after login
  - Test navigation to /dashboard from login page
  - _Requirements: 1.1, 8.1_

- [x] 47. Implement navigation links to activity list with filters
  - "View All Pending Tasks" link → /activities?status=pending&sort=due_date
  - "View All Exams" link → /activities?type=exam&date_range=14d
  - "View All Assignments" link → /activities?type=assignment&date_range=14d
  - "View Overdue" link → /activities?status=overdue
  - Verify links navigate correctly
  - Verify filters applied on destination page
  - _Requirements: 1.5, 2.5, 3.5, 6.3_

- [x] 48. Implement navigation links to creation forms
  - "+ New Task" button → /activities/new?type=task
  - "+ New Exam" button → /activities/new?type=exam
  - "+ New Assignment" button → /activities/new?type=assignment
  - Verify form pre-populates type parameter if available
  - Test navigation from Dashboard to each creation form
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 49. Verify integration with Activity Management feature
  - Confirm authentication session shared between Dashboard and Activity features
  - Verify RLS policies correctly filter Activities by current user
  - Confirm activity creation on Activity forms updates Dashboard on refresh
  - Verify status updates (completed tasks) remove from Pending Tasks on refresh
  - Test round-trip: Create activity → Dashboard shows → Edit activity → Dashboard updates → Delete activity → Dashboard updates
  - _Requirements: 8.1, 8.3_

- [x] 50. Verify integration with Activity List & Filter feature
  - Dashboard "View All" links navigate to Activities List
  - Activities List honors Dashboard filter parameters
  - Activities List and Dashboard use same data source (no inconsistencies)
  - Sorting and filtering in Activities List works correctly
  - _Requirements: 1.5, 2.5, 3.5_

- [x] 51. Test round-trip data integrity
  - Create activity via API (not UI) with known values
  - Fetch via getDashboardData
  - Format via formatDashboardData
  - Verify formatted display matches expected output
  - Re-fetch via getDashboardData
  - Verify re-fetched raw data matches original
  - No data mutation or loss
  - _Requirements: 15.1, 15.5_

  - [x]* 51.1 Write property test for round-trip data integrity
    - **Property 37: Round-Trip Data Integrity**
    - **Validates: Requirements 15.1, 15.5**

### Phase 9: Comprehensive Testing

- [x] 52. Write unit tests for formatDashboardData (pretty printer)
  - Test date formatting: "Mar 15, 2024"
  - Test time formatting: "2:30 PM"
  - Test hours rounding: "5.5 hrs" from 330 minutes
  - Test percentage formatting: "72%" from 0.72
  - Test priority labels: "High", "Medium", "Low"
  - Test title truncation: 61-char title → "...[60 chars]..."
  - Test subject name truncation: 31-char name → "...[30 chars]..."
  - Test handling of null/undefined values
  - Test locale-specific formatting
  - Ensure all tests pass
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [x] 53. Write unit tests for calculations (completion %, overdue, hours)
  - Test completion percentage: 14 completed / 20 total = 70%
  - Test completion with zero tasks: 0%
  - Test overdue count: activities with dueDate < today AND status != 'completed'
  - Test overdue with no overdue items: 0
  - Test estimated hours: sum of estimatedTimeMinutes / 60, rounded to 1 decimal
  - Test estimated hours with zero estimated time: 0 hrs
  - Test priority breakdown: count by priority level
  - Edge cases: NaN, Infinity, negative numbers
  - _Requirements: 10, 11, 12, 13_

- [x] 54. Write component tests for each UI section
  - DashboardPage: renders all sections, calls getDashboardData on mount, refresh logic
  - DashboardHeader: displays greeting, user name, current date
  - PendingTasksSection: renders tasks, shows "View All" when count > 5, empty state
  - UpcomingExamsSection: renders exams, shows "View All" when count > 5, empty state
  - UpcomingAssignmentsSection: renders assignments, empty state, "View All" link
  - QuickStatsSection: renders all 4 cards with correct values
  - QuickActionsSection: renders 3 buttons, buttons disabled offline
  - OverdueAlert: displays when overdueCount > 0, hidden when 0
  - _Requirements: 1, 2, 3, 4, 5, 6, 7_

- [x] 55. Write integration tests for data retrieval and formatting
  - Mock Supabase client with test data
  - Test getDashboardData returns single query result
  - Test data contains all required fields
  - Test formatDashboardData processes all data correctly
  - Test round-trip: fetch → format → re-fetch produces matching raw data
  - Test error handling returns proper error response
  - _Requirements: 13.1, 14.1, 15.1_

- [x] 56. Write E2E tests for critical user workflows (Playwright)
  - Test 1: User logs in and views Dashboard
    - Verify all sections render within 2 seconds
    - Verify data displays correctly
  - Test 2: User refreshes Dashboard
    - Verify loading indicator shows
    - Verify new data loads within 2 seconds
  - Test 3: User clicks "View All Pending Tasks" link
    - Verify navigation to /activities?status=pending
    - Verify Activities List applies filter
  - Test 4: User clicks "+ New Task" button
    - Verify navigation to /activities/new?type=task
    - Verify form displays
  - Test 5: User creates task and returns to Dashboard
    - Verify new task appears in Pending Tasks section on refresh
  - _Requirements: 1.5, 5.2_

- [x] 57. Write accessibility tests (axe audit)
  - Run axe accessibility audit on Dashboard component
  - Verify no violations found
  - Verify all headings have proper hierarchy
  - Verify all interactive elements keyboard accessible
  - Verify all ARIA labels present
  - Verify color contrast meets WCAG AA
  - Fix any violations found
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 58. Write performance tests (Lighthouse, bundle size)
  - Run Lighthouse audit on /dashboard route
  - Verify First Contentful Paint < 2 seconds
  - Verify Time to Interactive < 3 seconds
  - Measure bundle size of Dashboard component
  - Verify < 50KB gzipped
  - Measure database query execution time
  - Verify < 1 second
  - Document performance metrics in test report
  - _Requirements: 11.1, 11.2, 11.6_

- [x] 59. Write database tests (pgtap)
  - Test getDashboardData query returns correct structure
  - Test query execution time < 1 second
  - Test RLS policies enforce user filtering (query for user A returns only user A data)
  - Test indexes exist and are used by query planner
  - Test query handles no data gracefully (returns empty arrays)
  - Test calculations (completion %, overdue count, estimated hours)
  - _Requirements: 13.1, 13.2, 13.7_

- [x] 60. Verify all property-based tests pass
  - Run all 42 property-based tests
  - Each test executes 100+ iterations with random data
  - All properties pass with no failing examples
  - Document any property test failures and fixes
  - Commit passing tests to repository
  - _Requirements: All Properties 1-42_

- [x] 61. Verify all tests pass (unit, integration, E2E, accessibility, performance)
  - Run full test suite: `npm run test`
  - Verify 100% of unit tests pass
  - Verify 100% of integration tests pass
  - Run E2E tests: `npm run test:e2e`
  - Verify 100% of E2E tests pass
  - Run accessibility tests
  - Verify 100% of accessibility tests pass
  - Run performance tests
  - Verify performance metrics meet targets
  - _Requirements: All_

### Phase 10: Checkpoint & Review

- [x] 62. Checkpoint - Ensure all tests pass and Dashboard functions correctly
  - All unit tests passing: `npm run test`
  - All E2E tests passing: `npm run test:e2e`
  - All accessibility tests passing
  - All property-based tests passing (42 properties)
  - Dashboard loads within 2 seconds (FCP)
  - Dashboard interactive within 3 seconds (TTI)
  - Offline mode works correctly
  - Navigation links work correctly
  - Data accuracy verified through tests
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: All_

- [x] 63. Document API/Server Action contracts
  - Document getDashboardData() Server Action:
    - Input: none (uses authenticated user context)
    - Output: { success: boolean, data: DashboardData | null, error: DashboardError | null }
    - Error codes: FETCH_FAILED, PERMISSION_DENIED
    - Return time: < 1 second
  - Document formatDashboardData() function:
    - Input: raw dashboard data from server
    - Output: formatted DashboardData with display strings
    - Date format: "MMM DD, YYYY"
    - Time format: "h:mm AM/PM"
    - Hours format: "X.X hrs"
  - Document component props for all 8 components
  - Include usage examples
  - _Requirements: 13.1, 14.1_

- [x] 64. Document component props and interfaces
  - DashboardPage props and state
  - DashboardHeader: { userName: string, currentDate: Date }
  - PendingTasksSection: { tasks: FormattedTask[], onViewAll: () => void }
  - UpcomingExamsSection: { exams: FormattedExam[], onViewAll: () => void }
  - UpcomingAssignmentsSection: { assignments: FormattedAssignment[], onViewAll: () => void }
  - QuickStatsSection: { stats: DashboardStats }
  - QuickActionsSection: no props
  - OverdueAlert: { overdueCount: number, onViewAll: () => void }
  - Include TypeScript interfaces for all props
  - Document required vs optional props
  - _Requirements: 14.1_

- [x] 65. Create README for dashboard feature
  - Feature overview: purpose and scope
  - Architecture: layers, component tree, data flow
  - Key files and their purposes
  - How to run locally: `npm run dev`
  - How to run tests: `npm run test`, `npm run test:e2e`
  - Performance targets and measured metrics
  - Accessibility compliance notes
  - Known limitations or future enhancements
  - Troubleshooting common issues
  - _Requirements: All_

- [x] 66. Review and validate all 15 requirements are met
  - Requirement 1: Pending Tasks Display - ✓ Verified by tests and manual testing
  - Requirement 2: Upcoming Exams - ✓ Verified by tests and manual testing
  - Requirement 3: Upcoming Assignments - ✓ Verified by tests and manual testing
  - Requirement 4: Quick Statistics - ✓ Verified by tests and manual testing
  - Requirement 5: Quick Actions - ✓ Verified by tests and manual testing
  - Requirement 6: Overdue Alert - ✓ Verified by tests and manual testing
  - Requirement 7: Dashboard Header - ✓ Verified by tests and manual testing
  - Requirement 8: Refresh Mechanism - ✓ Verified by tests and manual testing
  - Requirement 9: Responsive Layout - ✓ Verified on mobile/tablet/desktop
  - Requirement 10: Accessibility - ✓ Verified by axe audit and screen reader testing
  - Requirement 11: Performance - ✓ Verified by Lighthouse and bundle size tests
  - Requirement 12: Offline Support - ✓ Verified by offline simulation tests
  - Requirement 13: Data Retrieval - ✓ Verified by database and integration tests
  - Requirement 14: Data Formatting - ✓ Verified by unit and integration tests
  - Requirement 15: Round-Trip Integrity - ✓ Verified by property-based tests
  - All requirements met and documented
  - _Requirements: All 1-15_

- [x] 67. Review and validate all 42 correctness properties are verified
  - Property 1-4: Pending Tasks display, completeness, view all link, completion removal
  - Property 5-7: Upcoming Exams filtering, display, completeness
  - Property 8-9: Upcoming Assignments filtering, display
  - Property 10-14: Statistics calculations, updates on refresh
  - Property 15-17: Overdue alert display, count accuracy, updates
  - Property 18-19: Welcome message personalization, greeting accuracy
  - Property 20-26: Date/time/hours formatting, truncation
  - Property 27-30: Responsive layouts, mobile button stacking
  - Property 31-33: Semantic HTML, keyboard navigation, descriptive labels
  - Property 34-36: Single query, performance, RLS enforcement
  - Property 37: Round-trip data integrity
  - Property 38-40: Offline data display, offline indicator, action buttons disabled
  - Property 41-42: Auto-refresh, empty state messaging
  - All 42 properties verified through property-based tests or unit/integration tests
  - _Requirements: All Properties 1-42_

- [x] 68. Prepare feature for release
  - Code review complete: all code follows project conventions
  - Documentation complete: README, API contracts, components
  - Tests complete: 100% passing (unit, integration, E2E, accessibility, performance)
  - Performance targets met: FCP < 2s, TTI < 3s, bundle < 50KB gzipped
  - Accessibility compliant: WCAG 2.1 AA verified
  - Offline support working: cache, offline indicator, auto-refresh
  - All edge cases handled: network failures, no data, format errors
  - All requirements met and verified
  - Ready for production deployment
  - _Requirements: All_

---

## Notes

- Tasks marked with `*` are optional testing sub-tasks. Test sub-tasks can be skipped for an MVP, but are recommended for comprehensive coverage.
- Each task includes specific requirement and property references for full traceability.
- Property-based tests validate universal correctness properties across 100+ random inputs.
- Unit tests validate specific examples and edge cases.
- Integration and E2E tests validate the complete feature end-to-end.
- Accessibility testing ensures WCAG 2.1 AA compliance.
- Performance testing ensures targets are met.
- Code follows project structure, naming conventions, and tech stack guidelines.
