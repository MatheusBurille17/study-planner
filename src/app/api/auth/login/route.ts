import { NextResponse } from 'next/server'
import { loginSchema } from '@/features/auth/presentation/schemas/loginSchema'
import { login } from '@/features/auth/application/useCases/login'
import { getAuthService } from '@/features/auth/infrastructure/authRepository'
import { persistAuthCookies } from '@/shared/lib/auth/helpers'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const result = await login(parsed.data.email, parsed.data.password, getAuthService())
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.statusCode },
    )
  }

  await persistAuthCookies({
    accessToken: result.value.token,
    refreshToken: result.value.refreshToken,
    expiresIn: result.value.expiresIn,
  })

  return NextResponse.json({ ok: true, user: result.value.user })
}
