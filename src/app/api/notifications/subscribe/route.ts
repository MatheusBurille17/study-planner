import { NextResponse } from 'next/server'
import { subscribeToNotifications, unsubscribeFromNotifications } from '@/features/notifications/presentation/actions/notificationActions'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  }
  const result = await subscribeToNotifications(body)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

export async function DELETE() {
  const result = await unsubscribeFromNotifications()
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
