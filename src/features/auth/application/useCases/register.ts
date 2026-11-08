import type { Result } from '@/shared/lib/result'
import { Err, Ok } from '@/shared/lib/result'
import type { IAuthRepository, SessionResponse } from '../../domain/repository'
import { AuthError, AuthErrors, isAuthError } from '../../domain/errors'
import { isValidEmail } from '../../domain/user'

function toAuthError(error: unknown): AuthError {
  if (isAuthError(error)) return error
  return new AuthError('Erro ao criar conta. Tente novamente.', 'UNKNOWN', 500)
}

/** Caso de uso: registrar nova conta e retornar sessão autenticada. */
export async function register(
  email: string,
  password: string,
  passwordConfirm: string,
  repository: IAuthRepository,
  name?: string,
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
  if (password !== passwordConfirm) {
    return Err(new AuthError('As senhas não conferem', 'VALIDATION_ERROR', 400))
  }

  try {
    const session = await repository.register(normalizedEmail, password, name)
    return Ok(session)
  } catch (error) {
    return Err(toAuthError(error))
  }
}
