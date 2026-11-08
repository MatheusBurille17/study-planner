import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SessionResponse } from '../domain/repository'
import type { IAuthRepository } from '../domain/repository'
import type { User } from '../domain/user'
import { AuthError, AuthErrors, mapSupabaseAuthError } from '../domain/errors'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/shared/lib/supabase/config'
import { mapSupabaseUserToUser } from './mappers/userMapper'

function createAuthClient(accessToken?: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  })
}

/** Implementação de autenticação usando Supabase Auth. */
export class SupabaseAuthService implements IAuthRepository {
  async login(email: string, password: string): Promise<SessionResponse> {
    const supabase = createAuthClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw mapSupabaseAuthError(error)
    if (!data.session || !data.user) {
      throw new AuthError(
        'Não foi possível iniciar a sessão. Confirme seu email.',
        'EMAIL_CONFIRMATION_REQUIRED',
        403,
      )
    }
    return {
      user: mapSupabaseUserToUser(data.user),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in ?? 3600,
    }
  }

  async register(email: string, password: string, name?: string): Promise<SessionResponse> {
    const supabase = createAuthClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: name ? { name } : undefined },
    })

    if (error) throw mapSupabaseAuthError(error)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw AuthErrors.EMAIL_EXISTS()
    }
    if (!data.user) throw new AuthError('Erro ao criar conta', 'UNKNOWN', 500)
    if (!data.session) {
      throw new AuthError(
        'Conta criada! Confirme seu email para entrar.',
        'EMAIL_CONFIRMATION_REQUIRED',
        403,
      )
    }

    return {
      user: mapSupabaseUserToUser(data.user),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in ?? 3600,
    }
  }

  async logout(token: string): Promise<void> {
    if (!token) return
    const supabase = createAuthClient(token)
    const { error } = await supabase.auth.signOut()
    if (error) {
      // Token já expirado/inválido não deve impedir o logout local.
      return
    }
  }

  async getSession(token: string): Promise<User | null> {
    if (!token) return null
    const supabase = createAuthClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null
    return mapSupabaseUserToUser(data.user)
  }

  async refreshToken(refreshToken: string): Promise<SessionResponse> {
    const supabase = createAuthClient()
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.session || !data.user) throw AuthErrors.TOKEN_EXPIRED()
    return {
      user: mapSupabaseUserToUser(data.user),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in ?? 3600,
    }
  }

  async resetPassword(email: string): Promise<void> {
    const supabase = createAuthClient()
    const redirectTo = `${process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL ?? 'http://localhost:3000'}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error && error.status === 429) {
      throw betterMessage(error)
    }
    // Sucesso neutro: nunca revelar se o email existe.
  }

  async updatePassword(token: string, newPassword: string): Promise<void> {
    if (!token) throw AuthErrors.INVALID_TOKEN()
    const supabase = createAuthClient(token)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      if (error.status === 401) throw AuthErrors.TOKEN_EXPIRED()
      throw mapSupabaseAuthError(error)
    }
  }
}

function betterMessage(error: { message?: string; status?: number }): AuthError {
  if (error.status === 429) {
    return new AuthError('Muitas tentativas. Aguarde alguns minutos.', 'SERVICE_UNAVAILABLE', 429)
  }
  return mapSupabaseAuthError(error)
}

export const supabaseAuthService = new SupabaseAuthService()
