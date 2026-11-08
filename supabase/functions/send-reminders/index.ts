import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:amanda@example.com'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

interface ActivityRow {
  id: string
  user_id: string
  type: string
  title: string
  description?: string | null
  subject_id?: string | null
  activities?: {
    id: string
    title: string
    type: string
    user_id: string
    subject_id?: string | null
  }
}

interface ReminderRow {
  id: string
  activity_id: string
  user_id: string
  reminder_type: string
  reminder_timestamp: string
  activities?: ActivityRow | ActivityRow[]
}

function isQuietHours(now: Date, start?: string, end?: string): boolean {
  if (!start || !end) return false
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  if (startMinutes === endMinutes) return false
  if (startMinutes < endMinutes) return minutes >= startMinutes && minutes < endMinutes
  return minutes >= startMinutes || minutes < endMinutes
}

function typeEnabled(preferences: Record<string, unknown>, type: string): boolean {
  if (!preferences.reminders_enabled) return false
  if (type === 'EXAM') return Boolean(preferences.exams_enabled)
  if (type === 'ASSIGNMENT') return Boolean(preferences.assignments_enabled)
  return Boolean(preferences.tasks_enabled)
}

function formatMessage(activity: ActivityRow, subjectName: string): { title: string; body: string } {
  const subject = subjectName.length > 30 ? `${subjectName.slice(0, 29)}…` : subjectName
  const label = activity.type === 'EXAM' ? 'Prova' : activity.type === 'ASSIGNMENT' ? 'Entrega' : 'Tarefa'
  const title = activity.title.length > 60 ? `${activity.title.slice(0, 59)}…` : activity.title
  return {
    title: `${label}: ${subject}`,
    body: title,
  }
}

Deno.serve(async (request) => {
  if (CRON_SECRET) {
    const provided = request.headers.get('authorization')?.replace('Bearer ', '')
    if (provided !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
    }
  }

  const startedAt = Date.now()
  const now = new Date()
  const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const to = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

  const { data: reminders, error } = await supabase
    .from('activity_reminders')
    .select('*, activities(*)')
    .eq('is_active', true)
    .eq('was_fired', false)
    .gte('reminder_timestamp', from)
    .lte('reminder_timestamp', to)
    .limit(100)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  }

  let delivered = 0
  let failed = 0
  let skipped = 0
  let processed = 0

  for (const reminder of (reminders ?? []) as ReminderRow[]) {
    processed += 1
    const activity = Array.isArray(reminder.activities) ? reminder.activities[0] : reminder.activities
    if (!activity) {
      skipped += 1
      continue
    }

    const [{ data: preferences }, { data: subscriptions }, { data: subject }] = await Promise.all([
      supabase.from('notification_preferences').select('*').eq('user_id', reminder.user_id).maybeSingle(),
      supabase.from('push_subscriptions').select('*').eq('user_id', reminder.user_id).eq('is_active', true),
      activity.subject_id
        ? supabase.from('subjects').select('name').eq('id', activity.subject_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    if (!preferences || !typeEnabled(preferences, activity.type)) {
      skipped += 1
      continue
    }
    if (isQuietHours(now, preferences.quiet_hours_start, preferences.quiet_hours_end)) {
      skipped += 1
      continue
    }
    if (!subscriptions || subscriptions.length === 0) {
      skipped += 1
      continue
    }

    const message = formatMessage(activity, subject?.name ?? 'Sem disciplina')
    const { data: log } = await supabase
      .from('notification_logs')
      .insert({
        user_id: reminder.user_id,
        activity_id: activity.id,
        activity_type: activity.type.toLowerCase(),
        title: message.title,
        body: message.body,
        sent_at: new Date().toISOString(),
        status: 'retrying',
      })
      .select('*')
      .single()

    let successCount = 0
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({
            title: message.title,
            body: message.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/favicon-32.png',
            tag: `activity-${activity.id}`,
            data: {
              url: `/activities/${activity.id}`,
              activityId: activity.id,
              activityType: activity.type.toLowerCase(),
              notificationId: log?.id,
            },
            sound: preferences.sound_enabled,
            vibration: preferences.vibration_enabled,
          }),
          { TTL: 86400, urgency: 'high' },
        )
        successCount += 1
        await supabase.from('notification_delivery_log').insert({
          notification_id: log?.id,
          user_id: reminder.user_id,
          subscription_id: subscription.id,
          attempt: 1,
          status: 'success',
        })
      } catch (pushError) {
        failed += 1
        const statusCode =
          typeof pushError === 'object' && pushError && 'statusCode' in pushError
            ? Number((pushError as { statusCode?: number }).statusCode)
            : 0
        const permanent = statusCode === 404 || statusCode === 410
        if (permanent) {
          await supabase.from('push_subscriptions').update({ is_active: false }).eq('id', subscription.id)
        }
        await supabase.from('notification_delivery_log').insert({
          notification_id: log?.id,
          user_id: reminder.user_id,
          subscription_id: subscription.id,
          attempt: 1,
          status: 'failed',
          error_code: statusCode,
          error_message: pushError instanceof Error ? pushError.message : 'Erro desconhecido',
          next_retry_at: permanent ? null : new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        })
      }
    }

    if (successCount > 0) {
      delivered += successCount
      await supabase.from('notification_logs').update({ status: 'success' }).eq('id', log?.id)
      await supabase
        .from('activity_reminders')
        .update({ was_fired: true, fired_at: new Date().toISOString() })
        .eq('id', reminder.id)
    } else {
      await supabase.from('notification_logs').update({ status: 'failed' }).eq('id', log?.id)
    }
  }

  const durationMs = Date.now() - startedAt
  return new Response(
    JSON.stringify({
      ok: true,
      processed,
      delivered,
      failed,
      skipped,
      durationMs,
      performanceOk: processed === 0 || durationMs < 25_000,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
