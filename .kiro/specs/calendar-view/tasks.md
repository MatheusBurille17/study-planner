# Implementation Plan: Calendar View Feature

## Overview

Implementing a comprehensive calendar interface for viewing Tasks, Exams, and Assignments across monthly, weekly, and daily time scales. The implementation follows clean architecture layers (domain → application → infrastructure → presentation), with emphasis on performance, accessibility, and offline support. All code will use TypeScript, Next.js App Router, shadcn/ui components, and Tailwind CSS.

## Tasks

### Phase 1: Core Infrastructure & Server Actions

- [x] 1. Create database schema and RLS policies
  - Create/verify `activities` table with unified type system (task, exam, assignment)
  - Create/verify `subjects` table with color field
  - Configure Row-Level Security policies ensuring users see only their own activities
  - Create indexes: `(user_id, type, due_date)`, `(user_id, type, date)`, `(user_id, type)`
  - Verify database migration scripts in `/supabase/migrations/`
  - **Skills utilizadas:** `database-queries` - Create RLS policies and performance indices for calendar queries.
  - _Requirements: 1.1, 15.1-15.6_

- [x] 2. Implement core domain models and business rules
  - Create `src/features/calendar/domain/calendarRules.ts` with:
    - Function to calculate urgency levels based on days remaining
    - Function to determine if activity is overdue
    - Type guards for activity types (isTask, isExam, isAssignment)
  - Create `src/shared/types/calendarModels.ts` with:
    - `CalendarActivity` DTO interface
    - `CalendarFilters` interface
    - `CalendarResponse` interface
  - Write domain logic tests (unit tests)
  - **Skills utilizadas:** `property-testing` - Use property-based tests to validate urgency calculations and date comparisons.
  - _Requirements: 5.1-5.6, 14.1, 17.1_

- [x] 3. Implement Server Action: getCalendarData
  - Create `src/features/calendar/presentation/actions/getCalendarData.ts` with:
    - Function signature: `getCalendarData(viewMode, dateOrDateRange, filters, userId)`
    - Zod schema validation for inputs
    - Authentication check via session
    - Calls to CalendarUseCase to fetch and format data
    - Error handling with descriptive messages
    - Offline cache check using IndexedDB
  - Update `src/features/calendar/application/useCases/` with getCalendarData use case
  - **Skills utilizadas:** `fetching-data` - Implement Server Action for calendar data retrieval with offline cache support.
  - _Requirements: 15.1-15.10, 14.1-14.8_

- [x] 4. Implement calendar data query and formatting
  - Create `src/features/calendar/infrastructure/supabaseCalendarRepository.ts` with:
    - Function `fetchMonthActivities(userId, date)` - single SQL query
    - Function `fetchWeekActivities(userId, startDate)` - single SQL query
    - Function `fetchDayActivities(userId, date)` - single SQL query
    - Join with subjects table to get subject name and color
    - Apply filters (activity type, subject) at query level
    - Return raw data for formatting layer
  - Create `src/features/calendar/application/formatters/formatCalendarData.ts` with:
    - Format dates: "MMM DD, YYYY" format
    - Format times: "h:mm AM/PM" format
    - Truncate titles: 40 chars (month), 60 chars (week/day)
    - Calculate display text for month/year and date ranges
    - Map raw activities to `CalendarActivity` DTOs
  - Unit tests for query execution time (< 1 second)
  - Unit tests for data formatting correctness
  - **Skills utilizadas:** `fetching-data` - Implement optimized calendar queries and data formatting for multi-view support.
  - _Requirements: 15.1-15.10, 16.1-16.9, 17.1-17.6_

- [x] 5. Implement offline cache layer
  - Create `src/shared/lib/notifications/calendarCache.ts` with:
    - Function `cacheCalendarData(key, data, ttl)` - store in IndexedDB
    - Function `getCachedCalendarData(key)` - retrieve from IndexedDB
    - Function `isCacheExpired(cacheEntry, ttl)` - check TTL (1 hour)
    - Function `clearExpiredCache()` - cleanup old entries
  - Use IndexedDB for persistence across sessions
  - Implement cache invalidation on activity CRUD operations
  - Add cache TTL: 1 hour (3600 seconds)
  - Unit tests for cache operations
  - **Skills utilizadas:** `fetching-data` - Implement offline caching with IndexedDB and cache TTL management.
  - _Requirements: 14.1-14.8_

### Phase 2: Presentation Layer - Components & Views

- [x] 6. Create CalendarPage root component with state management
  - Create `src/app/(main)/calendar/page.tsx` with:
    - State: viewMode (month/week/day), selectedDate, filters, loading, offline
    - Initialize with current month view
    - Call `getCalendarData` Server Action on mount and navigation
    - Handle loading and error states
    - Display offline indicator when needed
    - Route structure supports query parameters: `?view=`, `?date=`, `?filter=`, `?subject=`
  - Create `useCalendarState()` custom hook for state management
  - Component layout: Header + FilterBar → CalendarViewContainer
  - **Skills utilizadas:** `ui-components` - Build calendar page with state management, view switching, and error handling.
  - _Requirements: 1.1, 2.1, 3.1, 7.1-7.10, 8.1-8.10, 9.1-9.10, 10.1-10.10_

