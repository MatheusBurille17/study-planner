import { NextResponse } from 'next/server'
import { unsubscribeFromNotifications } from '@/features/notifications/presentation/actions/notificationActions'

export async function POST() {
  const result = await unsubscribeFromNotifications()
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
