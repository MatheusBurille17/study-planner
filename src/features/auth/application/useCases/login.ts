import type { Result } from '@/shared/lib/result'
import { Err, Ok } from '@/shared/lib/result'
import type { IAuthRepository, SessionResponse } from '../../domain/repository'
import { AuthError, AuthErrors, isAuthError } from '../../domain/errors'
import { isValidEmail } from '../../domain/user'

function toAuthError(error: unknown): AuthError {
  if (isAuthError(error)) return error
  return new AuthError('Erro ao fazer login. Tente novamente.', 'UNKNOWN', 500)
}

/** Caso de uso: autenticar usuário com email e senha. */
export async function login(
  email: string,
  password: string,
  repository: IAuthRepository,
): Promise<Result<SessionResponse, AuthError>> {
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail || !password) {
    return Err(new AuthError('Email e senha são obrigatórios', 'VALIDATION_ERROR', 400))
  }
  if (!isValidEmail(normalizedEmail)) {
    return Err(new AuthError('Email inválido', 'VALIDATION_ERROR', 400))
  }
  if (password.length < 8) {
    return Err(AuthErrors.WEAK_PASSWORD())
  }

  try {
    const session = await repository.login(normalizedEmail, password)
    return Ok(session)
  } catch (error) {
    return Err(toAuthError(error))
  }
}
