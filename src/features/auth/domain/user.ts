/**
 * Entity User (domain).
 *
 * Invariantes:
 * - email nunca vazio e segue formato RFC 5322 simplificado
 * - id é um UUID válido
 * - createdAt <= now()
 */
export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  lastSignInAt?: Date
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export function isValidUserId(id: string): boolean {
  return UUID_REGEX.test(id)
}

export function validateUserInvariants(user: User): void {
  if (!user.id) throw new Error('Usuário deve possuir um id')
  if (!user.email || !isValidEmail(user.email)) throw new Error('Usuário deve possuir um email válido')
  if (Number.isNaN(user.createdAt.getTime())) throw new Error('createdAt inválido')
  if (user.createdAt.getTime() > Date.now()) throw new Error('createdAt não pode estar no futuro')
}

export function isUserValid(user: User): boolean {
  try {
    validateUserInvariants(user)
    return true
  } catch {
    return false
  }
}
