'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { loginSchema } from '../schemas/loginSchema'
import { login } from '../../application/useCases/login'
import { getAuthService } from '../../infrastructure/authRepository'
import { persistAuthCookies } from '@/shared/lib/auth/helpers'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'
import { createSupabaseServerClient } from '@/shared/lib/supabase/server'
import type { AuthActionState } from './types'

/**
 * Autentica o usuário. Em sucesso define cookies HttpOnly/SameSite=Strict
 * e redireciona para /dashboard. Em falha retorna erros estruturados.
 */
export async function loginAction(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const result = await login(parsed.data.email, parsed.data.password, getAuthService())
  if (!result.ok) {
    return { error: result.error.message, code: result.error.code }
  }

  if (isSupabaseConfigured() && result.value.refreshToken) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      await supabase.auth.setSession({
        access_token: result.value.token,
        refresh_token: result.value.refreshToken,
      })
    }
  }

  await persistAuthCookies({
    accessToken: result.value.token,
    refreshToken: result.value.refreshToken,
    expiresIn: result.value.expiresIn,
  })

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
