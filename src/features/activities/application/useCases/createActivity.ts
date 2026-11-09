import type { Activity } from '@/shared/types/activity'
import type { ActivityRepository } from '../../domain/repository'
import { ActivityRuleError, buildReminders, resolveEventDateTime } from '../../domain/rules'
import {
  Assignment as AssignmentEntity,
  Exam as ExamEntity,
  Task as TaskEntity,
} from '../../domain/activity'
import { handleSupabaseError } from '../errorHandler'
import { toDate } from '@/shared/utils/dateHelpers'
import type { CreateActivityDTO, CreateActivityOutput } from '../dto/CreateActivityDTO'

/** Converte Date | string em Date com validação. */
function requireDate(value: Date | string | undefined, field: string): Date {
  const date = toDate(value)
  if (!date) {
    throw new ActivityRuleError('Data inválida', 'INVALID_DATE', field)
  }
  return date
}

/**
 * Caso de uso principal: valida entrada, cria entidade de domínio,
 * calcula lembretes e persiste via repositório.
 */
export class CreateActivityUseCase {
  constructor(private readonly repository: ActivityRepository) {}

  async execute(input: CreateActivityDTO & { userId: string }): Promise<CreateActivityOutput> {
    try {
      const now = new Date()

      let eventDate: Date | undefined
      if (input.type === 'task' && input.dueDate) {
        eventDate = resolveEventDateTime(
          { type: 'task', dueDate: requireDate(input.dueDate, 'dueDate'), dueTime: input.dueTime },
          input.timezone,
        )
      } else if (input.type === 'exam') {
        eventDate = resolveEventDateTime(
          { type: 'exam', date: requireDate(input.date, 'date'), time: input.time },
          input.timezone,
        )
      } else if (input.type === 'assignment') {
        eventDate = resolveEventDateTime(
          { type: 'assignment', dueDate: requireDate(input.dueDate, 'dueDate'), dueTime: input.dueTime },
          input.timezone,
        )
      }

      const activityId = crypto.randomUUID()
      const reminders = buildReminders({
        activityId,
        userId: input.userId,
        eventDate,
        reminders: input.reminders,
        now,
        allowPast: false,
        timeZone: input.timezone,
      })

      let entity: TaskEntity | ExamEntity | AssignmentEntity

      if (input.type === 'task') {
        entity = new TaskEntity({
          id: activityId,
          userId: input.userId,
          title: input.title?.trim() ?? '',
          description: input.description?.trim() || undefined,
          subjectId: input.subjectId || undefined,
          dueDate: input.dueDate ? requireDate(input.dueDate, 'dueDate') : undefined,
          dueTime: input.dueTime || undefined,
          priority: input.priority,
          status: input.status as never,
          estimatedTimeMinutes: input.estimatedTimeMinutes,
          tags: input.tags,
          reminders,
        })
      } else if (input.type === 'exam') {
        entity = new ExamEntity({
          id: activityId,
          userId: input.userId,
          title: input.title?.trim() || 'Prova',
          description: input.description?.trim() || undefined,
          subjectId: input.subjectId || '',
          date: requireDate(input.date, 'date'),
          time: input.time || undefined,
          examType: input.examType ?? ('WRITTEN' as never),
          content: input.content,
          location: input.location?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          reminders,
        })
      } else {
        entity = new AssignmentEntity({
          id: activityId,
          userId: input.userId,
          title: input.title?.trim() ?? '',
          description: input.description?.trim() ?? '',
          subjectId: input.subjectId || '',
          dueDate: requireDate(input.dueDate, 'dueDate'),
          dueTime: input.dueTime || undefined,
          assignmentType: input.assignmentType ?? ('WRITTEN' as never),
          criteria: input.criteria?.trim() || undefined,
          status: input.status as never,
          reminders,
        })
      }

      entity.validateInvariants()
      const activity = entity.toActivity()
      const saved = await this.repository.save(activity)

      return { success: true, activity: saved }
    } catch (error) {
      if (error instanceof ActivityRuleError) {
        return {
          success: false,
          error: { code: error.code, message: error.message, field: error.field },
        }
      }
      if (error && typeof error === 'object' && 'code' in error) {
        const mapped = handleSupabaseError(error as { code?: string; message?: string })
        return { success: false, error: { code: mapped.code, message: mapped.message, field: mapped.field } }
      }
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar atividade. Tente novamente.' },
      }
    }
  }
}

export async function createActivityUseCase(
  input: CreateActivityDTO & { userId: string },
  repository: ActivityRepository,
): Promise<CreateActivityOutput> {
  return new CreateActivityUseCase(repository).execute(input)
}

export type { Activity }
