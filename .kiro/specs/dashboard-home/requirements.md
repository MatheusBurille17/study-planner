# Dashboard Feature Requirements

## Introduction

The Dashboard is the home screen of Amanda's Study Planner, providing students with a 360° overview of their academic commitments. It consolidates pending tasks, upcoming exams, assignments, and key study statistics in a single, visually organized interface. The Dashboard serves as the primary entry point after login and enables quick access to all core features of the application.

## Glossary

- **Dashboard:** The home screen displaying a summary of all academic activities and statistics
- **Activity:** A generic term for Tasks, Exams, or Assignments managed by the student
- **Task:** A personal study activity (e.g., "Study Chapter 3", "Complete exercises")
- **Exam:** A scheduled academic assessment (written, oral, or practical)
- **Assignment:** A deliverable task with a deadline (e.g., essay, project, presentation)
- **Pending:** Activities that are not yet completed (status: "todo" or "in-progress")
- **Upcoming:** Activities with due dates within the next 14 days
- **Overdue:** Activities with due dates in the past that are not completed
- **Quick Stats:** Key metrics displayed as summary cards (completion %, hours estimated, tasks by priority)
- **User:** An authenticated student using the application
- **Refresh:** Reload the Dashboard data to reflect the latest activity state
- **Server Action:** Next.js server-side function handling data retrieval and business logic
- **Supabase:** PostgreSQL database backend with real-time capabilities

## Requirements

### Requirement 1: Display Pending Tasks Summary

**User Story:** As a student, I want to see a summary of my pending tasks on the Dashboard, so that I can quickly understand what work I need to complete.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display a dedicated section for Pending Tasks
2. THE Pending Tasks section SHALL display all Tasks with status "todo" or "in-progress" for the logged-in User
3. THE Pending Tasks section SHALL display a maximum of 5 Tasks, sorted by due date (earliest first)
4. FOR each pending Task, THE Dashboard SHALL display: task title, due date, priority level (visual indicator), and associated subject (if any)
5. WHEN more than 5 pending Tasks exist, THE Dashboard SHALL display a "View All" link to navigate to the Activities List view
6. WHEN no pending Tasks exist, THE Dashboard SHALL display a message "No pending tasks. Great job!"
7. WHEN a Task status is updated to "completed", THE Pending Tasks section SHALL remove it from the display on next refresh

#### Success Criteria

- Pending Tasks section displays within 1 second of Dashboard load
- All pending Tasks for the User are included (no Tasks missed)
- Tasks are sorted by due date ascending
- Priority levels are visually distinct (color-coded: red for high, yellow for medium, green for low)

---

### Requirement 2: Display Upcoming Exams

**User Story:** As a student, I want to see my upcoming exams on the Dashboard, so that I can plan my study schedule in advance.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display a dedicated section for Upcoming Exams
2. THE Upcoming Exams section SHALL display all Exams with a date within the next 14 days from today
3. THE Upcoming Exams section SHALL display a maximum of 5 Exams, sorted by date (earliest first)
4. FOR each upcoming Exam, THE Dashboard SHALL display: exam subject, exam date, exam time (if available), and exam type (written, oral, practical)
5. WHEN more than 5 upcoming Exams exist, THE Dashboard SHALL display a "View All" link to navigate to the Calendar view filtered for Exams
6. WHEN no upcoming Exams exist within 14 days, THE Dashboard SHALL display "No upcoming exams. You're all set!"
7. WHEN the current date passes an Exam date, THE Upcoming Exams section SHALL not display that Exam on next refresh

#### Success Criteria

- Upcoming Exams section displays within 1 second of Dashboard load
- Only Exams within the next 14 days are shown
- All upcoming Exams for the User are included (no Exams missed)
- Exams are sorted by date ascending
- Exam date and time are clearly visible and formatted consistently (e.g., "Mar 15, 2024 at 10:00 AM")

---

### Requirement 3: Display Upcoming Assignments

