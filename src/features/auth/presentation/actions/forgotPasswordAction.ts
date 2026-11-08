'use server'

import { forgotPasswordSchema } from '../schemas/forgotPasswordSchema'
import { resetPassword } from '../../application/useCases/resetPassword'
import { getAuthService } from '../../infrastructure/authRepository'
import type { AuthActionState } from './types'

/**
 * Solicita link de recuperação. A resposta é sempre neutra para não
 * revelar se o email está cadastrado.
 */
export async function forgotPasswordAction(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email')?.toString() ?? '',
  })

  if (!parsed.success) {
    return { error: 'Email inválido', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const result = await resetPassword(parsed.data.email, getAuthService())
  if (!result.ok) {
    return { error: result.error.message, code: result.error.code }
  }

  return {
    success: true,
    message: 'Se este email está registrado, você receberá um email com instruções.',
  }
}

export const requestPasswordResetAction = forgotPasswordAction
