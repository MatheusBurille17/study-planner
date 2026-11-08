import { z } from 'zod'

export const registerSchema = z
  .object({
    name: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
    email: z
      .string({ required_error: 'Email é obrigatório' })
      .trim()
      .min(1, 'Email é obrigatório')
      .email('Email inválido'),
    password: z
      .string({ required_error: 'Senha é obrigatória' })
      .min(1, 'Senha é obrigatória')
      .min(8, 'Senha deve ter no mínimo 8 caracteres'),
    passwordConfirm: z
      .string({ required_error: 'Confirmação é obrigatória' })
      .min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não conferem',
    path: ['passwordConfirm'],
  })

export type RegisterFormData = z.infer<typeof registerSchema>
