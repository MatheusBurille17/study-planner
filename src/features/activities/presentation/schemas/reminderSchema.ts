import { z } from 'zod'
import { ReminderType } from '@/shared/types/activity'

const OFFSET_UNITS = ['MINUTES', 'HOURS', 'DAYS'] as const

export const reminderOffsetSchema = z
  .object({
    value: z.coerce
      .number({ invalid_type_error: 'Informe a quantidade' })
      .int('Use um número inteiro')
      .min(1, 'Mínimo 1')
      .max(43_200, 'Máximo 43200'),
    unit: z.enum(OFFSET_UNITS),
  })
  .refine((offset) => offset.unit !== 'DAYS' || offset.value <= 30, {
    message: 'Máximo de 30 dias',
    path: ['value'],
  })

export const reminderSchema = z
  .object({
    reminderType: z.enum([
      ReminderType.ON_DAY,
      ReminderType.ONE_HOUR_BEFORE,
      ReminderType.TWO_HOURS_BEFORE,
      ReminderType.THREE_HOURS_BEFORE,
      ReminderType.ONE_DAY_BEFORE,
      ReminderType.TWO_DAYS_BEFORE,
      ReminderType.CUSTOM,
    ]),
    reminderTime: z
      .string({ required_error: 'Informe a hora do lembrete' })
      .regex(/^\d{2}:\d{2}$/, 'Formato HH:mm inválido')
      .refine((time) => {
        const [hours, minutes] = time.split(':').map(Number)
        return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
      }, 'Hora deve estar entre 00:00 e 23:59'),
    reminderOffset: reminderOffsetSchema.optional(),
  })
  .refine((data) => data.reminderType !== ReminderType.CUSTOM || Boolean(data.reminderOffset), {
    message: 'Offset é obrigatório para lembretes personalizados',
    path: ['reminderOffset'],
  })

export type ReminderSchemaInput = z.infer<typeof reminderSchema>

export const remindersArraySchema = z
  .array(reminderSchema)
  .max(3, 'Máximo de 3 lembretes por atividade')
  .optional()