**User Story:** As a student, I want to see my upcoming assignment deadlines on the Dashboard, so that I can prioritize my work effectively.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display a dedicated section for Upcoming Assignments
2. THE Upcoming Assignments section SHALL display all Assignments with a due date within the next 14 days from today
3. THE Upcoming Assignments section SHALL display a maximum of 5 Assignments, sorted by due date (earliest first)
4. FOR each upcoming Assignment, THE Dashboard SHALL display: assignment title, subject, due date, and assignment type (written, presentation, project)
5. WHEN more than 5 upcoming Assignments exist, THE Dashboard SHALL display a "View All" link to navigate to the Calendar view filtered for Assignments
6. WHEN no upcoming Assignments exist within 14 days, THE Dashboard SHALL display "No upcoming assignments. You're good to go!"
7. WHEN an Assignment due date passes, THE Upcoming Assignments section SHALL not display that Assignment on next refresh

#### Success Criteria

- Upcoming Assignments section displays within 1 second of Dashboard load
- Only Assignments within the next 14 days are shown
- All upcoming Assignments for the User are included (no Assignments missed)
- Assignments are sorted by due date ascending

---

### Requirement 4: Display Quick Statistics

**User Story:** As a student, I want to see key study metrics on the Dashboard, so that I can track my productivity and progress.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display a Quick Statistics section with at least 4 metric cards
2. THE first metric card SHALL display the overall task completion percentage (completed Tasks / total Tasks), rounded to the nearest integer, with a visual progress indicator
3. THE second metric card SHALL display the count of overdue Activities (Tasks, Exams, or Assignments with due date in the past and not completed)
4. THE third metric card SHALL display the total estimated hours from all pending Tasks (sum of estimatedTimeMinutes converted to hours, rounded to 1 decimal place)
5. THE fourth metric card SHALL display a breakdown of pending Tasks by priority level (e.g., "3 High, 2 Medium, 1 Low")
6. THE Quick Statistics section SHALL update when the Dashboard is refreshed
7. IF no Tasks have been created yet, THE completion percentage SHALL display as 0% with a progress indicator showing 0% progress
8. IF the sum of estimated hours is 0, THE hours card SHALL display "0 hrs estimated"

#### Success Criteria

- All 4 metric cards display clearly and are visually distinct
- Completion percentage is calculated accurately (only Tasks, not Exams/Assignments)
- Overdue count is accurate and updates on refresh
- Estimated hours are calculated accurately from pending Tasks only
- Priority breakdown is accurate (counts only pending Tasks with each priority level)
- All metrics are displayed within 1 second of Dashboard load

---

### Requirement 5: Display Quick Action Links

**User Story:** As a student, I want quick access to create new activities from the Dashboard, so that I can efficiently add tasks without navigating through multiple screens.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display a "Quick Actions" section or button group with at least 3 action buttons
2. THE first button SHALL be labeled "+ New Task" and link to the Task creation form
3. THE second button SHALL be labeled "+ New Exam" and link to the Exam creation form
4. THE third button SHALL be labeled "+ New Assignment" and link to the Assignment creation form
5. WHEN a user clicks any action button, THE application SHALL navigate to the corresponding creation form with the button functioning as a clickable link or trigger
6. THE Quick Actions buttons SHALL be visually prominent and accessible from anywhere on the Dashboard

#### Success Criteria

- All 3 action buttons are visible and accessible
- Buttons are clearly labeled and visually distinct
- Each button navigates to the correct creation form
- Buttons are responsive and work on mobile and desktop

---

### Requirement 6: Display Overdue Activities Alert

**User Story:** As a student, I want to be notified of overdue activities on the Dashboard, so that I can immediately address missed deadlines.

#### Acceptance Criteria

1. WHEN the Dashboard loads and there are overdue Activities, THE Dashboard SHALL display a prominent alert banner at the top
2. THE alert banner SHALL display the count of overdue Activities (e.g., "You have 2 overdue items")
3. THE alert banner SHALL include a link to view all overdue Activities in the Activities List with filters applied
4. THE alert banner SHALL use a warning color (orange or red) to draw attention
5. WHEN there are no overdue Activities, THE alert banner SHALL not be displayed
6. WHEN a user marks an overdue Activity as completed, THE alert banner count SHALL update on next refresh

#### Success Criteria

- Alert banner displays only when overdue Activities exist
- Alert count is accurate
- Alert is visually prominent and uses appropriate warning colors
- Link to view overdue Activities works correctly

