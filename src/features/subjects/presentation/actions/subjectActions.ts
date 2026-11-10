'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser, UnauthorizedError } from '@/shared/lib/auth/helpers'
import { getSubjectRepository } from '@/features/activities/infrastructure/activityRepository'
import type { Subject } from '@/shared/types/subject'

const subjectSchema = z.object({
  name: z.string({ required_error: 'Nome é obrigatório' }).trim().min(1, 'Nome é obrigatório').max(100, 'Máximo 100 caracteres'),
  code: z.preprocess((value) => (value === '' ? undefined : value), z.string().max(50).optional()),
  color: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Cor inválida').optional(),
  ),
  professor: z.preprocess((value) => (value === '' ? undefined : value), z.string().max(150).optional()),
})

export interface SubjectActionResult {
  success: boolean
  subject?: Subject
  error?: { code: string; message: string }
}

export async function createSubjectAction(input: unknown): Promise<SubjectActionResult> {
  try {
    const user = await requireUser()
    const parsed = subjectSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Dados inválidos' } }
    }
    const repository = await getSubjectRepository()
    const subject = await repository.create(user.id, parsed.data)
    revalidatePath('/subjects')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    revalidatePath('/calendar')
    revalidatePath('/dashboard')
    return { success: true, subject }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar disciplina' } }
  }
}

export async function updateSubjectAction(id: string, input: unknown): Promise<SubjectActionResult> {
  try {
    const user = await requireUser()
    const parsed = subjectSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Dados inválidos' } }
    }
    const repository = await getSubjectRepository()
    const subject = await repository.update(id, user.id, parsed.data)
    revalidatePath('/subjects')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    revalidatePath('/calendar')
    revalidatePath('/dashboard')
    return { success: true, subject }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar disciplina' } }
  }
}

export async function deleteSubjectAction(id: string): Promise<SubjectActionResult> {
  try {
    const user = await requireUser()
    const repository = await getSubjectRepository()
    await repository.delete(id, user.id)
    revalidatePath('/subjects')
    revalidatePath('/activities')
    revalidatePath('/assessments')
    revalidatePath('/calendar')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } }
    }
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao excluir disciplina' } }
  }
}
