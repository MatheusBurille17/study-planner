import { NextResponse } from 'next/server'
import { registerSchema } from '@/features/auth/presentation/schemas/registerSchema'
import { register } from '@/features/auth/application/useCases/register'
import { getAuthService } from '@/features/auth/infrastructure/authRepository'
import { persistAuthCookies } from '@/shared/lib/auth/helpers'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const result = await register(
    parsed.data.email,
    parsed.data.password,
    parsed.data.passwordConfirm,
    getAuthService(),
    parsed.data.name,
  )
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
