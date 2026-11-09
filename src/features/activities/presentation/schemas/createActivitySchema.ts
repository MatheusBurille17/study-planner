import { z } from 'zod'
import { startOfDay } from 'date-fns'
import {
  AssignmentStatus,
  AssignmentType,
  ExamType,
  Priority,
  ReminderType,
  TaskStatus,
} from '@/shared/types/activity'
import { remindersArraySchema, reminderSchema } from './reminderSchema'
import {
  ActivityRuleError,
  calculateReminderTimestamp,
  resolveEventDateTime,
  validateReminderTimestamp,
} from '../../domain/rules'
import { DATE_ONLY_PATTERN, parseDateOnly } from '@/shared/utils/dateHelpers'

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value

const optionalText = (max: number, message: string) =>
  z.preprocess(emptyToUndefined, z.string().max(max, message).optional())

const optionalUuid = (message: string) =>
  z.preprocess(emptyToUndefined, z.string().uuid(message).optional())

/**
 * Datas de calendário (`yyyy-MM-dd`) são lidas no fuso local, nunca como UTC.
 * Isso evita o clássico "salvou um dia antes".
 */
const localDateInput = (value: unknown) => {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) return value
  return parseDateOnly(value) ?? new Date(Number.NaN)
}

const optionalDate = z.preprocess(
  (value) => localDateInput(emptyToUndefined(value)),
  z.coerce.date({ invalid_type_error: 'Data inválida' }).optional(),
)

const requiredDate = (message = 'Data é obrigatória') =>
  z.preprocess(
    (value) => localDateInput(value === '' || value === null ? undefined : value),
    z.coerce.date({ required_error: message, invalid_type_error: 'Data inválida' }),
  )


const optionalTime = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato HH:mm')
    .optional(),
)

const optionalNumber = (min: number, max: number, message: string) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().int('Use um número inteiro').min(min, message).max(max, message).optional(),
  )

const tagsSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    }
    return value
  },
  z.array(z.string().max(50, 'Cada tag deve ter no máximo 50 caracteres')).max(10, 'Máximo de 10 tags').optional(),
)

function isTodayOrFuture(date: Date): boolean {
  return startOfDay(date) >= startOfDay(new Date())
}

/** Valida lembretes calculados contra a data do evento. */
function refineReminders(
  eventDate: Date | undefined,
  reminders: z.infer<typeof reminderSchema>[] | undefined,
  ctx: z.RefinementCtx,
  options: { allowPast: boolean; timeZone?: string },
) {
  if (!reminders?.length) return
  if (!eventDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Defina a data do evento antes de adicionar lembretes',
      path: ['reminders'],
    })
    return
  }

  const timestamps = new Set<number>()
  for (const reminder of reminders) {
    try {
      const timestamp = calculateReminderTimestamp(
        eventDate,
        reminder.reminderType,
        reminder.reminderTime,
        reminder.reminderOffset,
        options.timeZone,
      )
      validateReminderTimestamp(timestamp, eventDate, new Date(), options.allowPast)

      if (timestamps.has(timestamp.getTime())) {
        throw new ActivityRuleError(
          'Não é possível ter lembretes duplicados',
          'DUPLICATE_REMINDER',
          'reminders',
        )
      }
      timestamps.add(timestamp.getTime())
    } catch (error) {
      if (!(error instanceof ActivityRuleError)) throw error
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error.message,
        path: ['reminders'],
      })
    }
  }
}

function buildTaskSchema(allowPast: boolean) {
  return z
    .object({
      type: z.literal('task'),
      title: z
        .string({ required_error: 'Título é obrigatório' })
        .trim()
        .min(1, 'Título é obrigatório')
        .max(200, 'Máximo 200 caracteres'),
      description: optionalText(2000, 'Máximo 2000 caracteres'),
      subjectId: optionalUuid('Selecione uma disciplina válida'),
      dueDate: optionalDate,
      dueTime: optionalTime,
      priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
      status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
      estimatedTimeMinutes: optionalNumber(0, 999, 'Tempo estimado deve estar entre 0 e 999 minutos'),
      tags: tagsSchema,
      reminders: remindersArraySchema,
      timezone: z.string().min(1).max(64).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.dueDate && !allowPast && !isTodayOrFuture(data.dueDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Data não pode estar no passado',
          path: ['dueDate'],
        })
      }
      const eventDate = resolveEventDateTime(
        { type: 'task', dueDate: data.dueDate, dueTime: data.dueTime },
        data.timezone,
      )
      refineReminders(eventDate, data.reminders, ctx, {
        allowPast,
        timeZone: data.timezone,
      })
    })
}