- [x] 7. Implement MonthView component
  - Create `src/features/calendar/presentation/components/MonthView.tsx` with:
    - Displays 6x7 calendar grid with all days of month
    - Shows previous/next month filler days (light gray)
    - Renders DayCell for each day of month
    - Handles navigation: Previous Month, Next Month buttons
    - Displays month/year header (e.g., "March 2024")
    - Props: `activities`, `selectedDate`, `filters`, `onDayClick`, `onMonthChange`
    - Responsive: Mobile (vertical), tablet (balanced), desktop (optimal)
  - Create `src/features/calendar/presentation/components/DayCell.tsx` with:
    - Displays day number in top-left
    - Shows activity indicators (dots, count badge) at bottom
    - Visual distinction for: today (circle/highlight), previous/next month (gray)
    - Clickable to navigate to Day View
    - Props: `date`, `activities`, `isToday`, `isCurrentMonth`, `filters`, `onClick`
    - ARIA labels: "Monday, March 15, 2024, 3 activities: 1 Task, 1 Exam, 1 Assignment"
    - Touch target size: 44px minimum
  - **Skills utilizadas:** `ui-components` - Build calendar grid component with day cell variants and activity indicators.
  - _Requirements: 1.2-1.10, 4.2, 5.2, 6.1-6.6, 7.1-7.10, 11.1-11.10, 12.1-12.10_
  - Component tests for grid generation
  - Component tests for activity indicators
  - _Requirements: 1.2-1.10, 4.2, 5.2, 6.1-6.6, 7.1-7.10, 11.1-11.10, 12.1-12.10_

- [x] 8. Implement WeekView component
  - Create `src/features/calendar/presentation/components/WeekView.tsx` with:
    - Displays 7 consecutive days horizontally (or vertically on mobile)
    - All-day activities section at top
    - Hourly time slots from 6 AM to 11 PM (17 hours)
    - Current time indicator (red line) on today's date
    - Day column headers: day name + date (e.g., "Mon, Mar 12")
    - Week date range header (e.g., "Mar 10 - Mar 16, 2024")
    - Navigation: Previous Week, Next Week buttons
    - Props: `activities`, `weekStart`, `selectedDate`, `filters`, `onDayClick`, `onWeekChange`
    - Responsive: Mobile (scroll), tablet (5-7 days), desktop (all 7 days)
    - Fixed header for navigation/controls
  - Create `src/features/calendar/presentation/components/TimeSlotGrid.tsx` helper component
  - Create `src/features/calendar/presentation/components/AllDaySection.tsx` for tasks without times
  - Component tests for day column layout
  - Component tests for time slot positioning
  - _Requirements: 2.2-2.10, 4.3, 5.2-5.3, 6.2, 8.1-8.10, 11.1-11.10_

- [x] 9. Implement DayView component
  - Create `src/features/calendar/presentation/components/DayView.tsx` with:
    - Displays full selected date (e.g., "Tuesday, March 12, 2024")
    - Activity count in header (e.g., "5 Activities")
    - All-day activities section
    - Timed activities organized chronologically
    - Empty state: "No activities for this day" if no activities
    - Navigation: Previous Day, Next Day buttons
    - Return to Calendar button
    - Props: `activities`, `selectedDate`, `filters`, `onPreviousDay`, `onNextDay`, `onBackToCalendar`
    - Fixed header with sticky positioning
    - Scrollable content area
  - Component tests for activity organization
  - Component tests for date navigation
  - _Requirements: 3.1-3.10, 4.4, 5.3, 6.7, 7.1-7.10, 9.1-9.10, 11.1-11.10_

- [x] 10. Implement ActivityCard component
  - Create `src/features/calendar/presentation/components/ActivityCard.tsx` with:
    - Displays: title, subject name, type badge, time, priority badge, urgency color
    - Props: `activity`, `showTime`, `isHighlighted`, `onActivityClick` (optional for future detail view)
    - Color-coded border (left 4px) matching activity type
    - Background color based on urgency: critical (red-100), high (orange-100), medium (yellow-100), low (gray-100)
    - Type badge: small tag showing "Task", "Exam", or "Assignment"
    - Priority badge (if applicable): "High", "Medium", "Low"
    - Hover state: shadow increase
    - ARIA label with full activity details
    - Responsive text truncation
  - Component tests for badge display
  - Component tests for color application
  - _Requirements: 3.4, 4.2-4.7, 5.2-5.3, 12.1-12.7_

- [x] 11. Implement FilterBar component
  - Create `src/features/calendar/presentation/components/FilterBar.tsx` with:
    - Type filter buttons: "All", "Tasks", "Exams", "Assignments"
    - Subject filter dropdown: populated with user's subjects
    - Visual state for active filters (highlighted button, selected dropdown)
    - Clear Filters button (visible when any filter active)
    - Props: `filters`, `subjects`, `onFilterChange`, `onClearFilters`
    - Keyboard accessible: Tab navigation, Enter to activate
    - Touch-friendly: 44px+ targets
    - Responsive: Stacked on mobile, horizontal on tablet/desktop
  - Component tests for filter application
  - Component tests for active state display
  - _Requirements: 10.1-10.10, 12.1-12.10_

- [x] 12. Implement CalendarHeader component
  - Create `src/features/calendar/presentation/components/CalendarHeader.tsx` with:
    - View mode toggle buttons: "Month", "Week", "Day"
    - Active view indicated visually
    - Navigation arrows: Previous/Next
    - Date range display: month/year or date range
    - FilterBar integration
    - Offline indicator (if offline)
    - Props: `viewMode`, `dateRange`, `onViewModeChange`, `onNavigate`, `isOffline`
    - Responsive: Full header on desktop, hamburger/simplified on mobile
  - Component tests for view mode switching
  - _Requirements: 1.1, 2.1, 7.1-7.10, 8.1-8.10, 9.1-9.10_

