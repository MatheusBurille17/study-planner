import { z } from 'zod'

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string({ required_error: 'Nova senha é obrigatória' })
      .min(1, 'Nova senha é obrigatória')
      .min(8, 'Senha deve ter no mínimo 8 caracteres'),
    newPasswordConfirm: z
      .string({ required_error: 'Confirmação é obrigatória' })
      .min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'As senhas não conferem',
    path: ['newPasswordConfirm'],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
