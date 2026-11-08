'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { registerSchema } from '../schemas/registerSchema'
import { register } from '../../application/useCases/register'
import { getAuthService } from '../../infrastructure/authRepository'
import { persistAuthCookies } from '@/shared/lib/auth/helpers'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'
import { createSupabaseServerClient } from '@/shared/lib/supabase/server'
import type { AuthActionState } from './types'

/** Cria conta, autentica automaticamente e redireciona para /dashboard. */
export async function registerAction(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name')?.toString() || undefined,
    email: formData.get('email')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
    passwordConfirm: formData.get('passwordConfirm')?.toString() ?? '',
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const result = await register(
    parsed.data.email,
    parsed.data.password,
    parsed.data.passwordConfirm,
    getAuthService(),
    parsed.data.name,
  )

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
