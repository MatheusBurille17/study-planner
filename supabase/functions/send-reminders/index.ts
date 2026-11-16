import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import {
  addDaysToIsoDate,
  DEFAULT_SCHEDULER_PREFERENCES,
  defaultReminderHours,
  defaultReminderInstant,
  eventTimeOfDay,
  isQuietHoursInTimeZone,
  isWithinWindow,
  isoDateInTimeZone,
  nextQuietHoursEnd,
  normalizeType,
  reminderTypeForHours,
  typeEnabled,
  type SchedulerPreferences,
} from './logic.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:amanda@example.com'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
/** Fuso usado para horário de silêncio e para as datas sem hora (padrão do app). */
const APP_TIME_ZONE = Deno.env.get('APP_TIME_ZONE') ?? 'America/Sao_Paulo'
const WINDOW_MINUTES = 5
const MAX_EXPLICIT_REMINDERS = 200

interface ActivityRow {
  id: string
  user_id: string
  title: string
  type: string
  subject_id?: string | null
  is_deleted?: boolean | null
}

interface ReminderRow {
  id: string
  activity_id: string
  user_id: string
  reminder_type: string
  reminder_timestamp: string
  activities?: ActivityRow | ActivityRow[]
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface UserContext {
  preferences: SchedulerPreferences
  subscriptions: SubscriptionRow[]
}

interface Stats {
  processed: number
  delivered: number
  failed: number
  skipped: number
}

function emptyStats(): Stats {
  return { processed: 0, delivered: 0, failed: 0, skipped: 0 }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function pickActivity(value: ActivityRow | ActivityRow[] | undefined | null): ActivityRow | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapPreferences(row: Record<string, unknown>): SchedulerPreferences {
  return {
    remindersEnabled: Boolean(row.reminders_enabled ?? true),
    examsEnabled: Boolean(row.exams_enabled ?? true),
    assignmentsEnabled: Boolean(row.assignments_enabled ?? true),
    tasksEnabled: Boolean(row.tasks_enabled ?? true),
    taskRemindersHours: Number(row.task_reminders_hours ?? 3),
    quietHoursStart: row.quiet_hours_start ? String(row.quiet_hours_start).slice(0, 5) : undefined,
    quietHoursEnd: row.quiet_hours_end ? String(row.quiet_hours_end).slice(0, 5) : undefined,
    soundEnabled: Boolean(row.sound_enabled ?? true),
    vibrationEnabled: Boolean(row.vibration_enabled ?? true),
  }
}

function formatMessage(activity: ActivityRow, subjectName: string): { title: string; body: string } {
  const subject = subjectName.length > 30 ? `${subjectName.slice(0, 29)}…` : subjectName
  const type = normalizeType(activity.type)
  const label = type === 'exam' ? 'Prova' : type === 'assignment' ? 'Entrega' : 'Tarefa'
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
      return json({ error: 'Não autorizado' }, 401)
    }
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(
      { ok: false, error: 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configurados' },
      500,
    )
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json(
      {
        ok: false,
        error:
          'Chaves VAPID ausentes. Configure VAPID_PUBLIC_KEY (ou NEXT_PUBLIC_VAPID_PUBLIC_KEY) e VAPID_PRIVATE_KEY nos secrets da Edge Function.',
      },
      500,
    )
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const startedAt = Date.now()
  const now = new Date()

  const userCache = new Map<string, Promise<UserContext>>()
  const subjectCache = new Map<string, Promise<string>>()

  function loadUserContext(userId: string): Promise<UserContext> {
    const cached = userCache.get(userId)
    if (cached) return cached
    const promise = (async () => {
      const [{ data: preferences }, { data: subscriptions }] = await Promise.all([
        supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('push_subscriptions').select('*').eq('user_id', userId).eq('is_active', true),
      ])
      return {
        preferences: preferences
          ? mapPreferences(preferences as Record<string, unknown>)
          : { ...DEFAULT_SCHEDULER_PREFERENCES },
        subscriptions: (subscriptions ?? []) as SubscriptionRow[],
      }
    })()
    userCache.set(userId, promise)
    return promise
  }

  function loadSubjectName(subjectId?: string | null): Promise<string> {
    if (!subjectId) return Promise.resolve('Sem disciplina')
    const cached = subjectCache.get(subjectId)
    if (cached) return cached
    const promise = (async () => {
      const { data } = await supabase.from('subjects').select('name').eq('id', subjectId).maybeSingle()
      return data?.name ? String(data.name) : 'Sem disciplina'
    })()
    subjectCache.set(subjectId, promise)
    return promise
  }

  async function logNotification(
    activity: ActivityRow,
    title: string,
    body: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        user_id: activity.user_id,
        activity_id: activity.id,
        activity_type: normalizeType(activity.type),
        title,
        body,
        sent_at: new Date().toISOString(),
        status: 'retrying',
      })
      .select('id')
      .single()
    if (error) return null
    return data?.id ? String(data.id) : null
  }

