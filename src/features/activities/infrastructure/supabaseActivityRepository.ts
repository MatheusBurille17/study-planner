import type { SupabaseClient } from '@supabase/supabase-js'
import type { Activity } from '@/shared/types/activity'
import type { ActivityFilter } from '@/shared/types/notification'
import type { CreateSubjectInput, Subject } from '@/shared/types/subject'
import type { ActivityRepository, SubjectRepository } from '../domain/repository'
import { RepositoryError } from '../domain/repository'
import { mapSupabaseRowToActivity, mapSupabaseRowToSubject } from './mappers/supabaseMappers'
import { toISODate } from '@/shared/utils/dateHelpers'
import { invalidateDashboardCache } from '@/features/dashboard/application/dashboardCache'

/**
 * Colunas completas: usadas apenas em telas de detalhe/edição.
 * Inclui `activity_reminders(*)` e textos longos (conteúdo, observações, critérios).
 */
const SELECT_ACTIVITY = '*, tasks(*), exams(*), assignments(*), activity_reminders(*)'

/**
 * Colunas enxutas para listagens: mantém só o que os cards exibem e o que
 * os filtros usam. Ficam de fora `notes`, `content`, `criteria` e
 * `activity_reminders(*)` — é onde está o volume de dados.
 */
const SELECT_ACTIVITY_LIST =
  'id, user_id, type, title, description, subject_id, created_at, updated_at, synced, is_deleted, deleted_at, tasks(due_date, due_time, priority, status, estimated_time_minutes, tags), exams(date, time, exam_type, location), assignments(due_date, due_time, assignment_type, status, submitted_at, graded_at)'

const SELECT_SUBJECT = 'id, user_id, name, code, color, professor, created_at, updated_at'

/**
 * Teto de segurança por listagem: impede que um histórico muito grande
 * transforme cada navegação em um download de vários MB.
 */
const MAX_LIST_ROWS = 500

function baseRow(activity: Activity): Record<string, unknown> {
  return {
    id: activity.id,
    user_id: activity.userId,
    type: activity.type.toUpperCase(),
    title: activity.title,
    description: activity.description ?? null,
    subject_id: activity.subjectId ?? null,
    created_at: activity.createdAt.toISOString(),
    updated_at: activity.updatedAt.toISOString(),
    synced: true,
    is_deleted: activity.isDeleted ?? false,
    deleted_at: activity.deletedAt?.toISOString() ?? null,
  }
}

function specialization(activity: Activity): { table: string; row: Record<string, unknown> } | null {
  if (activity.type === 'task') {
    return {
      table: 'tasks',
      row: {
        id: activity.id,
        due_date: activity.dueDate ? toISODate(activity.dueDate) : null,
        due_time: activity.dueTime ? `${activity.dueTime}:00`.slice(0, 8) : null,
        priority: activity.priority,
        status: activity.status,
        estimated_time_minutes: activity.estimatedTimeMinutes ?? null,
        tags: activity.tags ?? [],
      },
    }
  }
  if (activity.type === 'exam') {
    return {
      table: 'exams',
      row: {
        id: activity.id,
        date: toISODate(activity.date),
        time: activity.time ? `${activity.time}:00`.slice(0, 8) : null,
        exam_type: activity.examType,
        content: activity.content ?? [],
        location: activity.location ?? null,
        notes: activity.notes ?? null,
      },
    }
  }
  if (activity.type === 'assignment') {
    return {
      table: 'assignments',
      row: {
        id: activity.id,
        due_date: toISODate(activity.dueDate),
        due_time: activity.dueTime ? `${activity.dueTime}:00`.slice(0, 8) : null,
        assignment_type: activity.assignmentType,
        criteria: activity.criteria ?? null,
        status: activity.status,
        submitted_at: activity.submittedAt?.toISOString() ?? null,
        graded_at: activity.gradedAt?.toISOString() ?? null,
      },
    }
  }
  return null
}

