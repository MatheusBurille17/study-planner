import type { Activity } from '@/shared/types/activity'
import type { ActivityFilter } from '@/shared/types/notification'
import type { Reminder } from '@/shared/types/activity'
import type { Subject, CreateSubjectInput } from '@/shared/types/subject'

/**
 * Contrato de persistência de atividades.
 * Implementações devem aplicar isolamento por userId (RLS no Supabase).
 */
export interface ActivityRepository {
  /** Persiste uma nova atividade (e seus lembretes) e retorna a entidade salva. */
  save(activity: Activity): Promise<Activity>
  /** Busca atividade por id, garantindo que pertence ao usuário. */
  getById(id: string, userId: string): Promise<Activity | null>
  /** Lista atividades do usuário, opcionalmente filtradas. */
  getByUserId(userId: string, filter?: ActivityFilter): Promise<Activity[]>
  /** Atualiza atividade existente e sincroniza lembretes. */
  update(activity: Activity): Promise<Activity>
  /** Remove atividade (soft delete). */
  delete(id: string, userId: string): Promise<void>
  /** Move atividade para a lixeira com timestamp de exclusão. */
  softDelete(id: string, userId: string): Promise<void>
  /** Restaura atividade da lixeira. */
  restore(id: string, userId: string): Promise<Activity>
  /** Lista atividades na lixeira. */
  getDeleted(userId: string): Promise<Activity[]>
  /** Remove permanentemente (hard delete). */
  permanentDelete(id: string, userId: string): Promise<void>
  /** Contagem de atividades (usada no dashboard). */
  count(userId: string): Promise<number>
}

/** Contrato de persistência de lembretes. */
export interface ReminderRepository {
  saveReminder(reminder: Reminder): Promise<Reminder>
  getRemindersByActivityId(activityId: string, userId: string): Promise<Reminder[]>
  deleteReminder(id: string, userId: string): Promise<void>
  updateReminder(reminder: Reminder): Promise<Reminder>
  deleteByActivityId(activityId: string, userId: string): Promise<void>
}

/** Contrato de persistência de disciplinas. */
export interface SubjectRepository {
  list(userId: string): Promise<Subject[]>
  getById(id: string, userId: string): Promise<Subject | null>
  create(userId: string, input: CreateSubjectInput): Promise<Subject>
  update(id: string, userId: string, input: Partial<CreateSubjectInput>): Promise<Subject>
  delete(id: string, userId: string): Promise<void>
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: string = 'REPOSITORY_ERROR',
    public statusCode = 500,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}
