import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  NotificationLog,
  NotificationPreferences,
  PushSubscriptionRecord,
} from '@/shared/types/notification'
import type { NotificationRepository, PushSubscriptionInput } from '../domain/repository'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../domain/repository'

function mapSubscription(row: Record<string, unknown>): PushSubscriptionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth),
    isActive: Boolean(row.is_active ?? true),
    deviceInfo: row.device_info ? String(row.device_info) : undefined,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  }
}

function mapPreferences(row: Record<string, unknown>): NotificationPreferences {
  return {
    userId: String(row.user_id),
    remindersEnabled: Boolean(row.reminders_enabled ?? true),
    examsEnabled: Boolean(row.exams_enabled ?? true),
    assignmentsEnabled: Boolean(row.assignments_enabled ?? true),
    tasksEnabled: Boolean(row.tasks_enabled ?? true),
    taskRemindersHours: Number(row.task_reminders_hours ?? 3),
    quietHoursStart: row.quiet_hours_start ? String(row.quiet_hours_start).slice(0, 5) : undefined,
    quietHoursEnd: row.quiet_hours_end ? String(row.quiet_hours_end).slice(0, 5) : undefined,
    soundEnabled: Boolean(row.sound_enabled ?? true),
    vibrationEnabled: Boolean(row.vibration_enabled ?? true),
    updatedAt: new Date(String(row.updated_at ?? new Date().toISOString())),
  }
}

/** Repositório Supabase de notificações, com RLS por usuário. */
export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async saveSubscription(userId: string, input: PushSubscriptionInput): Promise<PushSubscriptionRecord> {
    const { data: existing } = await this.client
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', input.endpoint)
      .maybeSingle()

    if (existing) {
      const { data, error } = await this.client
        .from('push_subscriptions')
        .update({
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          is_active: true,
          device_info: input.deviceInfo ?? existing.device_info,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error || !data) throw new Error(error?.message ?? 'Erro ao atualizar inscrição')
      return mapSubscription(data as Record<string, unknown>)
    }

    const { data, error } = await this.client
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        is_active: true,
        device_info: input.deviceInfo,
      })
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Erro ao criar inscrição')
    return mapSubscription(data as Record<string, unknown>)
  }

  async getActiveSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    const { data, error } = await this.client
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => mapSubscription(row as Record<string, unknown>))
  }

  async unsubscribeAll(userId: string): Promise<void> {
    const { error } = await this.client
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await this.client
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return mapPreferences(data as Record<string, unknown>)

    const { data: created, error: createError } = await this.client
      .from('notification_preferences')
      .insert({
        user_id: userId,
        reminders_enabled: DEFAULT_NOTIFICATION_PREFERENCES.remindersEnabled,
        exams_enabled: DEFAULT_NOTIFICATION_PREFERENCES.examsEnabled,
        assignments_enabled: DEFAULT_NOTIFICATION_PREFERENCES.assignmentsEnabled,
        tasks_enabled: DEFAULT_NOTIFICATION_PREFERENCES.tasksEnabled,
        task_reminders_hours: DEFAULT_NOTIFICATION_PREFERENCES.taskRemindersHours,
        quiet_hours_start: DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
        quiet_hours_end: DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
        sound_enabled: DEFAULT_NOTIFICATION_PREFERENCES.soundEnabled,
        vibration_enabled: DEFAULT_NOTIFICATION_PREFERENCES.vibrationEnabled,
      })
      .select('*')
      .single()
    if (createError || !created) throw new Error(createError?.message ?? 'Erro ao criar preferências')
    return mapPreferences(created as Record<string, unknown>)
  }

  async updatePreferences(
    userId: string,
    input: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>,
  ): Promise<NotificationPreferences> {
    await this.getPreferences(userId)
    const { data, error } = await this.client
      .from('notification_preferences')
      .update({
        ...(input.remindersEnabled !== undefined ? { reminders_enabled: input.remindersEnabled } : {}),
        ...(input.examsEnabled !== undefined ? { exams_enabled: input.examsEnabled } : {}),
        ...(input.assignmentsEnabled !== undefined ? { assignments_enabled: input.assignmentsEnabled } : {}),
        ...(input.tasksEnabled !== undefined ? { tasks_enabled: input.tasksEnabled } : {}),
        ...(input.taskRemindersHours !== undefined ? { task_reminders_hours: input.taskRemindersHours } : {}),
        ...(input.quietHoursStart !== undefined ? { quiet_hours_start: input.quietHoursStart } : {}),
        ...(input.quietHoursEnd !== undefined ? { quiet_hours_end: input.quietHoursEnd } : {}),
        ...(input.soundEnabled !== undefined ? { sound_enabled: input.soundEnabled } : {}),
        ...(input.vibrationEnabled !== undefined ? { vibration_enabled: input.vibrationEnabled } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Erro ao atualizar preferências')
    return mapPreferences(data as Record<string, unknown>)
  }

  async logNotification(log: Omit<NotificationLog, 'id'>): Promise<NotificationLog> {
    const { data, error } = await this.client
      .from('notification_logs')
      .insert({
        user_id: log.userId,
        activity_id: log.activityId ?? null,
        activity_type: log.activityType ? String(log.activityType).toUpperCase() : null,
        title: log.title,
        body: log.body,
        sent_at: log.sentAt.toISOString(),
        status: log.status === 'sent' ? 'success' : log.status === 'failed' ? 'failed' : 'retrying',
        error: log.error ?? null,
      })
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Erro ao registrar notificação')
    return { ...log, id: String(data.id) }
  }

  async getLogs(userId: string, limit = 50): Promise<NotificationLog[]> {
    const { data, error } = await this.client
      .from('notification_logs')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      activityId: row.activity_id ? String(row.activity_id) : undefined,
      activityType: row.activity_type ? String(row.activity_type).toLowerCase() : undefined,
      title: String(row.title),
      body: String(row.body),
      sentAt: new Date(String(row.sent_at)),
      status: row.status === 'success' ? 'sent' : row.status === 'failed' ? 'failed' : 'pending',
      error: row.error ? String(row.error) : undefined,
    }))
  }

  async logDelivery(input: {
    notificationId: string
    userId: string
    subscriptionId: string
    attempt: number
    status: 'pending' | 'success' | 'failed'
    errorCode?: number
    errorMessage?: string
    nextRetryAt?: Date
  }): Promise<void> {
    await this.client.from('notification_delivery_log').insert({
      notification_id: input.notificationId,
      user_id: input.userId,
      subscription_id: input.subscriptionId,
      attempt: input.attempt,
      status: input.status,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      next_retry_at: input.nextRetryAt?.toISOString() ?? null,
    })
  }

  async logClick(notificationId: string, userId: string, referrer?: string): Promise<void> {
    await this.client.from('notification_clicks').insert({
      notification_id: notificationId,
      user_id: userId,
      clicked_at: new Date().toISOString(),
      referrer: referrer ?? null,
    })
  }
}