---

### Requirement 7: Display Dashboard Header with Welcome Message

**User Story:** As a student, I want to see a personalized welcome message on the Dashboard, so that I feel the app is tailored to me.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL display a header with a personalized welcome message
2. THE welcome message SHALL include the User's first name (e.g., "Welcome, Amanda!")
3. THE welcome message SHALL include a dynamic greeting based on time of day ("Good morning", "Good afternoon", "Good evening")
4. THE header SHALL display the current date in a user-friendly format (e.g., "Tuesday, March 12, 2024")
5. THE header SHALL be positioned at the top of the Dashboard
6. THE header background SHALL use a subtle color or gradient to distinguish it from the main content

#### Success Criteria

- Welcome message displays on Dashboard load
- User's first name is correctly retrieved and displayed
- Time-based greeting changes appropriately (morning: 5 AM - 12 PM, afternoon: 12 PM - 6 PM, evening: 6 PM - 5 AM)
- Date is correctly calculated and formatted
- Header is responsive and displays correctly on mobile and desktop

---

### Requirement 8: Implement Dashboard Data Refresh Mechanism

**User Story:** As a student, I want to refresh the Dashboard data manually and automatically, so that I always see up-to-date information about my activities.

#### Acceptance Criteria

1. WHEN the Dashboard is first loaded, THE Dashboard SHALL automatically fetch all required data from the database
2. WHEN a user pulls down the page (on mobile), THE Dashboard SHALL display a refresh indicator and reload all data
3. WHEN a user clicks a refresh button (if available), THE Dashboard SHALL reload all data and display a brief loading state
4. WHEN the user returns to the Dashboard after 5 minutes of inactivity, THE Dashboard SHALL automatically refresh the data
5. WHILE data is being refreshed, THE Dashboard SHALL display a loading indicator (skeleton loaders or subtle spinner)
6. AFTER data refresh completes, THE Dashboard SHALL update all sections with the latest data
7. IF a data refresh fails, THE Dashboard SHALL display an error message "Could not refresh. Please try again." with a retry button

#### Success Criteria

- Initial data load completes within 2 seconds
- Manual refresh completes within 1-2 seconds
- Auto-refresh after inactivity works without user action
- All sections update with latest data after refresh
- Error handling displays clear messages and provides retry option

---

### Requirement 9: Implement Responsive Dashboard Layout

**User Story:** As a student, I want the Dashboard to work seamlessly on my mobile phone, tablet, and desktop, so that I can access it from any device.

#### Acceptance Criteria

1. WHEN the Dashboard is viewed on a mobile device (< 768px width), THE layout SHALL display sections in a single-column stack
2. WHEN the Dashboard is viewed on a tablet device (768px - 1024px width), THE layout SHALL display sections in a two-column grid
3. WHEN the Dashboard is viewed on a desktop device (> 1024px width), THE layout SHALL display sections in a responsive grid (2-3 columns as appropriate)
4. WHEN sections are resized due to viewport changes, THE Dashboard text and components SHALL remain readable and not be cut off
5. WHEN viewed on a mobile device, THE Quick Actions buttons SHALL stack vertically and be full-width
6. WHEN viewed on a mobile device with small screens (< 480px), THE card content SHALL use abbreviated text labels (e.g., "3H" instead of "3 High Priority")

#### Success Criteria

- Dashboard displays correctly on mobile (iPhone SE, iPhone 12 Pro, iPhone 14 Pro Max)
- Dashboard displays correctly on tablet (iPad, iPad Pro)
- Dashboard displays correctly on desktop (1920x1080, 2560x1440)
- Text is readable at all breakpoints
- No horizontal scrolling on any device
- Touch targets are at least 44px on mobile
- All interactive elements are accessible and properly sized

---

### Requirement 10: Implement Accessibility for Dashboard

**User Story:** As a student using assistive technologies, I want the Dashboard to be fully accessible, so that I can use it effectively.

#### Acceptance Criteria

