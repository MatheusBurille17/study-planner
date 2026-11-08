export const APP_NAME = "Amanda's Study Planner"
export const APP_SHORT_NAME = 'Study Planner'
export const DEFAULT_PAGE_SIZE = 20
export const MAX_TITLE_LENGTH = 200
export const MAX_DESCRIPTION_LENGTH = 3000
export const MAX_REMINDERS = 3

export const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/offline']
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/activities',
  '/calendar',
  '/subjects',
  '/settings',
]

export const AUTH_COOKIE = 'auth-token'
export const REFRESH_COOKIE = 'auth-refresh-token'