function buildExamSchema(allowPast: boolean) {
  return z
    .object({
      type: z.literal('exam'),
      title: z.preprocess(emptyToUndefined, z.string().max(200, 'Máximo 200 caracteres').optional()),
      description: optionalText(2000, 'Máximo 2000 caracteres'),
      subjectId: z
        .string({ required_error: 'Selecione uma disciplina' })
        .uuid('Selecione uma disciplina'),
      date: requiredDate('Data da prova é obrigatória'),
      time: optionalTime,
      examType: z.nativeEnum(ExamType).default(ExamType.WRITTEN),
      content: z.preprocess(
        (value) => {
          if (typeof value === 'string') {
            return value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          }
          return value
        },
        z.array(z.string().max(120, 'Máximo 120 caracteres')).max(10, 'Máximo de 10 tópicos').optional(),
      ),
      location: optionalText(100, 'Máximo 100 caracteres'),
      notes: optionalText(1000, 'Máximo 1000 caracteres'),
      reminders: remindersArraySchema,
      timezone: z.string().min(1).max(64).optional(),
    })
    .superRefine((data, ctx) => {
      if (!allowPast && !isTodayOrFuture(data.date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Data não pode estar no passado',
          path: ['date'],
        })
      }
      const eventDate = resolveEventDateTime(
        { type: 'exam', date: data.date, time: data.time },
        data.timezone,
      )
      refineReminders(eventDate, data.reminders, ctx, {
        allowPast,
        timeZone: data.timezone,
      })
    })
}

function buildAssignmentSchema(allowPast: boolean) {
  return z
    .object({
      type: z.literal('assignment'),
      title: z
        .string({ required_error: 'Título é obrigatório' })
        .trim()
        .min(1, 'Título é obrigatório')
        .max(200, 'Máximo 200 caracteres'),
      description: z
        .string({ required_error: 'Descrição é obrigatória' })
        .trim()
        .min(1, 'Descrição é obrigatória')
        .max(3000, 'Máximo 3000 caracteres'),
      subjectId: z
        .string({ required_error: 'Selecione uma disciplina' })
        .uuid('Selecione uma disciplina'),
      dueDate: requiredDate('Data de entrega é obrigatória'),
      dueTime: optionalTime,
      assignmentType: z.nativeEnum(AssignmentType).default(AssignmentType.WRITTEN),
      criteria: optionalText(2000, 'Máximo 2000 caracteres'),
      status: z.nativeEnum(AssignmentStatus).default(AssignmentStatus.PENDING),
      reminders: remindersArraySchema,
      timezone: z.string().min(1).max(64).optional(),
    })
    .superRefine((data, ctx) => {
      if (!allowPast && !isTodayOrFuture(data.dueDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Data não pode estar no passado',
          path: ['dueDate'],
        })
      }
      const eventDate = resolveEventDateTime(
        { type: 'assignment', dueDate: data.dueDate, dueTime: data.dueTime },
        data.timezone,
      )
      refineReminders(eventDate, data.reminders, ctx, {
        allowPast,
        timeZone: data.timezone,
      })
    })
}

export const createTaskSchema = buildTaskSchema(false)
export const createExamSchema = buildExamSchema(false)
export const createAssignmentSchema = buildAssignmentSchema(false)

export const createActivitySchema = z.union([
  createTaskSchema,
  createExamSchema,
  createAssignmentSchema,
])

export const updateTaskSchema = buildTaskSchema(true)
export const updateExamSchema = buildExamSchema(true)
export const updateAssignmentSchema = buildAssignmentSchema(true)

export const updateActivitySchema = z.union([
  updateTaskSchema,
  updateExamSchema,
  updateAssignmentSchema,
])

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type CreateExamInput = z.infer<typeof createExamSchema>
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>
export type CreateActivityInput = z.infer<typeof createActivitySchema>
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>