1. THE Dashboard SHALL implement semantic HTML structure with proper headings (h1, h2, h3)
2. THE Dashboard sections (Pending Tasks, Upcoming Exams, Upcoming Assignments, Quick Stats) SHALL each have a descriptive heading level that creates a logical content hierarchy
3. ALL interactive elements (buttons, links) SHALL be keyboard accessible using Tab, Enter, and Space keys
4. ALL buttons and links SHALL have descriptive labels (no "Click here" or unlabeled buttons)
5. WHEN a section has no content, THE Dashboard SHALL display descriptive text (not just empty space)
6. ALL color-coded information (priority levels, metric cards) SHALL include text labels in addition to color (e.g., "🔴 High Priority" not just red)
7. THE Dashboard components SHALL have appropriate ARIA labels for screen reader users (e.g., aria-label, aria-describedby)
8. THE Quick Stats metric cards SHALL use aria-label to describe what each metric represents (e.g., "70% task completion rate")
9. THE "View All" links SHALL have descriptive labels (e.g., "View all pending tasks" not just "View All")

#### Success Criteria

- Dashboard passes axe accessibility audit with no errors or warnings
- All sections are navigable using keyboard only
- Screen reader announces all content appropriately
- Color is not the only indicator of information
- ARIA labels are present and descriptive
- Contrast ratios meet WCAG AA standards (4.5:1 for text)
- Focus indicators are visible on all interactive elements

---

### Requirement 11: Implement Performance Optimization for Dashboard

**User Story:** As a student, I want the Dashboard to load and display quickly, so that I can access my information without delays.

#### Acceptance Criteria

1. THE Dashboard initial page load time SHALL be less than 2 seconds (First Contentful Paint)
2. THE Dashboard interactive readiness (Time to Interactive) SHALL be less than 3 seconds
3. THE Dashboard data fetch query SHALL return all required data in a single database query (no N+1 queries)
4. THE Dashboard SHALL implement component-level code splitting to reduce initial bundle size
5. THE Dashboard images and icons SHALL be optimized and compressed (using Next.js Image component)
6. THE Dashboard SHALL implement lazy loading for off-screen sections (lower priority sections load after initial render)
7. WHEN the Dashboard is cached in the browser, THE subsequent page load SHALL complete in less than 500ms
8. THE Dashboard database query SHALL include proper indexes on User ID, due date, and status fields

#### Success Criteria

- Initial load completes in < 2 seconds (measured with Lighthouse)
- Time to Interactive < 3 seconds (measured with Lighthouse)
- Bundle size for Dashboard component < 50KB (gzipped)
- No more than 1 database query on initial load
- Subsequent loads after cache warm-up < 500ms
- All performance metrics meet PWA standards

---

### Requirement 12: Implement Offline Support for Dashboard

**User Story:** As a student, I want to access cached Dashboard data when offline, so that I can continue to view my information even without internet connectivity.

#### Acceptance Criteria

1. WHEN the application is offline, THE Dashboard SHALL display the last cached version of the data
2. WHEN the Dashboard is displayed in offline mode, THE Dashboard SHALL show a subtle offline indicator (e.g., "Offline - Last updated: 2 hours ago")
3. THE Quick Actions buttons (+ New Task, + New Exam, + New Assignment) SHALL be disabled in offline mode with a tooltip explaining why
4. WHEN connectivity is restored, THE Dashboard SHALL automatically refresh the data and remove the offline indicator
5. WHEN the Dashboard data is cached, THE cache TTL (Time To Live) SHALL be 1 hour before automatic expiration
6. WHEN a user manually refreshes offline, THE Dashboard SHALL not attempt a network request and display a message "Unable to refresh - no internet connection"

#### Success Criteria

- Dashboard displays cached data when offline
- Offline indicator displays appropriately
- Quick Actions buttons are disabled in offline mode
- Dashboard auto-refreshes when connectivity is restored
- Cache persists for 1 hour
- No unnecessary network requests in offline mode

---

### Requirement 13: Implement Data Retrieval for Dashboard

**User Story:** As a system, I want to efficiently retrieve all necessary data for the Dashboard, so that the feature is performant and reliable.

#### Acceptance Criteria

