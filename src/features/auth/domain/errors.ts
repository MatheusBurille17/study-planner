export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_EXISTS'
  | 'USER_NOT_FOUND'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'WEAK_PASSWORD'
  | 'EMAIL_CONFIRMATION_REQUIRED'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN'

export class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode = 'UNKNOWN',
    public statusCode = 400,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export const AuthErrors = {
  INVALID_CREDENTIALS: () =>
    new AuthError('Email ou senha incorretos', 'INVALID_CREDENTIALS', 401),
  EMAIL_EXISTS: () =>
    new AuthError('Este email já está registrado', 'EMAIL_EXISTS', 409),
  USER_NOT_FOUND: () =>
    new AuthError('Usuário não encontrado', 'USER_NOT_FOUND', 404),
  TOKEN_EXPIRED: () => new AuthError('Sessão expirada', 'TOKEN_EXPIRED', 401),
  INVALID_TOKEN: () => new AuthError('Token inválido', 'INVALID_TOKEN', 401),
  WEAK_PASSWORD: () =>
    new AuthError('Senha deve ter no mínimo 8 caracteres', 'WEAK_PASSWORD', 400),
  SERVICE_UNAVAILABLE: () =>
    new AuthError(
      'Serviço temporariamente indisponível, tente novamente em alguns momentos',
      'SERVICE_UNAVAILABLE',
      503,
    ),
  NETWORK_ERROR: () =>
    new AuthError('Erro de conexão, verifique sua internet', 'NETWORK_ERROR', 503),
} as const

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

interface SupabaseLikeError {
  code?: string
  message?: string
  status?: number
}

/** Mapeia erros do Supabase para mensagens de domínio em português. */
export function mapSupabaseAuthError(error: SupabaseLikeError): AuthError {
  const code = (error.code ?? '').toLowerCase()
  const message = (error.message ?? '').toLowerCase()

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return AuthErrors.INVALID_CREDENTIALS()
  }
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered') ||
    message.includes('already exists')
  ) {
    return AuthErrors.EMAIL_EXISTS()
  }
  if (message.includes('password') && (message.includes('6 characters') || message.includes('weak'))) {
    return AuthErrors.WEAK_PASSWORD()
  }
  if (code === 'user_not_found' || message.includes('user not found')) {
    return AuthErrors.USER_NOT_FOUND()
  }
  if (message.includes('fetch failed') || message.includes('network')) {
    return AuthErrors.NETWORK_ERROR()
  }
  if (error.status === 503) {
    return AuthErrors.SERVICE_UNAVAILABLE()
  }
  return new AuthError('Erro ao autenticar. Tente novamente.', 'UNKNOWN', 500)
}
