import type { Result } from '@/shared/lib/result'
import { Ok } from '@/shared/lib/result'
import type { IAuthRepository } from '../../domain/repository'
import type { AuthError } from '../../domain/errors'

/**
 * Caso de uso: encerrar sessão. É idempotente e sempre retorna sucesso,
 * pois o cliente deve limpar os dados locais mesmo se o provedor falhar.
 */
export async function logout(token: string, repository: IAuthRepository): Promise<Result<void, AuthError>> {
  try {
    await repository.logout(token)
  } catch {
    // Intencional: logout local deve ocorrer de qualquer forma.
  }
  return Ok(undefined)
}
