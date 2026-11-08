'use server'

import { redirect } from 'next/navigation'
import { resetPasswordSchema } from '../schemas/resetPasswordSchema'
import { updatePassword } from '../../application/useCases/updatePassword'
import { getAuthService } from '../../infrastructure/authRepository'
import { getSessionToken } from '@/shared/lib/auth/helpers'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'
import { createSupabaseServerClient } from '@/shared/lib/supabase/server'
import type { AuthActionState } from './types'

async function resolveToken(formData: FormData): Promise<string> {
  const fromForm = formData.get('token')?.toString()
  if (fromForm) return fromForm

  const cookieToken = await getSessionToken()
  if (cookieToken) return cookieToken

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
    return data.session?.access_token ?? ''
  }

  return ''
}

/** Redefine a senha a partir do token do link de recuperação. */
export async function resetPasswordAction(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword: formData.get('newPassword')?.toString() ?? '',
    newPasswordConfirm: formData.get('newPasswordConfirm')?.toString() ?? '',
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const token = await resolveToken(formData)
  const result = await updatePassword(
    token,
    parsed.data.newPassword,
    parsed.data.newPasswordConfirm,
    getAuthService(),
  )

  if (!result.ok) {
    return { error: result.error.message, code: result.error.code }
  }

  redirect('/login?message=Senha%20redefinida%20com%20sucesso')
}

export const updatePasswordAction = resetPasswordAction
