import type {
  Activity,
  Assignment,
  Exam,
  Reminder,
  Task,
} from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import { asDate } from '@/shared/lib/dates'

interface Row {
  [key: string]: unknown
}

function pickSpecialized(row: Row): Row {
  for (const key of ['tasks', 'exams', 'assignments']) {
    const value = row[key]
    if (Array.isArray(value) && value.length > 0) return value[0] as Row
    if (value && typeof value === 'object') return value as Row
  }
  return {}
}

function mapReminder(row: Row): Reminder {
  return {
    id: String(row.id),
    activityId: String(row.activity_id),
    userId: String(row.user_id),
    reminderType: row.reminder_type as Reminder['reminderType'],
    reminderOffsetMinutes: Number(row.reminder_offset_minutes ?? 0),
    reminderTime: String(row.reminder_time ?? '09:00').slice(0, 5),
    reminderTimestamp: asDate(row.reminder_timestamp) ?? new Date(),
    isActive: Boolean(row.is_active ?? true),
    wasFired: Boolean(row.was_fired ?? false),
    firedAt: asDate(row.fired_at),
    createdAt: asDate(row.created_at) ?? new Date(),
    updatedAt: asDate(row.updated_at) ?? new Date(),
    reminderOffset: undefined,
  }
}

/** Mapeia linha Supabase (activities + especialização + reminders) para domínio. */
export function mapSupabaseRowToActivity(row: Row): Activity {
  const specialized = pickSpecialized(row)
  const base = {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title ?? ''),
    description: (row.description as string | null) ?? undefined,
    subjectId: (row.subject_id as string | null) ?? undefined,
    createdAt: asDate(row.created_at) ?? new Date(),
    updatedAt: asDate(row.updated_at) ?? new Date(),
    reminders: Array.isArray(row.activity_reminders)
      ? (row.activity_reminders as Row[]).map(mapReminder)
      : Array.isArray(row.reminders)
        ? (row.reminders as Row[]).map(mapReminder)
        : [],
    synced: Boolean(row.synced ?? true),
    isDeleted: Boolean(row.is_deleted ?? false),
    deletedAt: asDate(row.deleted_at),
  }

  const type = String(row.type ?? '').toLowerCase()
  const dueDate = asDate(specialized.due_date)
  const dueTime = (specialized.due_time as string | null)?.slice(0, 5) ?? undefined

  if (type === 'task') {
    const task: Task = {
      ...base,
      type: 'task',
      dueDate,
      dueTime,
      priority: (specialized.priority as Task['priority']) ?? 'MEDIUM',
      status: (specialized.status as Task['status']) ?? 'TODO',
      estimatedTimeMinutes:
        specialized.estimated_time_minutes !== null && specialized.estimated_time_minutes !== undefined
          ? Number(specialized.estimated_time_minutes)
          : undefined,
      tags: Array.isArray(specialized.tags) ? (specialized.tags as string[]) : [],
    }
    return task
  }

  if (type === 'exam') {
    const exam: Exam = {
      ...base,
      type: 'exam',
      date: asDate(specialized.date) ?? new Date(),
      time: (specialized.time as string | null)?.slice(0, 5) ?? undefined,
      examType: (specialized.exam_type as Exam['examType']) ?? 'WRITTEN',
      content: Array.isArray(specialized.content) ? (specialized.content as string[]) : [],
      location: (specialized.location as string | null) ?? undefined,
      notes: (specialized.notes as string | null) ?? undefined,
    }
    return exam
  }

  const assignment: Assignment = {
    ...base,
    type: 'assignment',
    dueDate: dueDate ?? new Date(),
    dueTime,
    assignmentType: (specialized.assignment_type as Assignment['assignmentType']) ?? 'WRITTEN',
    criteria: (specialized.criteria as string | null) ?? undefined,
    status: (specialized.status as Assignment['status']) ?? 'PENDING',
    submittedAt: asDate(specialized.submitted_at),
    gradedAt: asDate(specialized.graded_at),
  }
  return assignment
}

export function mapSupabaseRowToSubject(row: Row): Subject {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name ?? ''),
    code: (row.code as string | null) ?? undefined,
    color: (row.color as string | null) ?? undefined,
    professor: (row.professor as string | null) ?? undefined,
    createdAt: asDate(row.created_at) ?? new Date(),
    updatedAt: asDate(row.updated_at) ?? new Date(),
  }
}
