import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth/helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null, error: 'Não autenticado' }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
    },
  })
}
