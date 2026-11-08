import type { Result } from '@/shared/lib/result'
import { Err, Ok } from '@/shared/lib/result'
import type { IAuthRepository } from '../../domain/repository'
import { AuthError, isAuthError } from '../../domain/errors'

/** Caso de uso: atualizar senha de uma sessão autenticada. */
export async function updatePassword(
  token: string,
  newPassword: string,
  newPasswordConfirm: string,
  repository: IAuthRepository,
): Promise<Result<void, AuthError>> {
  if (!token) {
    return Err(new AuthError('Link inválido ou expirado', 'INVALID_TOKEN', 401))
  }
  if (newPassword.length < 8) {
    return Err(new AuthError('Senha deve ter no mínimo 8 caracteres', 'WEAK_PASSWORD', 400))
  }
  if (newPassword !== newPasswordConfirm) {
    return Err(new AuthError('As senhas não conferem', 'VALIDATION_ERROR', 400))
  }

  try {
    await repository.updatePassword(token, newPassword)
    return Ok(undefined)
  } catch (error) {
    if (isAuthError(error)) return Err(error)
    return Err(new AuthError('Não foi possível atualizar a senha', 'UNKNOWN', 500))
  }
}
