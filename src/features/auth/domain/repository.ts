import type { User } from './user'

export interface SessionResponse {
  user: User
  token: string
  refreshToken?: string
  expiresIn: number
}

/**
 * Contrato de autenticação. Implementações: SupabaseAuthService (produção)
 * e DemoAuthService (modo local sem Supabase configurado).
 */
export interface IAuthRepository {
  /** Autentica com email/senha. Lança AuthError em credenciais inválidas. */
  login(email: string, password: string): Promise<SessionResponse>
  /** Cria conta e retorna sessão (auto-login). Lança AuthError se email existir. */
  register(email: string, password: string, name?: string): Promise<SessionResponse>
  /** Invalida o token no provedor. Deve ser resiliente a token já expirado. */
  logout(token: string): Promise<void>
  /** Valida um token e retorna o usuário, ou null. */
  getSession(token: string): Promise<User | null>
  /** Renova a sessão usando refresh token. */
  refreshToken(refreshToken: string): Promise<SessionResponse>
  /** Envia email de recuperação. Nunca revela se o email existe. */
  resetPassword(email: string): Promise<void>
  /** Atualiza a senha autenticada (token de acesso ou sessão válida). */
  updatePassword(token: string, newPassword: string): Promise<void>
}