1. THE Dashboard data retrieval (Server Action) SHALL fetch: pending Tasks, upcoming Exams (14-day window), upcoming Assignments (14-day window), and calculated statistics in a single query
2. THE data retrieval query SHALL filter all Activities by the current User's ID using Supabase Row-Level Security
3. THE data retrieval query SHALL apply the following filters:
   - **Tasks:** status IN ('todo', 'in-progress') AND userId = current_user_id, ordered by dueDate ASC
   - **Exams:** date BETWEEN today AND today + 14 days AND userId = current_user_id, ordered by date ASC
   - **Assignments:** dueDate BETWEEN today AND today + 14 days AND userId = current_user_id, ordered by dueDate ASC
4. THE data retrieval SHALL calculate completion percentage as: (count of Tasks with status 'completed') / (total count of Tasks) * 100
5. THE data retrieval SHALL calculate overdue count as: count of Activities with (dueDate < today AND status != 'completed')
6. THE data retrieval SHALL calculate estimated hours as: sum of estimatedTimeMinutes from all pending Tasks, converted to hours and rounded to 1 decimal place
7. THE data retrieval SHALL return all data within 1 second from the database
8. IF the data retrieval fails, THE Dashboard Server Action SHALL return an error object with a descriptive error message

#### Success Criteria

- Single database query executes all required data retrieval
- Query execution time < 1 second
- All filters are applied correctly
- All calculations are accurate
- Error handling returns meaningful error messages
- No sensitive data (passwords, auth tokens) is included in response

---

### Requirement 14: Pretty Print and Format Dashboard Data

**User Story:** As a system, I want to format Dashboard data for display, so that users see information in a readable and consistent format.

#### Acceptance Criteria

1. THE Dashboard Pretty Printer SHALL format all dates as: "MMM DD, YYYY" (e.g., "Mar 15, 2024")
2. THE Dashboard Pretty Printer SHALL format all times as: "h:mm AM/PM" (e.g., "2:30 PM")
3. THE Dashboard Pretty Printer SHALL format estimated hours with 1 decimal place (e.g., "5.5 hrs")
4. THE Dashboard Pretty Printer SHALL format completion percentage as an integer with % symbol (e.g., "72%")
5. THE Dashboard Pretty Printer SHALL format priority levels as human-readable text: "High", "Medium", "Low"
6. THE Dashboard Pretty Printer SHALL format task/exam/assignment titles with a maximum of 60 characters, truncating with ellipsis if longer (e.g., "Study Chapter 3: Advanced..." when displayed as preview)
7. THE Dashboard Pretty Printer SHALL format subject names with a maximum of 30 characters for the card display
8. FOR all formatted output, THE Pretty Printer SHALL maintain locale-specific formatting (e.g., date format) based on user preferences

#### Success Criteria

- All dates are formatted consistently across Dashboard
- All times are formatted consistently across Dashboard
- All numeric values are formatted with appropriate precision
- All text is appropriately truncated for display
- Formatted output is human-readable and professional-looking
- Formatting is consistent across all Dashboard sections

---

### Requirement 15: Implement Round-Trip Property for Dashboard Data

**User Story:** As a system, I want to verify that Dashboard data retrieval and formatting is correct, so that I can ensure data integrity.

#### Acceptance Criteria

1. FOR all Dashboard data retrieved from the database, WHEN the data is fetched, formatted for display, and then re-fetched, THE original data and re-fetched data SHALL match exactly (excluding display formatting)
2. FOR a Task with estimatedTimeMinutes = 150, WHEN formatted to display as "2.5 hrs", THEN the raw value SHALL still be 150 minutes when retrieved again from storage
3. FOR an Exam scheduled at "2024-03-15T14:30:00Z", WHEN formatted to display as "Mar 15, 2024 at 2:30 PM", THEN the raw ISO timestamp SHALL remain unchanged in the database
4. FOR a completion percentage calculated as 14/20 * 100 = 70%, WHEN displayed as "70%", THEN the underlying count values SHALL not change (14 completed, 20 total)
5. THE Dashboard round-trip test SHALL verify that fetching, displaying, and re-fetching Dashboard data produces no data loss or mutation

#### Success Criteria

- Round-trip data integrity is verified in tests
- No data is lost or transformed permanently during display formatting
- Original database values remain unchanged after display formatting
- Re-fetched data matches original data exactly

