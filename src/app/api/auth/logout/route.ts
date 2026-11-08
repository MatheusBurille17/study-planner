import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/shared/lib/auth/helpers'

export async function POST() {
  await clearAuthCookies()
  return NextResponse.json({ ok: true })
}
