export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  lastSignInAt?: Date
}

export interface SessionResponse {
  user: User
  token: string
  refreshToken?: string
  expiresIn: number
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}