---

## Dependencies

### Spec 1: Authentication & User Management (auth-setup)
- **Dependency:** User authentication required to access Dashboard and retrieve user-specific data
- **Impact:** Dashboard data retrieval requires current User ID from authenticated session
- **Status:** REQUIRED - Must be completed before Dashboard implementation

### Spec 2: Activity Creation & Management (activity-creation, activity-crud)
- **Dependency:** Tasks, Exams, and Assignments must be creatable and stored in database
- **Impact:** Dashboard displays these Activities; creation forms are referenced in Quick Actions
- **Data Requirements:** Dashboard queries Tasks, Exams, and Assignments tables
- **Status:** REQUIRED - Must be completed before Dashboard implementation

### Spec 3: Activity List & Filtering (activity-list-filter)
- **Dependency:** Activities List view with filtering and sorting capabilities
- **Impact:** "View All" links on Dashboard navigate to Activities List
- **Data Requirements:** Same data structures and filters apply
- **Status:** REQUIRED - Must be completed before Dashboard implementation

### No Direct Dependencies on
- Calendar feature (independent, but Dashboard can link to Calendar for viewing Exams/Assignments in detail)
- Notifications feature (independent, but Dashboard can display notification preferences)

## Data Requirements

### Data Needed from Activities (Tasks)
- `id` - Task ID (UUID)
- `title` - Task title (string, max 200 chars)
- `dueDate` - Task due date (ISO date)
- `priority` - Priority level (enum: 'low', 'medium', 'high')
- `status` - Task status (enum: 'todo', 'in-progress', 'completed')
- `estimatedTimeMinutes` - Estimated time in minutes (integer, optional)
- `subjectId` - Associated subject (UUID, optional)
- `userId` - Owner user ID (UUID, for filtering)

### Data Needed from Exams
- `id` - Exam ID (UUID)
- `subjectId` - Associated subject ID (UUID)
- `date` - Exam date (ISO date)
- `time` - Exam time (HH:mm format, optional)
- `type` - Exam type (enum: 'written', 'oral', 'practical')
- `userId` - Owner user ID (UUID, for filtering)

### Data Needed from Assignments
- `id` - Assignment ID (UUID)
- `title` - Assignment title (string, max 200 chars)
- `subjectId` - Associated subject ID (UUID)
- `dueDate` - Assignment due date (ISO date)
- `type` - Assignment type (enum: 'written', 'presentation', 'project')
- `status` - Assignment status (enum: 'pending', 'submitted', 'graded', or similar)
- `userId` - Owner user ID (UUID, for filtering)

### Data Needed from Subjects
- `id` - Subject ID (UUID)
- `name` - Subject name (string, max 100 chars)
- `color` - Subject color for UI (hex color, optional)
- `userId` - Owner user ID (UUID, for filtering)

### Data Needed from User
- `id` - User ID (UUID, for filtering and personalization)
- `firstName` - User's first name (string, max 100 chars)
- `email` - User email (string, from Auth)

## Refresh & Update Frequency Requirements

### Initial Load
- Dashboard data SHALL be fetched on component mount
- All sections SHALL display within 2 seconds of page load

### Automatic Refresh
- Dashboard data SHALL auto-refresh every 5 minutes when the user is actively viewing the page
- Dashboard data SHALL auto-refresh when the user returns to the Dashboard tab after being away (if away > 1 minute)
- Dashboard SHALL NOT auto-refresh when the page is in background (use Page Visibility API)

### Manual Refresh
- User SHALL be able to refresh Dashboard data by pulling down (mobile) or clicking a refresh button (desktop)
- Manual refresh SHALL complete within 1-2 seconds

### Real-Time Updates (Future Enhancement)
- Dashboard could implement Supabase real-time subscriptions to push updates immediately when Activities change (outside MVP scope)

### Cache Strategy
- Dashboard data SHALL be cached in browser memory during the user session
- Cache SHALL invalidate after 5 minutes of inactivity or when user manually refreshes
- Offline cache TTL SHALL be 1 hour (persisted via Service Worker cache)

## Accessibility & Responsive Design Requirements

### Responsive Design