function reminderRows(activity: Activity): Record<string, unknown>[] {
  return (activity.reminders ?? []).map((reminder) => ({
    id: reminder.id,
    activity_id: activity.id,
    user_id: activity.userId,
    reminder_type: reminder.reminderType,
    reminder_offset_minutes: reminder.reminderOffsetMinutes,
    reminder_time: `${reminder.reminderTime}:00`.slice(0, 8),
    reminder_timestamp: reminder.reminderTimestamp.toISOString(),
    is_active: reminder.isActive,
    was_fired: reminder.wasFired ?? false,
    fired_at: reminder.firedAt?.toISOString() ?? null,
    created_at: reminder.createdAt.toISOString(),
    updated_at: reminder.updatedAt.toISOString(),
  }))
}

/** Repositório Supabase com RLS (user_id) e persistência transacional por compensação. */
export class SupabaseActivityRepository implements ActivityRepository {
  constructor(private readonly client: SupabaseClient) {}

  private fail(context: string, error: { message?: string } | null): never {
    throw new RepositoryError(
      `Erro ao ${context}: ${error?.message ?? 'desconhecido'}`,
      'SUPABASE_ERROR',
      500,
    )
  }

  async save(activity: Activity): Promise<Activity> {
    const { error: baseError } = await this.client.from('activities').insert(baseRow(activity))
    if (baseError) this.fail('criar atividade', baseError)

    const spec = specialization(activity)
    if (spec) {
      const { error } = await this.client.from(spec.table).insert(spec.row)
      if (error) {
        await this.client.from('activities').delete().eq('id', activity.id)
        this.fail('criar especialização', error)
      }
    }

    const reminders = reminderRows(activity)
    if (reminders.length > 0) {
      const { error } = await this.client.from('activity_reminders').insert(reminders)
      if (error) {
        await this.client.from('activities').delete().eq('id', activity.id)
        this.fail('criar lembretes', error)
      }
    }

    invalidateDashboardCache(activity.userId)
    return activity
  }

