import type { Activity } from '@/shared/types/activity'
import type { UpdateActivityInput } from '../../presentation/schemas/updateActivitySchema'
import { buildReminders, resolveEventDateTime } from '../../domain/rules'

export interface BuildActivityUpdateInput {
  existing: Activity
  data: UpdateActivityInput
  userId: string
  now?: Date
}

/**
 * Monta a entidade final de uma edição.
 *
 * É a fonte única de verdade para o update: aplica os campos recebidos,
 * recalcula os lembretes quando a data/hora (ou a lista) muda e preserva
 * ids/estado dos lembretes que continuam iguais.
 */
export function buildActivityUpdate({
  existing,
  data,
  userId,
  now = new Date(),
}: BuildActivityUpdateInput): Activity {
  const { timezone, ...fields } = data

  const base = {
    ...existing,
    ...fields,
    id: existing.id,
    userId,
    type: existing.type,
    createdAt: existing.createdAt,
    // Garante monotonicidade mesmo com clock skew entre cliente e servidor.
    updatedAt: new Date(Math.max(now.getTime(), existing.updatedAt.getTime() + 1)),
  } as Activity

  const eventDate = resolveEventDateTime(base, timezone)
  const reminders = buildReminders({
    activityId: existing.id,
    userId,
    eventDate,
    // No edit, `undefined` significa "sem lembretes" (o formulário envia o estado completo).
    reminders: data.reminders,
    previous: existing.reminders,
    now,
    allowPast: true,
    timeZone: timezone,
  })

  return { ...base, reminders }
}
