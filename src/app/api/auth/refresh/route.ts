import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthService } from '@/features/auth/infrastructure/authRepository'
import { persistAuthCookies } from '@/shared/lib/auth/helpers'
import { REFRESH_COOKIE } from '@/shared/constants/config'

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value
  if (!refreshToken) {
    return NextResponse.json({ error: 'Refresh token ausente' }, { status: 401 })
  }

  try {
    const session = await getAuthService().refreshToken(refreshToken)
    await persistAuthCookies({
      accessToken: session.token,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
    })
    return NextResponse.json({ ok: true, expiresIn: session.expiresIn })
  } catch {
    return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
  }
}
