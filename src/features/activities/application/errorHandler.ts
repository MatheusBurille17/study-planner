export class ActivityError extends Error {
  constructor(
    message: string,
    public code = 'ACTIVITY_ERROR',
    public statusCode = 400,
    public field?: string,
  ) {
    super(message)
    this.name = 'ActivityError'
  }
}

interface SupabaseLikeError {
  code?: string
  message?: string
  details?: string
}

/** Converte erros do Supabase em erros de aplicação amigáveis. */
export function handleSupabaseError(error: SupabaseLikeError): ActivityError {
  const code = error.code ?? ''
  if (code === 'PGRST301' || code === '42501') {
    return new ActivityError('Você não tem permissão para esta ação', 'FORBIDDEN', 403)
  }
  if (code === '23505') {
    return new ActivityError('Este registro já existe', 'DUPLICATE', 409)
  }
  if (code === '23514' || code === '23502') {
    return new ActivityError('Dados inválidos. Revise o formulário.', 'VALIDATION_ERROR', 400)
  }
  return new ActivityError('Erro ao acessar o servidor. Tente novamente.', 'INTERNAL_ERROR', 500)
}