- [x] 13. Create responsive layout wrapper components
  - Create `src/features/calendar/presentation/components/CalendarViewContainer.tsx` for view switching
  - Create mobile-specific layouts with proper orientation handling
  - Implement lazy loading for Week and Day view components
  - Use React.lazy() with Suspense boundaries
  - Component tests for responsive behavior
  - _Requirements: 11.1-11.10_

### Phase 3: Styling & Responsive Design

- [x] 14. Implement Tailwind CSS styling for Calendar components
  - Style MonthView grid with Tailwind classes:
    - Grid layout: `grid grid-cols-7 gap-1`
    - Day cells: `border rounded-lg p-2 hover:bg-gray-50 cursor-pointer`
    - Today indicator: `ring-2 ring-blue-500`
    - Previous/next month days: `text-gray-400`
    - Activity indicator dots: `w-2 h-2 rounded-full`
  - Style WeekView with:
    - Day columns: `flex-1 border-r`
    - Time slots: `h-16 border-b relative`
    - All-day section: `bg-gray-50 p-2 border-b`
    - Current time line: `absolute top-0 left-0 right-0 h-0.5 bg-red-500`
  - Style DayView with:
    - Fixed header: `sticky top-0 bg-white z-10 shadow-sm`
    - Activity list: `space-y-2`
    - All-day activities: `bg-blue-50 p-3 rounded`
  - Style ActivityCard with:
    - Border-left: `border-l-4` with type-based color
    - Background: urgency-based color
    - Shadow on hover: `hover:shadow-md transition-shadow`
  - Create utility classes in `src/shared/lib/tailwindUtils.ts` for:
    - Activity type colors: `getActivityTypeColor(type)`
    - Urgency colors: `getUrgencyColor(urgency)`
    - Focus ring: `focusRing()` for accessibility
  - No custom CSS, Tailwind-only styling
  - _Requirements: 4.1-4.7, 5.2-5.3, 11.1-11.10, 12.1-12.10_

- [x] 15. Implement mobile-responsive layouts
  - Mobile Month View (< 768px):
    - Single column layout with days stacked
    - Abbreviated day names (M, T, W, T, F, S, S)
    - Compact activity indicators (1-2 dots or badge)
    - Full-width day cells with 44px+ tap targets
  - Mobile Week View (< 768px):
    - Vertical day layout (one day per row) or horizontal scroll
    - Simplified time slots (every 2 hours instead of hourly)
    - Full-width activity cards
    - Swipe gesture support (optional enhancement)
  - Mobile Day View (< 768px):
    - Full-width activity list
    - Large touch targets (44px+)
    - Hamburger menu for navigation
  - Tablet layouts (768px - 1024px):
    - Balanced Month View with readable grid
    - Week View with 5-7 days depending on orientation
    - Day View with centered content
  - Media query implementation using Tailwind breakpoints: sm, md, lg, xl
  - Test on: iPhone SE, iPhone 12/14 Pro, iPhone Pro Max, iPad, iPad Pro, desktop
  - _Requirements: 11.1-11.10_

- [x] 16. Implement responsive typography and spacing
  - Font sizes:
    - Mobile body text: `text-base` (16px)
    - Tablet body text: `text-sm` (14px)
    - Desktop body text: `text-sm` (14px)
    - Headings scale appropriately by breakpoint
  - Spacing responsive:
    - Mobile: compact `p-2`, `gap-1`
    - Tablet: balanced `p-3`, `gap-2`
    - Desktop: generous `p-4`, `gap-3`
  - Line height: `leading-relaxed` (1.5x) for readability
  - Ensure no horizontal scroll on mobile/tablet
  - Ensure text readable without zoom at all breakpoints
  - _Requirements: 11.1-11.10, 12.1-12.10_

### Phase 4: Accessibility & Semantic HTML

- [x] 17. Implement semantic HTML structure
  - Use `<main>` element for calendar content
  - Use `<header>`, `<nav>`, `<section>`, `<article>` for structure
  - Use `<table>` with `<thead>`, `<tbody>`, `<th>`, `<td>` for Month View grid (if using table)
  - Or use `<div role="grid">` with `role="row"`, `role="gridcell"` for divs
  - Proper heading hierarchy: h1 (page), h2 (month/week/day), h3 (sections)
  - Use `<button>` for all clickable buttons (not divs)
  - Use `<label>` for filter options
  - Use `<time>` element for dates/times where applicable
  - Component tests for semantic structure
  - _Requirements: 12.1, 12.2_

- [x] 18. Implement keyboard navigation and focus management
  - Tab order: left-to-right, top-to-bottom
  - Interactive elements: View buttons → Navigation → Filters → Days/Activities
  - Enter/Space keys activate buttons and day cells
  - Escape key (optional): close dropdowns or return to previous view
  - Arrow keys (optional enhancement): navigate between days
  - Focus visible on ALL interactive elements: `focus:outline-none focus:ring-2 focus:ring-blue-500`
  - Focus indicator: 3px solid outline, high contrast (blue-600 or similar)
  - No keyboard traps: Tab always allows forward/backward movement
  - Sticky header doesn't trap focus
  - Component tests for keyboard navigation
  - Component tests for focus visibility
  - _Requirements: 12.3-12.5, 12.9_