#### Mobile (< 768px)
- Single-column layout, sections stacked vertically
- Quick Actions buttons: stacked vertically, full-width
- Card text: abbreviated where needed (e.g., "3H" for "3 High Priority")
- Minimum touch target size: 44px x 44px
- Font size: 16px minimum for body text

#### Tablet (768px - 1024px)
- Two-column grid layout
- Quick Actions buttons: displayed horizontally if space allows
- Card text: full text display
- Touch target size: 44px minimum
- Font size: 14-16px for body text

#### Desktop (> 1024px)
- Responsive grid layout (2-3 columns as appropriate)
- Quick Actions buttons: horizontal layout, appropriate spacing
- Card text: full text display with optimal line lengths
- Mouse target size: 24px minimum
- Font size: 14-16px for body text

### Accessibility Standards (WCAG 2.1 Level AA)

#### Semantic HTML
- Proper heading hierarchy (h1 for page title, h2 for sections, h3 for subsections)
- Semantic landmarks (header, main, section, aside)
- Proper button and link elements (not divs styled as buttons)

#### Keyboard Navigation
- All interactive elements accessible via Tab key
- Focus order logical and predictable
- Focus indicator visible on all elements (min 3px outline or border)
- No keyboard trap - user can Tab through all elements and exit

#### Screen Reader Support
- All images have descriptive alt text
- Buttons and links have descriptive labels
- Form labels associated with inputs (for attribute)
- ARIA labels and descriptions where needed (aria-label, aria-describedby)
- Live regions for dynamic content updates (aria-live, aria-atomic)
- Purpose of each section announced (aria-label on sections or semantic headings)

#### Color & Contrast
- Minimum contrast ratio 4.5:1 for normal text (WCAG AA)
- Minimum contrast ratio 3:1 for large text (WCAG AA)
- Color not the only indicator of information (e.g., priority shown with color AND text)
- Status indicators use text labels in addition to color

#### Motion & Animation
- No flashing content (> 3 flashes per second)
- Animations respect prefers-reduced-motion setting
- No auto-playing video/animation that could distract

#### Language & Readability
- Primary language specified in HTML (lang attribute)
- Clear, concise language (no jargon unless defined)
- Sentence length kept reasonable
- Lists used for multiple items (not paragraphs)

#### Visual Design
- Adequate spacing between interactive elements (min 8px)
- Clear visual hierarchy with font size and weight
- Icons paired with text labels (no icon-only controls)
- High-contrast color combinations for usability
- Clear affordances (buttons look clickable, links look linked)

### Testing & Validation
- Dashboard SHALL pass automated accessibility audit (axe, Lighthouse)
- Dashboard SHALL be tested with keyboard only (no mouse)
- Dashboard SHALL be tested with screen readers (NVDA, JAWS, VoiceOver)
- Dashboard SHALL be tested with browser zoom at 200%
- Dashboard SHALL be responsive at all viewport sizes (mobile to desktop)

## Success Metrics

- **Data Load Time:** Initial Dashboard load < 2 seconds (First Contentful Paint)
- **Interaction Readiness:** Time to Interactive < 3 seconds
- **Data Accuracy:** 100% of Activities displayed correctly (no missing or duplicated items)
- **Refresh Performance:** Manual refresh completes within 1-2 seconds
- **Accessibility Score:** Lighthouse accessibility score ≥ 95
- **Mobile Usability:** Passes Google Mobile-Friendly test
- **Offline Functionality:** Dashboard displays cached data when offline
- **Task Completion:** Users can create Activities from Dashboard Quick Actions without navigation

## Open Questions & Future Scope

1. **Seminar Support:** Requirements currently focus on Tasks, Exams, and Assignments. Should Dashboard also display Seminars?
2. **Real-Time Sync:** Should Dashboard implement real-time Supabase subscriptions for immediate updates when Activities change?
3. **Customizable Dashboard:** Should users be able to customize which sections to display or reorder sections?
4. **Theme Preferences:** Should Dashboard support dark mode?
5. **Analytics:** Should Dashboard display more advanced analytics (study time trends, subject breakdown)?
6. **Collaboration:** Should Dashboard show shared Activities or study group information (future multi-user support)?

