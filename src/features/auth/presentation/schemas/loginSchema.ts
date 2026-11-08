import { z } from 'zod'

/** Schema de login (validação dupla: cliente + servidor). */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .trim()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>