  async getById(id: string, userId: string): Promise<Activity | null> {
    const { data, error } = await this.client
      .from('activities')
      .select(SELECT_ACTIVITY)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) this.fail('buscar atividade', error)
    return data ? mapSupabaseRowToActivity(data as Record<string, unknown>) : null
  }

  async getByUserId(userId: string, _filter?: ActivityFilter): Promise<Activity[]> {
    const limit = Math.min(_filter?.limit ?? MAX_LIST_ROWS, MAX_LIST_ROWS)
    const offset = Math.max(_filter?.offset ?? 0, 0)

    let query = this.client
      .from('activities')
      .select(SELECT_ACTIVITY_LIST)
      .eq('user_id', userId)
      .eq('is_deleted', false)
    if (_filter?.types?.length) {
      query = query.in('type', _filter.types.map((type) => String(type).toUpperCase()))
    }
    if (_filter?.subjectIds?.length) query = query.in('subject_id', _filter.subjectIds)
    if (_filter?.dateFrom) query = query.gte('created_at', _filter.dateFrom.toISOString())

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) this.fail('listar atividades', error)

    // Filtros que dependem de campos especializados são aplicados em memória.
    const activities = (data ?? []).map((row) => mapSupabaseRowToActivity(row as Record<string, unknown>))
    if (!_filter) return activities
    const { filterActivities } = await import('../domain/filters')
    return filterActivities(activities, _filter)
  }

  async update(activity: Activity): Promise<Activity> {
    const { error: baseError } = await this.client
      .from('activities')
      .update({
        title: activity.title,
        description: activity.description ?? null,
        subject_id: activity.subjectId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activity.id)
      .eq('user_id', activity.userId)
    if (baseError) this.fail('atualizar atividade', baseError)

    for (const table of ['tasks', 'exams', 'assignments']) {
      await this.client.from(table).delete().eq('id', activity.id)
    }

    const spec = specialization(activity)
    if (spec) {
      const { error } = await this.client.from(spec.table).insert(spec.row)
      if (error) this.fail('atualizar especialização', error)
    }

    await this.client.from('activity_reminders').delete().eq('activity_id', activity.id)
    const reminders = reminderRows(activity)
    if (reminders.length > 0) {
      const { error } = await this.client.from('activity_reminders').insert(reminders)
      if (error) this.fail('atualizar lembretes', error)
    }

    invalidateDashboardCache(activity.userId)
    return activity
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.softDelete(id, userId)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const { error } = await this.client
      .from('activities')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) this.fail('mover para lixeira', error)
    invalidateDashboardCache(userId)
  }

  async restore(id: string, userId: string): Promise<Activity> {
    const { data, error } = await this.client
      .from('activities')
      .update({ is_deleted: false, deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select(SELECT_ACTIVITY)
      .single()
    if (error || !data) this.fail('restaurar atividade', error)
    invalidateDashboardCache(userId)
    return mapSupabaseRowToActivity(data as Record<string, unknown>)
  }

  async getDeleted(userId: string): Promise<Activity[]> {
    const { data, error } = await this.client
      .from('activities')
      .select(SELECT_ACTIVITY_LIST)
      .eq('user_id', userId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
      .limit(MAX_LIST_ROWS)
    if (error) this.fail('listar lixeira', error)
    return (data ?? []).map((row) => mapSupabaseRowToActivity(row as Record<string, unknown>))
  }

  async permanentDelete(id: string, userId: string): Promise<void> {
    const { error } = await this.client.from('activities').delete().eq('id', id).eq('user_id', userId)
    if (error) this.fail('excluir permanentemente', error)
    invalidateDashboardCache(userId)
  }

  async count(userId: string): Promise<number> {
    const { count, error } = await this.client
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_deleted', false)
    if (error) this.fail('contar atividades', error)
    return count ?? 0
  }
}

/** Repositório Supabase de disciplinas. */
export class SupabaseSubjectRepository implements SubjectRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(userId: string): Promise<Subject[]> {
    const { data, error } = await this.client
      .from('subjects')
      .select(SELECT_SUBJECT)
      .eq('user_id', userId)
      .order('name', { ascending: true })
    if (error) throw new RepositoryError(error.message, 'SUPABASE_ERROR')
    return (data ?? []).map((row) => mapSupabaseRowToSubject(row as Record<string, unknown>))
  }

  async getById(id: string, userId: string): Promise<Subject | null> {
    const { data, error } = await this.client
      .from('subjects')
      .select(SELECT_SUBJECT)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new RepositoryError(error.message, 'SUPABASE_ERROR')
    return data ? mapSupabaseRowToSubject(data as Record<string, unknown>) : null
  }

  async create(userId: string, input: CreateSubjectInput): Promise<Subject> {
    const { data, error } = await this.client
      .from('subjects')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        code: input.code?.trim() || null,
        color: input.color || '#c4b5fd',
        professor: input.professor?.trim() || null,
      })
      .select(SELECT_SUBJECT)
      .single()
    if (error || !data) throw new RepositoryError(error?.message ?? 'Erro ao criar disciplina', 'SUPABASE_ERROR')
    invalidateDashboardCache(userId)
    return mapSupabaseRowToSubject(data as Record<string, unknown>)
  }

  async update(id: string, userId: string, input: Partial<CreateSubjectInput>): Promise<Subject> {
    const { data, error } = await this.client
      .from('subjects')
      .update({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.code !== undefined ? { code: input.code.trim() || null } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.professor !== undefined ? { professor: input.professor.trim() || null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(SELECT_SUBJECT)
      .single()
    if (error || !data) throw new RepositoryError(error?.message ?? 'Erro ao atualizar disciplina', 'SUPABASE_ERROR')
    invalidateDashboardCache(userId)
    return mapSupabaseRowToSubject(data as Record<string, unknown>)
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.client.from('subjects').delete().eq('id', id).eq('user_id', userId)
    if (error) throw new RepositoryError(error.message, 'SUPABASE_ERROR')
    invalidateDashboardCache(userId)
  }
}