- [x] 19. Implement ARIA labels and descriptions
  - Day cell ARIA:
    - `aria-label="Monday, March 15, 2024 - 3 activities: 1 Task, 1 Exam, 1 Assignment"`
    - `aria-selected={isSelected}`
  - Activity card ARIA:
    - `aria-label="Task: Study Chapter 3 - Mathematics - Due Mar 15 at 3:00 PM - High Priority - 2 days remaining"`
  - Filter button ARIA:
    - `aria-pressed={isActive}` for toggle buttons
    - `aria-label="Filter by Tasks (currently selected)"`
  - Dropdown ARIA:
    - `aria-label="Filter by Subject"`, `aria-expanded={isOpen}`
  - Landmarks ARIA:
    - `<main role="main" aria-label="Calendar">`
    - `<nav aria-label="Calendar Navigation">`
  - Region descriptions:
    - All-day section: `aria-label="All-day activities"`
  - Screen reader announcements for state changes
  - Component tests for ARIA presence and correctness
  - _Requirements: 12.7, 12.8, 12.9, 12.10_

- [x] 20. Implement screen reader support
  - Announce view changes: "Switched to week view, showing Mar 10-16, 2024"
  - Announce filter changes: "Filtering by: Mathematics, Tasks only"
  - Announce offline status: "Calendar offline - Last updated 2 hours ago"
  - Announce date navigation: "Navigated to March 2024"
  - Activity announcements in Day View (screen reader order):
    - All-day activities first
    - Then timed activities in chronological order
  - Use `announceToScreenReader()` utility for dynamic content updates
  - Test with NVDA and VoiceOver
  - Manual accessibility testing checklist
  - _Requirements: 12.1-12.10_

- [x] 21. Implement color contrast and accessibility colors
  - Activity Type colors (all with 4.5:1+ contrast on white):
    - Task: #3B82F6 (blue-500) - verified contrast
    - Exam: #EF4444 (red-500) - verified contrast
    - Assignment: #10B981 (green-500) - verified contrast
  - Urgency colors (all with 3:1+ contrast):
    - Critical: #DC2626 (red-600) with white text
    - High: #F97316 (orange-500) with white text
    - Medium: #EAB308 (yellow-500) with dark text
    - Low: #9CA3AF (gray-400) with dark text
  - Focus indicator: #2563EB (blue-600) 3px solid - 4.5:1+ contrast
  - Text on colored backgrounds: 4.5:1+ contrast ratio
  - Non-color visual indicators:
    - Activity type also indicated by: text label, icon (optional), position
    - Urgency also indicated by: text label, badge text
  - Use axe accessibility audit tool to verify
  - _Requirements: 4.6, 12.10_

### Phase 5: Performance Optimization

- [x] 22. Implement code splitting and lazy loading
  - Lazy-load WeekView component: `const WeekView = lazy(() => import('./WeekView'))`
  - Lazy-load DayView component: `const DayView = lazy(() => import('./DayView'))`
  - Wrap with Suspense boundaries: `<Suspense fallback={<LoadingPlaceholder />}>`
  - Lazy-load FilterBar on first interaction
  - Calendar feature bundle target: < 100KB gzipped
  - Use dynamic imports for heavy utilities
  - Bundle analyzer: measure and report sizes
  - _Requirements: 13.4, 13.7-13.8_

- [x] 23. Implement React optimization: memoization and callbacks
  - Memoize DayCell component: `React.memo(DayCell, customComparison)`
  - Memoize ActivityCard component: `React.memo(ActivityCard, customComparison)`
  - Memoize FilterBar component: `React.memo(FilterBar, customComparison)`
  - Use `useCallback` for event handlers passed to memoized children
  - Use `useMemo` for expensive calculations:
    - Calendar grid generation
    - Activity grouping by time
    - Filter application to large datasets
  - Avoid unnecessary re-renders from parent updates
  - Implement custom comparison functions for memoization
  - Performance profiler: measure re-render frequency
  - _Requirements: 13.8_

- [x] 24. Implement lazy loading for adjacent months/weeks
  - Load current month/week on initial page load
  - Preload adjacent months/weeks on first navigation (background)
  - Unload old months/weeks from memory after 24 hours
  - Cache management: keep last 3 months in cache
  - Implement progressive loading: show skeleton while loading
  - _Requirements: 13.7_

- [x] 25. Optimize database queries for performance
  - Verify single-query pattern: all activities in one SELECT
  - Ensure indexes exist: `(user_id, type, due_date)`, `(user_id, type, date)`, `(user_id, type)`
  - Query execution target: < 1 second
  - Test with varying data sizes: 10, 100, 1000 activities
  - Verify N+1 query problem doesn't occur
  - Use EXPLAIN ANALYZE to verify query plan
  - Database tests for query performance
  - _Requirements: 13.5-13.6, 15.1_

- [x] 26. Implement image and asset optimization
  - Use Next.js `<Image>` component for all images
  - Optimize SVG icons: remove unnecessary attributes, compress
  - Lazy-load off-screen images with `loading="lazy"`
  - Responsive images with `srcSet` and sizes attribute
  - Minimize icon file sizes (< 1KB each)
  - _Requirements: 13.6_

- [x] 27. Measure and document performance metrics
  - Initial page load (First Contentful Paint): target < 2 seconds
  - Time to Interactive: target < 3 seconds
  - View navigation: target < 500ms cached, < 1s uncached
  - Run Lighthouse CI: monitor scores on every commit
  - Create performance budget: max 100KB for calendar feature (gzipped)
  - Document baseline metrics in README
  - _Requirements: 13.1-13.4_

