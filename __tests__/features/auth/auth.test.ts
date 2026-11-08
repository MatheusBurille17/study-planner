import { describe, expect, it } from 'vitest'
import { loginSchema } from '@/features/auth/presentation/schemas/loginSchema'
import { registerSchema } from '@/features/auth/presentation/schemas/registerSchema'
import { resetPasswordSchema } from '@/features/auth/presentation/schemas/resetPasswordSchema'
import { forgotPasswordSchema } from '@/features/auth/presentation/schemas/forgotPasswordSchema'
import { isValidEmail, isUserValid } from '@/features/auth/domain/user'
import { AuthErrors } from '@/features/auth/domain/errors'
import { mapSupabaseUserToUser } from '@/features/auth/infrastructure/mappers/userMapper'

describe('auth schemas', () => {
  it('valida login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '12345678' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'invalido', password: '12345678' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success).toBe(false)
  })

  it('valida registro e confirmação de senha', () => {
    expect(
      registerSchema.safeParse({
        email: 'a@b.com',
        password: '12345678',
        passwordConfirm: '12345678',
      }).success,
    ).toBe(true)
    const mismatch = registerSchema.safeParse({
      email: 'a@b.com',
      password: '12345678',
      passwordConfirm: '87654321',
    })
    expect(mismatch.success).toBe(false)
    if (!mismatch.success) expect(mismatch.error.errors[0].message).toMatch(/não conferem/)
  })

  it('valida reset e forgot password', () => {
    expect(
      resetPasswordSchema.safeParse({ newPassword: '12345678', newPasswordConfirm: '12345678' }).success,
    ).toBe(true)
    expect(resetPasswordSchema.safeParse({ newPassword: '123', newPasswordConfirm: '123' }).success).toBe(false)
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true)
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false)
  })

  it('valida invariantes de usuário', () => {
    expect(isValidEmail('amanda@uni.edu.br')).toBe(true)
    expect(isValidEmail('amanda')).toBe(false)
    expect(
      isUserValid({
        id: crypto.randomUUID(),
        email: 'a@b.com',
        createdAt: new Date(),
      }),
    ).toBe(true)
    expect(
      isUserValid({
        id: 'x',
        email: 'invalido',
        createdAt: new Date(),
      }),
    ).toBe(false)
  })

  it('mapeia usuário do Supabase', () => {
    const user = mapSupabaseUserToUser({
      id: 'uuid',
      email: 'a@b.com',
      created_at: '2026-01-01T00:00:00Z',
      last_sign_in_at: '2026-01-02T00:00:00Z',
      user_metadata: { name: 'Amanda' },
    })
    expect(user.name).toBe('Amanda')
    expect(user.lastSignInAt).toBeInstanceOf(Date)
  })

  it('expõe mensagens de erro em português', () => {
    expect(AuthErrors.INVALID_CREDENTIALS().message).toBe('Email ou senha incorretos')
    expect(AuthErrors.EMAIL_EXISTS().statusCode).toBe(409)
  })
})
