import { cookies } from 'next/headers'
import type { User } from '@/shared/types/user'
import { AUTH_COOKIE, REFRESH_COOKIE } from '@/shared/constants/config'
import { createSupabaseServerClient } from '@/shared/lib/supabase/server'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'
import {
  SESSION_MAX_AGE_SECONDS,
  sessionPayloadToUser,
  signSessionToken,
  verifySessionToken,
} from './session'

export interface AuthCookiePayload {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
}

const isProduction = process.env.NODE_ENV === 'production'

export async function persistAuthCookies(payload: AuthCookiePayload): Promise<void> {
  const cookieStore = await cookies()
  const maxAge = payload.expiresIn && payload.expiresIn > 0 ? payload.expiresIn : SESSION_MAX_AGE_SECONDS

  cookieStore.set(AUTH_COOKIE, payload.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge,
  })

  if (payload.refreshToken) {
    cookieStore.set(REFRESH_COOKIE, payload.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
}

export async function persistDemoSession(user: User): Promise<void> {
  const token = await signSessionToken(user)
  await persistAuthCookies({ accessToken: token, expiresIn: SESSION_MAX_AGE_SECONDS })
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE)
  cookieStore.delete(REFRESH_COOKIE)
}

export async function getCurrentUser(): Promise<User | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    if (!supabase) return null
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      name: (data.user.user_metadata?.name as string | undefined) ?? undefined,
      createdAt: new Date(data.user.created_at),
      lastSignInAt: data.user.last_sign_in_at ? new Date(data.user.last_sign_in_at) : undefined,
    }
  }

  const cookieStore = await cookies()
  const payload = await verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value)
  return payload ? sessionPayloadToUser(payload) : null
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(AUTH_COOKIE)?.value ?? null
}

export class UnauthorizedError extends Error {
  constructor(message = 'Usuário não autenticado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}

export async function isAuthenticated(): Promise<boolean> {
  return Boolean(await getCurrentUser())
}