  async function dispatch(
    activity: ActivityRow,
    context: UserContext,
  ): Promise<{ delivered: number; failed: number }> {
    const subjectName = await loadSubjectName(activity.subject_id)
    const message = formatMessage(activity, subjectName)
    const logId = await logNotification(activity, message.title, message.body)

    let delivered = 0
    let failed = 0

    for (const subscription of context.subscriptions) {
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
            badge: '/icons/badge-72x72.png',
            tag: `activity-${activity.id}`,
            notificationId: logId,
            data: {
              url: `/activities/${activity.id}`,
              activityId: activity.id,
              activityType: normalizeType(activity.type),
              notificationId: logId,
            },
            sound: context.preferences?.soundEnabled ?? true,
            vibration: context.preferences?.vibrationEnabled ?? true,
          }),
          { TTL: 86400, urgency: 'high' },
        )
        delivered += 1
        await supabase.from('notification_delivery_log').insert({
          notification_id: logId,
          user_id: activity.user_id,
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
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').update({ is_active: false }).eq('id', subscription.id)
        }
        await supabase.from('notification_delivery_log').insert({
          notification_id: logId,
          user_id: activity.user_id,
          subscription_id: subscription.id,
          attempt: 1,
          status: 'failed',
          error_code: statusCode,
          error_message: pushError instanceof Error ? pushError.message : 'Erro desconhecido',
          next_retry_at:
            statusCode === 404 || statusCode === 410
              ? null
              : new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        })
      }
    }

    if (logId) {
      await supabase
        .from('notification_logs')
        .update({ status: delivered > 0 ? 'success' : 'failed' })
        .eq('id', logId)
    }

    return { delivered, failed }
  }

  /** Lembretes configurados manualmente pelo usuário em `activity_reminders`. */
  async function processExplicitReminders(): Promise<Stats> {
    const stats = emptyStats()
    const from = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000).toISOString()
    const to = new Date(now.getTime() + WINDOW_MINUTES * 60 * 1000).toISOString()

    const { data: reminders, error } = await supabase
      .from('activity_reminders')
      .select('*, activities(*)')
      .eq('is_active', true)
      .eq('was_fired', false)
      .gte('reminder_timestamp', from)
      .lte('reminder_timestamp', to)
      .order('reminder_timestamp', { ascending: true })
      .limit(MAX_EXPLICIT_REMINDERS)

    if (error) throw new Error(error.message)

    for (const reminder of (reminders ?? []) as ReminderRow[]) {
      stats.processed += 1
      const activity = pickActivity(reminder.activities)
      if (!activity || activity.is_deleted) {
        stats.skipped += 1
        continue
      }

      const context = await loadUserContext(reminder.user_id)
      if (!typeEnabled(context.preferences, activity.type)) {
        stats.skipped += 1
        continue
      }

      if (
        isQuietHoursInTimeZone(
          now,
          context.preferences.quietHoursStart,
          context.preferences.quietHoursEnd,
          APP_TIME_ZONE,
        )
      ) {
        // Adia para o fim do silêncio em vez de descartar o lembrete.
        const next = nextQuietHoursEnd(now, context.preferences.quietHoursEnd, APP_TIME_ZONE)
        if (next) {
          await supabase
            .from('activity_reminders')
            .update({ reminder_timestamp: next.toISOString() })
            .eq('id', reminder.id)
        }
        stats.skipped += 1
        continue
      }

      if (context.subscriptions.length === 0) {
        stats.skipped += 1
        continue
      }

      const result = await dispatch(activity, context)
      stats.delivered += result.delivered
      stats.failed += result.failed

      if (result.delivered > 0) {
        await supabase
          .from('activity_reminders')
          .update({ was_fired: true, fired_at: new Date().toISOString() })
          .eq('id', reminder.id)
      }
    }

    return stats
  }

  /**
   * Lembretes automáticos: provas/trabalhos 24h antes e tarefas N horas antes.
   *
   * A maioria das atividades é criada sem lembretes manuais; sem este passo o
   * CRON nunca encontraria nada para enviar.
   */
  async function processDefaultReminders(): Promise<Stats> {
    const stats = emptyStats()
    const today = isoDateInTimeZone(now, APP_TIME_ZONE)
    const from = addDaysToIsoDate(today, -2)
    const to = addDaysToIsoDate(today, 2)
    const activityFields = 'activities!inner(id,user_id,title,type,subject_id,is_deleted)'

    const [tasks, exams, assignments] = await Promise.all([
      supabase
        .from('tasks')
        .select(`due_date, due_time, ${activityFields}`)
        .gte('due_date', from)
        .lte('due_date', to),
      supabase
        .from('exams')
        .select(`date, time, ${activityFields}`)
        .gte('date', from)
        .lte('date', to),
      supabase
        .from('assignments')
        .select(`due_date, due_time, ${activityFields}`)
        .gte('due_date', from)
        .lte('due_date', to),
    ])

    type Candidate = { activity: ActivityRow; date: string; time: string | null }
    const candidates: Candidate[] = []

    const collect = (rows: Record<string, unknown>[] | null | undefined, dateKey: string, timeKey: string) => {
      for (const row of rows ?? []) {
        const activity = pickActivity(row.activities as ActivityRow | ActivityRow[] | undefined)
        if (!activity || activity.is_deleted) continue
        const date = row[dateKey] ? String(row[dateKey]).slice(0, 10) : null
        if (!date) continue
        const time = row[timeKey] ? String(row[timeKey]) : null
        candidates.push({ activity, date, time })
      }
    }

    collect(tasks.data as Record<string, unknown>[] | null, 'due_date', 'due_time')
    collect(exams.data as Record<string, unknown>[] | null, 'date', 'time')
    collect(assignments.data as Record<string, unknown>[] | null, 'due_date', 'due_time')

    if (candidates.length === 0) return stats

    const activityIds = [...new Set(candidates.map((candidate) => candidate.activity.id))]
    const { data: existing } = await supabase
      .from('activity_reminders')
      .select('activity_id, is_active, was_fired, reminder_timestamp')
      .in('activity_id', activityIds)

    const existingByActivity = new Map<string, Array<Record<string, unknown>>>()
    for (const row of existing ?? []) {
      const key = String(row.activity_id)
      const list = existingByActivity.get(key) ?? []
      list.push(row as Record<string, unknown>)
      existingByActivity.set(key, list)
    }

    for (const candidate of candidates) {
      const { activity, date, time } = candidate
      const rows = existingByActivity.get(activity.id) ?? []

      // Lembretes manuais ativos são tratados por processExplicitReminders.
      if (rows.some((row) => Boolean(row.is_active) && !row.was_fired)) continue

      const context = await loadUserContext(activity.user_id)
      if (!typeEnabled(context.preferences, activity.type)) continue

      const reminderAt = defaultReminderInstant(activity.type, date, time, context.preferences, APP_TIME_ZONE)
      if (!isWithinWindow(reminderAt, now)) continue

      const alreadyFired = rows.some((row) => {
        if (!row.was_fired || !row.reminder_timestamp) return false
        const firedAt = new Date(String(row.reminder_timestamp)).getTime()
        return Math.abs(firedAt - reminderAt.getTime()) < 60 * 60 * 1000
      })
      if (alreadyFired) continue

      stats.processed += 1
      const { reminderType, offsetMinutes } = reminderTypeForHours(
        defaultReminderHours(activity.type, context.preferences.taskRemindersHours),
      )

      if (
        isQuietHoursInTimeZone(
          now,
          context.preferences.quietHoursStart,
          context.preferences.quietHoursEnd,
          APP_TIME_ZONE,
        )
      ) {
        // Cria um lembrete pendente para o fim do silêncio; o processamento
        // manual (acima) o enviará na próxima execução.
        const next = nextQuietHoursEnd(now, context.preferences.quietHoursEnd, APP_TIME_ZONE)
        if (next) {
          await supabase.from('activity_reminders').insert({
            activity_id: activity.id,
            user_id: activity.user_id,
            reminder_type: reminderType,
            reminder_offset_minutes: offsetMinutes,
            reminder_time: eventTimeOfDay(time),
            reminder_timestamp: next.toISOString(),
            is_active: true,
            was_fired: false,
          })
        }
        stats.skipped += 1
        continue
      }

      if (context.subscriptions.length === 0) {
        stats.skipped += 1
        continue
      }

      const result = await dispatch(activity, context)
      stats.delivered += result.delivered
      stats.failed += result.failed

      if (result.delivered > 0) {
        await supabase.from('activity_reminders').insert({
          activity_id: activity.id,
          user_id: activity.user_id,
          reminder_type: reminderType,
          reminder_offset_minutes: offsetMinutes,
          reminder_time: eventTimeOfDay(time),
          reminder_timestamp: reminderAt.toISOString(),
          is_active: true,
          was_fired: true,
          fired_at: new Date().toISOString(),
        })
      }
    }

    return stats
  }

  try {
    const explicit = await processExplicitReminders()
    const defaults = await processDefaultReminders()
    const stats: Stats = {
      processed: explicit.processed + defaults.processed,
      delivered: explicit.delivered + defaults.delivered,
      failed: explicit.failed + defaults.failed,
      skipped: explicit.skipped + defaults.skipped,
    }
    const durationMs = Date.now() - startedAt

    return json({
      ok: true,
      ...stats,
      explicit,
      defaults,
      timeZone: APP_TIME_ZONE,
      durationMs,
      performanceOk: stats.processed === 0 || durationMs < 25_000,
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao processar lembretes',
      },
      500,
    )
  }
})
