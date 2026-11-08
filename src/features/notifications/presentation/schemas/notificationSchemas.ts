import { z } from 'zod'

export const subscribeSchema = z.object({
  endpoint: z.string({ required_error: 'Endpoint é obrigatório' }).url('Endpoint inválido'),
  keys: z.object({
    p256dh: z.string({ required_error: 'Chave p256dh é obrigatória' }).min(10, 'Chave p256dh inválida'),
    auth: z.string({ required_error: 'Chave auth é obrigatória' }).min(6, 'Chave auth inválida'),
  }),
  deviceInfo: z.string().max(300).optional(),
})

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Formato HH:mm')
  .refine((value) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
  }, 'Hora inválida')

export const notificationPreferencesSchema = z
  .object({
    remindersEnabled: z.boolean().optional(),
    examsEnabled: z.boolean().optional(),
    assignmentsEnabled: z.boolean().optional(),
    tasksEnabled: z.boolean().optional(),
    taskRemindersHours: z.coerce
      .number()
      .int('Use horas inteiras')
      .min(0, 'Mínimo 0 horas')
      .max(6, 'Máximo 6 horas')
      .optional(),
    quietHoursStart: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      timeSchema.optional(),
    ),
    quietHoursEnd: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      timeSchema.optional(),
    ),
    soundEnabled: z.boolean().optional(),
    vibrationEnabled: z.boolean().optional(),
  })
  .refine(
    (data) => !data.quietHoursStart || !data.quietHoursEnd || data.quietHoursStart !== data.quietHoursEnd,
    { message: 'Início e fim do silêncio não podem ser iguais', path: ['quietHoursEnd'] },
  )

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>