### Phase 6: Offline Support & Caching

- [x] 28. Implement IndexedDB caching for calendar data
  - Use IndexedDB instead of localStorage (larger capacity)
  - Cache key structure: `calendar_${userId}_${viewMode}_${dateRange}`
  - Cache entry structure: `{ data, timestamp, ttl }`
  - TTL: 1 hour (3600000 ms)
  - Functions:
    - `cacheCalendarData()` - store data with timestamp
    - `getCachedCalendarData()` - retrieve and check TTL
    - `isCacheExpired()` - check if past TTL
    - `clearExpiredCache()` - cleanup old entries
    - `invalidateCalendarCache()` - clear specific cache entries
  - Cache invalidation on activity CRUD (mutation detected)
  - Unit tests for cache operations
  - _Requirements: 14.1-14.8_

- [x] 29. Implement offline detection and indicators
  - Listen to browser `online` and `offline` events
  - Display offline indicator: "Offline - Last updated: 2 hours ago"
  - Position: top banner or discreet notification
  - Shows cache age and last sync time
  - Hide offline indicator when back online
  - Component: `<OfflineIndicator />`
  - Test on real network (toggle airplane mode, throttle)
  - _Requirements: 14.2_

- [x] 30. Implement offline navigation and data display
  - When offline, calendar navigation (months/weeks/days) uses cached data
  - If navigating to uncached period: show message "This month is not available offline"
  - Offer button to try loading if connection restored
  - Maintain current view when cache unavailable
  - Filtering and view switching work with cached data
  - Activity interactions (no mutations) work without errors
  - Unit tests for offline navigation
  - Manual testing with network throttling
  - _Requirements: 14.3-14.4, 14.8_

- [x] 31. Implement reconnection data refresh
  - Detect when browser comes back online
  - Auto-fetch fresh data for currently displayed date range
  - Show brief "Syncing..." notification
  - Update display with fresh data
  - Update cache with new data
  - Fallback: show cached data if refresh fails
  - Unit tests for reconnection logic
  - Manual testing (toggle offline/online)
  - _Requirements: 14.5_

- [x] 32. Implement offline-first architecture
  - Check cache first before making API request
  - Serve cached data immediately if available and not expired
  - Fetch fresh data in background if cache stale
  - Update cache on successful fetch
  - Don't block UI waiting for network request
  - Handle cache expiration gracefully
  - Store cache metadata: createdAt, expiresAt
  - _Requirements: 14.1-14.8_

### Phase 7: Error Handling & Edge Cases

