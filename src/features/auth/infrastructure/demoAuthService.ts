import type { IAuthRepository, SessionResponse } from '../domain/repository'
import type { User } from '../domain/user'
import { AuthErrors } from '../domain/errors'
import { isValidEmail } from '../domain/user'
import {
  hashPassword,
  mutateDemoDatabase,
  readDemoDatabase,
  seedDemoDataForUser,
  verifyPassword,
  type DemoUser,
} from '@/shared/lib/demo/store'
import { SESSION_MAX_AGE_SECONDS, signSessionToken, verifySessionToken, sessionPayloadToUser } from '@/shared/lib/auth/session'

function toUser(demoUser: DemoUser): User {
  return {
    id: demoUser.id,
    email: demoUser.email,
    name: demoUser.name,
    createdAt: new Date(demoUser.createdAt),
    lastSignInAt: demoUser.lastSignInAt ? new Date(demoUser.lastSignInAt) : undefined,
  }
}

function mapDemoUser(row: DemoUser): DemoUser {
  return row
}

/**
 * Autenticação local usada quando Supabase não está configurado.
 * Senhas são armazenadas com scrypt + salt em `.data/db.json`.
 */
export class DemoAuthService implements IAuthRepository {
  async login(email: string, password: string): Promise<SessionResponse> {
    const normalized = email.trim().toLowerCase()
    if (!isValidEmail(normalized)) throw AuthErrors.INVALID_CREDENTIALS()

    const database = await readDemoDatabase()
    const row = database.users.find((user) => user.email.toLowerCase() === normalized)
    if (!row || !verifyPassword(password, row.salt, row.passwordHash)) {
      throw AuthErrors.INVALID_CREDENTIALS()
    }

    const updated = await mutateDemoDatabase((db) => {
      const found = db.users.find((user) => user.id === row.id)
      if (found) found.lastSignInAt = new Date().toISOString()
      return found ? mapDemoUser(found) : null
    })
    if (!updated) throw AuthErrors.USER_NOT_FOUND()

    const user = toUser(updated)
    const token = await signSessionToken(user)
    return { user, token, expiresIn: SESSION_MAX_AGE_SECONDS }
  }

  async register(email: string, password: string, name?: string): Promise<SessionResponse> {
    const normalized = email.trim().toLowerCase()
    if (!isValidEmail(normalized)) throw AuthErrors.INVALID_CREDENTIALS()
    if (password.length < 8) throw AuthErrors.WEAK_PASSWORD()

    const database = await readDemoDatabase()
    if (database.users.some((user) => user.email.toLowerCase() === normalized)) {
      throw AuthErrors.EMAIL_EXISTS()
    }

    const { hash, salt } = hashPassword(password)
    const now = new Date().toISOString()
    const created = await mutateDemoDatabase((db) => {
      if (db.users.some((user) => user.email.toLowerCase() === normalized)) {
        throw AuthErrors.EMAIL_EXISTS()
      }
      const row: DemoUser = {
        id: crypto.randomUUID(),
        email: normalized,
        name: name?.trim() || undefined,
        passwordHash: hash,
        salt,
        createdAt: now,
        lastSignInAt: now,
      }
      db.users.push(row)
      return row
    })

    await seedDemoDataForUser({ userId: created.id })

    const user = toUser(created)
    const token = await signSessionToken(user)
    return { user, token, expiresIn: SESSION_MAX_AGE_SECONDS }
  }

  async logout(): Promise<void> {
    // Sessões locais são stateless (JWT assinado). Logout limpa os cookies.
  }

  async getSession(token: string): Promise<User | null> {
    const payload = await verifySessionToken(token)
    if (!payload) return null
    const database = await readDemoDatabase()
    const row = database.users.find((user) => user.id === payload.sub)
    return row ? toUser(row) : sessionPayloadToUser(payload)
  }

  async refreshToken(refreshToken: string): Promise<SessionResponse> {
    const payload = await verifySessionToken(refreshToken)
    if (!payload) throw AuthErrors.TOKEN_EXPIRED()
    const database = await readDemoDatabase()
    const row = database.users.find((user) => user.id === payload.sub)
    if (!row) throw AuthErrors.USER_NOT_FOUND()
    const user = toUser(row)
    return {
      user,
      token: await signSessionToken(user),
      refreshToken: await signSessionToken(user, 60 * 60 * 24 * 60),
      expiresIn: SESSION_MAX_AGE_SECONDS,
    }
  }

  async resetPassword(): Promise<void> {
    // Sem serviço de email no modo local: resposta neutra por segurança.
  }

  async updatePassword(token: string, newPassword: string): Promise<void> {
    const payload = await verifySessionToken(token)
    if (!payload) throw AuthErrors.TOKEN_EXPIRED()
    if (newPassword.length < 8) throw AuthErrors.WEAK_PASSWORD()
    const { hash, salt } = hashPassword(newPassword)

    await mutateDemoDatabase((db) => {
      const row = db.users.find((user) => user.id === payload.sub)
      if (!row) throw AuthErrors.USER_NOT_FOUND()
      row.passwordHash = hash
      row.salt = salt
    })
  }
}

export const demoAuthService = new DemoAuthService()
