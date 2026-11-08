import type { Subject } from '@/shared/types/subject'

export type { Subject, CreateSubjectInput } from '@/shared/types/subject'

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Invariantes: nome não vazio (<= 100), cor hex válida quando presente. */
export function validateSubject(input: { name: string; color?: string }): string[] {
  const errors: string[] = []
  if (!input.name?.trim()) errors.push('Nome é obrigatório')
  if (input.name && input.name.length > 100) errors.push('Nome deve ter no máximo 100 caracteres')
  if (input.color && !HEX_REGEX.test(input.color)) errors.push('Cor inválida')
  return errors
}

export function subjectColor(subject?: Subject): string {
  return subject?.color ?? '#c4b5fd'
}
