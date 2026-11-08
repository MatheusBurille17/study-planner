import type { Result } from '@/shared/lib/result'
import { Ok } from '@/shared/lib/result'
import type { IAuthRepository } from '../../domain/repository'
import type { AuthError } from '../../domain/errors'
import type { User } from '../../domain/user'

/**
 * Caso de uso: validar um token existente. Tokens ausentes/inválidos
 * retornam Ok(null) para que o chamador trate como "não autenticado".
 */
export async function verifySession(
  token: string | undefined,
  repository: IAuthRepository,
): Promise<Result<User | null, AuthError>> {
  if (!token) return Ok(null)
  try {
    const user = await repository.getSession(token)
    return Ok(user)
  } catch {
    return Ok(null)
  }
}
