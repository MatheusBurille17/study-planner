# Tech Stack & Development Guide

## Technology Stack

### Frontend
- **Framework:** Next.js (App Router) with TypeScript
- **UI Library:** React with shadcn/ui components
- **UI Styling:** Tailwind CSS
- **Icons:** Lucide React

### Backend
- **Server Runtime:** Next.js Server Actions and Route Handlers
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **Validation:** Zod

### Forms & Data
- **Form Management:** React Hook Form
- **Date/Time:** date-fns
- **Calendar UI:** React Day Picker

### PWA & Notifications
- **PWA:** Service Worker + Web App Manifest
- **Notifications:** Web Push API + VAPID keys
- **Scheduled Tasks:** Supabase Cron + Edge Functions

### Infrastructure & Deployment
- **Hosting:** Vercel
- **Version Control:** Git + GitHub

### Testing & Quality
- **Unit Tests:** Vitest
- **E2E Tests:** Playwright
- **Database Tests:** pgtap
- **Linting:** ESLint
- **Type Checking:** TypeScript (Strict mode)
- **CI/CD:** GitHub Actions

## Security Requirements
- **Authentication:** Supabase Auth (email/password, OAuth)
- **Transport:** HTTPS required (enforced by Vercel)
- **Database Security:** Row-Level Security (RLS) policies in Supabase
- **Data at Rest:** Supabase handles encryption
- **Input Validation:** Zod schema validation on client and server
- **CSRF Protection:** Built-in with Next.js
- **API Routes:** Protected with authentication middleware
- **Environment Variables:** Secure handling via .env.local (not committed)

## Common Development Commands

```bash
# Install dependencies
npm install

# Development server (runs on localhost:3000)
npm run dev

# Build for production
npm run build

# Run development build locally
npm run start

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run database tests
npm run test:db

# Lint code
npm run lint

# Type check
npm run type-check
```

## PWA Checklist During Development
- [ ] manifest.json configured with app name, icons, theme colors
- [ ] Service Worker registered and functional
- [ ] Works offline (verify with network throttling)
- [ ] Installable on mobile home screen
- [ ] Loading time < 3 seconds
- [ ] Responsive on mobile, tablet, desktop
- [ ] All icons and assets optimized

## Performance Targets
- Initial page load: < 3 seconds
- Time to Interactive: < 5 seconds
- Offline functionality: 100%
- Bundle size: Keep under 250KB (gzipped)