- [x] 33. Implement error handling for network failures
  - Network error on initial load: "Unable to load calendar - please try again"
  - Display retry button
  - Load cached data if available
  - Network error on navigation: "Unable to load [Month] - please check your connection"
  - Keep current month displayed (don't lose context)
  - Don't block other interactions
  - Network error on filter change: "Filter error - resetting to previous filter"
  - Unit tests for error scenarios
  - _Requirements: 7 (Edge Cases)_

- [x] 34. Implement error handling for data anomalies
  - Missing required fields (date, title, type): skip activity from display
  - Log error with activity ID
  - Adjust activity count accordingly
  - Display count excludes invalid activities
  - Invalid date format: skip activity
  - Subject not found (deleted): display with "Unknown Subject" label
  - Still apply type-based coloring
  - Unit tests for data anomalies
  - _Requirements: 7 (Edge Cases)_

- [x] 35. Implement empty state messaging
  - No activities in selected period: "No activities for this period"
  - No activities after filtering: "No activities match this filter - try a different filter"
  - Offer "Clear Filters" button to reset
  - Offer "Create new activity" link
  - Desktop/mobile specific messaging
  - _Requirements: 10.10, 7 (Edge Cases)_

- [x] 36. Implement loading states and skeletons
  - Initial page load: show calendar skeleton (faded grid)
  - Navigation loading: show spinner or skeleton for new period
  - Lazy-loaded view components: show Suspense boundary placeholder
  - Cache + network loading: show "Syncing..." indicator briefly
  - Performance: skeleton display shouldn't add to load time
  - Component tests for skeleton display
  - _Requirements: 13.4_

- [x] 37. Implement session expiration handling
  - User session expires while viewing calendar
  - Show: "Session expired - please log in again"
  - Provide login link
  - Preserve calendar state (return after login)
  - Catch 401/403 errors from Server Actions
  - Redirect to login page
  - Unit tests for auth error handling
  - _Requirements: 7 (Edge Cases)_

- [x] 38. Implement edge cases for date/time handling
  - Handle dates across year boundaries (Dec → Jan)
  - Handle leap years (Feb 29)
  - Handle daylight saving time transitions
  - Handle timezones (convert to user's timezone)
  - Handle activities without times (all-day activities)
  - Handle very long activity titles (truncate with ellipsis)
  - Handle overlapping time slots in week view (stack side-by-side)
  - Unit tests for edge cases
  - _Requirements: 7 (Edge Cases)_

### Phase 8: Integration & Navigation

- [x] 39. Implement route structure and URL parameters
  - Route: `/app/(main)/calendar` - default Month View
  - Query parameters:
    - `?view=month|week|day` - view mode
    - `?date=YYYY-MM-DD` - specific date
    - `?filter=tasks|exams|assignments` - type filter
    - `?subject=UUID` - subject filter
  - Combine parameters: `?view=week&date=2024-03-15&filter=exams`
  - Preserve URL state when navigating
  - Support browser back/forward buttons
  - Update URL when calendar state changes
  - Server-side route handling in page.tsx
  - _Requirements: 8 (Integration)_

- [x] 40. Implement navigation links to/from other features
  - From Dashboard: "View full calendar" link to `/calendar`
  - From Activities List: "View on calendar" link for each activity
  - From Activity detail (when implemented): link to calendar filtered by subject
  - Calendar to Activity detail (when implemented): click activity to view details
  - Navigation maintains context (return to calendar maintains state)
  - Use Next.js Link component for client-side navigation
  - _Requirements: 8 (Integration)_

- [x] 41. Implement cache invalidation on activity mutations
  - Listen for activity created/updated/deleted events
  - Invalidate cache for affected date ranges
  - Trigger calendar refresh on next view of affected period
  - Or use Supabase real-time subscriptions (optional future enhancement)
  - Use cache invalidation helper: `invalidateCalendarCache(dateRange)`
  - Unit tests for cache invalidation
  - _Requirements: 8 (Integration)_

- [x] 42. Implement coordination with Activity feature
  - Share same activity filtering logic (type, subject)
  - Share same color coding system
  - Share same data retrieval patterns
  - Share same formatting utilities
  - Activity CRUD operations trigger calendar cache invalidation
  - Unit tests for feature coordination
  - _Requirements: 8 (Integration)_

### Phase 9: Testing - Unit Tests

- [x] 43. Write unit tests for calendar domain logic
  - Test `calculateUrgency()` function:
    - Today/overdue: critical
    - 1-3 days: high
    - 4-7 days: medium
    - 8+ days: low
  - Test `isOverdue()` function with various dates
  - Test activity type guards
  - Use Vitest with 80%+ coverage target
  - Test file: `__tests__/features/calendar/domain.test.ts`
  - _Requirements: 17.1-17.6_

- [x] 44. Write unit tests for calendar data formatting
  - Test `formatDate()` returns "MMM DD, YYYY" format
  - Test `formatTime()` returns "h:mm AM/PM" format
  - Test `formatMonthYear()` returns full month name
  - Test `formatDateRange()` returns "MMM DD - MMM DD, YYYY"
  - Test `truncateTitle()` truncates to 40/60 chars with ellipsis
  - Test `truncateSubject()` truncates to 25 chars
  - Test relative date labels: "Today", "Tomorrow", "Yesterday"
  - Test locale-specific formatting
  - Test file: `__tests__/features/calendar/formatting.test.ts`
  - _Requirements: 16.1-16.9_

- [x] 45. Write unit tests for MonthView component
  - Test grid displays all days of month
  - Test grid includes filler days from prev/next months
  - Test today's date is visually distinct
  - Test activity indicator displays for days with activities
  - Test empty days have no indicators
  - Test day cell click navigation
  - Test month navigation (previous/next)
  - Test responsive layout on different screen sizes
  - Test file: `__tests__/features/calendar/components/MonthView.test.tsx`
  - _Requirements: 1.2-1.10, 11.1-11.10_

- [x] 46. Write unit tests for WeekView component
  - Test displays 7 consecutive days
  - Test time slots span 6 AM - 11 PM
  - Test timed activities positioned in correct time slots
  - Test all-day activities in separate section
  - Test current time indicator shows on today
  - Test day navigation (previous/next week)
  - Test date range header displays correctly
  - Test file: `__tests__/features/calendar/components/WeekView.test.tsx`
  - _Requirements: 2.2-2.10, 11.1-11.10_

- [x] 47. Write unit tests for DayView component
  - Test displays all activities for selected day
  - Test activities organized by time
  - Test all-day activities in dedicated section
  - Test empty day shows appropriate message
  - Test activity count in header matches displayed count
  - Test day navigation (previous/next day)
  - Test return to calendar button
  - Test file: `__tests__/features/calendar/components/DayView.test.tsx`
  - _Requirements: 3.1-3.10_

- [x] 48. Write unit tests for ActivityCard component
  - Test displays title, subject, type, time, priority
  - Test correct color for activity type
  - Test correct background color for urgency
  - Test type badge displays correctly
  - Test priority badge displays for tasks
  - Test ARIA label is descriptive
  - Test responsive text truncation
  - Test file: `__tests__/features/calendar/components/ActivityCard.test.tsx`
  - _Requirements: 3.4, 4.2-4.7, 5.2-5.3_

- [x] 49. Write unit tests for FilterBar component
  - Test all filter buttons display
  - Test filter button toggle (on/off)
  - Test subject dropdown populated
  - Test filter state persistence
  - Test clear filters button appears when filters active
  - Test keyboard accessibility
  - Test ARIA labels on filters
  - Test file: `__tests__/features/calendar/components/FilterBar.test.tsx`
  - _Requirements: 10.1-10.10_

- [x] 50. Write unit tests for calendar data retrieval
  - Test `getCalendarData()` Server Action
  - Test input validation with Zod schema
  - Test authentication check
  - Test cache check for offline mode
  - Test error handling with descriptive messages
  - Test data retrieved matches expected format
  - Test single query execution (no N+1)
  - Test file: `__tests__/features/calendar/actions/getCalendarData.test.ts`
  - _Requirements: 15.1-15.10_

- [x] 51. Write unit tests for offline cache operations
  - Test `cacheCalendarData()` stores data with timestamp
  - Test `getCachedCalendarData()` retrieves data
  - Test `isCacheExpired()` correctly checks TTL
  - Test cache expires after 1 hour
  - Test `clearExpiredCache()` removes old entries
  - Test `invalidateCalendarCache()` clears specific entries
  - Test file: `__tests__/shared/lib/calendarCache.test.ts`
  - _Requirements: 14.1-14.8_

### Phase 10: Testing - Property-Based Tests

- [x] 52. Write property test: Month grid contains all days
  - **Property 1: Month Grid Contains All Days of Month**
  - Use fast-check to generate random dates
  - Verify all day numbers 1 to last-day appear exactly once
  - Verify grid structure 6x7
  - Test file: `__tests__/features/calendar/properties/monthGrid.property.test.ts`
  - **Validates: Requirements 1.2, 1.3** _(Properties 1, 2)_

- [x] 53. Write property test: Activity indicators match count
  - **Property 16: Activity Indicator Count Matches Activity Count**
  - Generate random activity lists for random dates
  - Verify indicator count matches activity count
  - Test 0, 1, 2-3, 4+ activity scenarios
  - Test file: `__tests__/features/calendar/properties/indicators.property.test.ts`
  - **Validates: Requirements 6.1-6.6** _(Properties 3, 4, 16, 17)_

- [x] 54. Write property test: Single query retrieves all activities
  - **Property 30: Single Query Retrieves All Activities**
  - Mock database to count queries executed
  - Verify exactly 1 query executed per view
  - Generate random dates and date ranges
  - Verify all returned activities match filter criteria
  - Test file: `__tests__/features/calendar/properties/queryCount.property.test.ts`
  - **Validates: Requirements 15.1-15.6** _(Properties 30-35)_

- [x] 55. Write property test: Formatting doesn't mutate source data
  - **Property 45: Formatting Does Not Mutate Source Data**
  - Generate random activities with long titles/dates
  - Format for display (truncate, reformat)
  - Verify original data unchanged after formatting
  - Test file: `__tests__/features/calendar/properties/dataMutation.property.test.ts`
  - **Validates: Requirements 17.1-17.6** _(Properties 44, 45)_

- [x] 56. Write property test: Urgency calculation correctness
  - **Property 14: Urgency Calculated from Days Until Due**
  - Generate random daysUntilDue values (-100 to +100)
  - Verify urgency level matches threshold:
    - <= 0: critical
    - 1-3: high
    - 4-7: medium
    - 8+: low
  - Test file: `__tests__/features/calendar/properties/urgency.property.test.ts`
  - **Validates: Requirements 5.1-5.7** _(Properties 14, 15)_

- [x] 57. Write property test: Navigation maintains view mode
  - **Property 19: Navigation Maintains View Mode**
  - Generate random view modes and navigation sequences
  - Verify view mode never changes during navigation
  - Test file: `__tests__/features/calendar/properties/navigation.property.test.ts`
  - **Validates: Requirements 7.9, 8.10** _(Properties 5, 19, 20)_

- [x] 58. Write property test: Week contains 7 consecutive days
  - **Property 6: Week View Displays Seven Consecutive Days**
  - Generate random start dates
  - Calculate 7-day week
  - Verify exactly 7 days, consecutive, no gaps/duplicates
  - Test file: `__tests__/features/calendar/properties/weekDays.property.test.ts`
  - **Validates: Requirements 2.2** _(Properties 6, 20)_

- [x] 59. Write property test: Filter persistence across views
  - **Property 26: Filters Persist During Navigation**
  - Generate random filters and navigation sequences
  - Apply filter, navigate multiple times
  - Verify filters remain applied after each navigation
  - Test file: `__tests__/features/calendar/properties/filterPersistence.property.test.ts`
  - **Validates: Requirements 10.5-10.6** _(Properties 25, 26, 27)_

- [x] 60. Write property test: Color coding consistency
  - **Property 12: Activity Type Color Assignment is Consistent**
  - Generate random activities and view modes
  - Verify color matches type consistently across views
  - Test file: `__tests__/features/calendar/properties/colorCoding.property.test.ts`
  - **Validates: Requirements 4.1-4.5** _(Properties 12, 13)_

- [x] 61. Write property test: Offline cache TTL expiration
  - **Property 49: Offline Cache Expires After TTL**
  - Generate random cache entries with various timestamps
  - Verify entries expire after 1 hour
  - Test file: `__tests__/features/calendar/properties/cacheTTL.property.test.ts`
  - **Validates: Requirements 14.6** _(Properties 49)_

### Phase 11: Testing - E2E Tests (Playwright)

- [x] 62. Write E2E test: Load calendar and view month
  - Playwright test file: `e2e/specs/calendar.spec.ts`
  - Scenario: User loads calendar, sees current month view
  - Verify: Month grid displays, today's date highlighted, activities visible
  - Measure: Load time < 2 seconds
  - _Requirements: 1.1-1.10, 13.1-13.3_

- [x] 63. Write E2E test: Navigate between months
  - Click previous/next month buttons
  - Verify: Month changes, activities update, header reflects new month
  - Performance: Navigation < 500ms cached
  - _Requirements: 7.3-7.8_

- [x] 64. Write E2E test: Switch between view modes
  - Click Month → Week → Day buttons
  - Verify: Each view displays correctly, context maintained
  - Performance: View switch < 1 second
  - _Requirements: 2.1, 3.1, 8.1-8.10_

- [x] 65. Write E2E test: Click day cell to view day
  - Click on day cell in month view
  - Verify: Navigates to Day View, correct day displays, all activities listed
  - _Requirements: 3.1-3.10, 7.1_

- [x] 66. Write E2E test: Apply and clear filters
  - Apply type filter (Tasks only)
  - Verify: Only tasks display across all views, filter indicator shows
  - Click Clear Filters
  - Verify: All activities display again
  - _Requirements: 10.1-10.10_

- [x] 67. Write E2E test: Offline functionality
  - Load calendar online (cache data)
  - Go offline (use Playwright networkIdle, simulate offline)
  - Navigate to different month (use cached data)
  - Verify: Calendar displays cached data, offline indicator shows
  - Go online
  - Verify: Data syncs, offline indicator disappears
  - _Requirements: 14.1-14.8_

- [x] 68. Write E2E test: Responsive design on mobile
  - Run test on mobile viewport (375x812)
  - Verify: Month view displays correctly, day cells 44px+
  - Click day cell, navigate to week view
  - Verify: Week displays vertically, touch targets 44px+
  - _Requirements: 11.1-11.10_

- [x] 69. Write E2E test: Keyboard navigation
  - Tab through interactive elements
  - Verify: Focus visible on all elements, logical order
  - Press Enter on day cell
  - Verify: Navigates to Day View
  - Test Escape (if implemented): close modals
  - _Requirements: 12.3-12.5_

- [x] 70. Write E2E test: Accessibility with screen reader
  - Use Playwright accessibility snapshot testing
  - Run axe audit on calendar page
  - Verify: No accessibility violations
  - _Requirements: 12.1-12.10_

- [x] 71. Write E2E test: Performance benchmarks
  - Measure initial load time: FCP < 2s, TTI < 3s
  - Measure view switching: < 500ms cached
  - Measure with 50, 100, 500 activities
  - Report metrics in CI logs
  - _Requirements: 13.1-13.4_

### Phase 12: Checkpoint & Verification

- [x] 72. Checkpoint - Ensure all tests pass
  - Run unit tests: `npm run test -- calendar` - all tests pass
  - Run property tests: all 50 properties verify correctly
  - Run E2E tests: `npm run test:e2e calendar.spec.ts` - all scenarios pass
  - Fix any failures before proceeding
  - Ensure all tests passing in CI
  - Report test coverage: 80%+ for calendar feature

- [x] 73. Verify accessibility compliance
  - Run axe-core audit: pass all checks
  - Manual testing with VoiceOver (macOS) and NVDA (Windows)
  - Verify keyboard navigation: Tab order logical, no traps, focus visible
  - Verify color contrast: all colors meet 4.5:1 or 3:1 requirements
  - Test zoom to 200%: layout doesn't break, text readable
  - Document accessibility testing results
  - _Requirements: 12.1-12.10_

- [x] 74. Verify performance metrics
  - Initial load: < 2 seconds (First Contentful Paint)
  - Time to Interactive: < 3 seconds
  - View navigation: < 500ms cached, < 1s uncached
  - Bundle size: < 100KB gzipped (calendar feature)
  - Database query: < 1 second
  - Run Lighthouse CI: score ≥ 90
  - Document baseline metrics
  - _Requirements: 13.1-13.4_

- [x] 75. Verify offline functionality
  - Load calendar, cache data
  - Go offline, navigate to cached month
  - Verify: Data displays, offline indicator shows, interactions work
  - Go online, verify: Data syncs, offline indicator hides
  - Test offline navigation to uncached month
  - Verify: "Not available offline" message, appropriate handling
  - Document offline testing results
  - _Requirements: 14.1-14.8_

- [x] 76. Verify data integrity and correctness
  - Run all 50 property tests: all properties pass
  - Run round-trip tests: fetch → format → re-fetch = identical
  - Verify: No data mutations during formatting
  - Verify: All activities render correctly across views
  - Verify: Filters work correctly on complex datasets
  - Document data validation results
  - _Requirements: 17.1-17.6_

- [x] 77. Verify feature integration
  - Test links from Dashboard to Calendar
  - Test links from Activities List to Calendar
  - Test cache invalidation on activity mutations
  - Test filtering coordination with Activities feature
  - Test subject colors consistent across features
  - Document integration test results
  - _Requirements: 8 (Integration)_

- [x] 78. Final review and code quality
  - Code review: PR review by team member (5 minutes)
  - Linting: `npm run lint -- calendar` - all warnings fixed
  - Type checking: `npm run type-check` - no errors
  - Test coverage: 80%+ for calendar feature
  - Documentation: JSDoc comments on all public functions
  - Remove console.log statements (except error logging)
  - Ensure consistent code style with project standards
  - _Requirements: All_

## Notes

- All components use TypeScript strict mode for type safety
- All styling uses Tailwind CSS (no custom CSS unless absolutely necessary)
- All data access uses Supabase with Row-Level Security
- All Server Actions use Zod for input validation
- All tests use Vitest for unit/property tests, Playwright for E2E tests
- All code follows project naming conventions and architectural patterns
- Tasks marked with `*` are optional testing sub-tasks that can be skipped for MVP
- Non-optional tasks (those without `*`) must be completed for feature release
- Property-based tests (tasks 52-61) verify universal correctness properties
- Each property test references specific requirements and properties from design document
- Performance targets: Initial load < 2s, TTI < 3s, view switch < 500ms (cached)
- Accessibility target: WCAG 2.1 Level AA compliance, axe audit pass
- Offline target: Full offline support with cache TTL of 1 hour
