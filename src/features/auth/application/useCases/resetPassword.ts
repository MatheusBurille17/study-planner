import type { Result } from '@/shared/lib/result'
import { Err, Ok } from '@/shared/lib/result'
import type { IAuthRepository } from '../../domain/repository'
import { AuthError, isAuthError } from '../../domain/errors'
import { isValidEmail } from '../../domain/user'

/**
 * Caso de uso: solicitar recuperação de senha.
 * Retorna sucesso mesmo para emails inexistentes (não revelar cadastro).
 */
export async function resetPassword(
  email: string,
  repository: IAuthRepository,
): Promise<Result<void, AuthError>> {
  const normalizedEmail = email?.trim().toLowerCase()
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return Err(new AuthError('Email inválido', 'VALIDATION_ERROR', 400))
  }

  try {
    await repository.resetPassword(normalizedEmail)
    return Ok(undefined)
  } catch (error) {
    if (isAuthError(error) && error.statusCode === 429) return Err(error)
    return Ok(undefined)
  }
}
