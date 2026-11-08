import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'
import { readDemoDatabase } from '@/shared/lib/demo/store'
import { getNotificationRepository } from '@/features/notifications/infrastructure/notificationRepository'
import { deliverReminder } from '@/features/notifications/application/notificationService'
import { deserializeActivity } from '@/features/activities/infrastructure/mappers/activityMapper'
import type { Activity } from '@/shared/types/activity'

/**
 * Scheduler de lembretes (fallback local do CRON do Supabase).
 * Protegido por CRON_SECRET quando configurado.
 * Em produção com Supabase, use a Edge Function send-reminders.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const provided = request.headers.get('authorization')?.replace('Bearer ', '')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  }

  if (isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Use a Edge Function send-reminders para o agendamento em produção Supabase.',
      },
      { status: 501 },
    )
  }

  const now = new Date()
  const windowStart = now.getTime() - 5 * 60 * 1000
  const windowEnd = now.getTime() + 5 * 60 * 1000

  const database = await readDemoDatabase()
  const repository = await getNotificationRepository()
  const results: Array<{ activityId: string; sent: number; skipped?: string; title?: string }> = []

  // Agrupa preferências e inscrições por usuário para evitar consultas repetidas.
  const preferencesCache = new Map<string, Awaited<ReturnType<typeof repository.getPreferences>>>()
  const subscriptionsCache = new Map<string, Awaited<ReturnType<typeof repository.getActiveSubscriptions>>>()

  for (const row of database.activities) {
    if (row.isDeleted) continue
    const activity = deserializeActivity(row) as Activity
    const date =
      activity.type === 'task' || activity.type === 'assignment'
        ? activity.dueDate
        : activity.type === 'exam'
          ? activity.date
          : undefined
    if (!date) continue

    if (!preferencesCache.has(activity.userId)) {
      preferencesCache.set(activity.userId, await repository.getPreferences(activity.userId))
      subscriptionsCache.set(activity.userId, await repository.getActiveSubscriptions(activity.userId))
    }
    const preferences = preferencesCache.get(activity.userId)!
    const subscriptions = subscriptionsCache.get(activity.userId) ?? []

    const recentLogs = await repository.getLogs(activity.userId, 20)
    const alreadySent = recentLogs.some(
      (log) =>
        log.activityId === activity.id && now.getTime() - log.sentAt.getTime() < 10 * 60 * 1000,
    )
    if (alreadySent) continue

    const configured = (activity.reminders ?? []).filter(
      (reminder) => reminder.isActive && !reminder.wasFired,
    )
    const { calculateReminderTime } = await import('@/shared/constants/reminders')
    const timestamp =
      configured.length > 0
        ? configured[0].reminderTimestamp
        : calculateReminderTime(activity.type, date, preferences.taskRemindersHours, now)

    if (timestamp.getTime() < windowStart || timestamp.getTime() > windowEnd) continue

    const subjectRow = database.subjects.find((subject) => subject.id === activity.subjectId)
    const delivery = await deliverReminder({
      activity,
      subjectName: subjectRow?.name ? String(subjectRow.name) : undefined,
      preferences,
      subscriptions,
      repository,
      now,
    })
    results.push({
      activityId: delivery.activityId,
      sent: delivery.sent,
      skipped: delivery.skipped,
      title: delivery.title,
    })
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    delivered: results.reduce((sum, item) => sum + item.sent, 0),
    results,
    generatedAt: now.toISOString(),
  })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Use POST para executar o agendador de lembretes.',
  })
}
