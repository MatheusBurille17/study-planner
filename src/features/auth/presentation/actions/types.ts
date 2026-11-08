export interface AuthActionState {
  error?: string
  code?: string
  fieldErrors?: Record<string, string[] | undefined>
  success?: boolean
  message?: string
}
