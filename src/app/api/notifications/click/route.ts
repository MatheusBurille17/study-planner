import { NextResponse } from 'next/server'
import { logNotificationClickAction } from '@/features/notifications/presentation/actions/notificationActions'

export async function POST(request: Request) {
  let body: { notificationId?: string; referrer?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  }
  if (!body.notificationId) {
    return NextResponse.json({ error: 'notificationId é obrigatório' }, { status: 400 })
  }
  const result = await logNotificationClickAction(body.notificationId, body.referrer)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
