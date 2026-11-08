import { AssignmentStatus, TaskStatus } from '@/shared/types/activity'

/**
 * Máquinas de estado das atividades.
 *
 * Task: TODO ↔ IN_PROGRESS ↔ COMPLETED (todas bidirecionais)
 * Assignment: PENDING → SUBMITTED → GRADED (e retorno a PENDING)
 * Exam: sem estados de fluxo.
 */
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
}

export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  [AssignmentStatus.PENDING]: [AssignmentStatus.SUBMITTED],
  [AssignmentStatus.SUBMITTED]: [AssignmentStatus.PENDING, AssignmentStatus.GRADED],
  [AssignmentStatus.GRADED]: [AssignmentStatus.SUBMITTED, AssignmentStatus.PENDING],
}

const TASK_DESCRIPTIONS: Record<string, string> = {
  'TODO->IN_PROGRESS': 'Iniciar tarefa',
  'TODO->COMPLETED': 'Concluir tarefa',
  'IN_PROGRESS->TODO': 'Reabrir como a fazer',
  'IN_PROGRESS->COMPLETED': 'Concluir tarefa',
  'COMPLETED->TODO': 'Reabrir tarefa',
  'COMPLETED->IN_PROGRESS': 'Retomar tarefa',
}

const ASSIGNMENT_DESCRIPTIONS: Record<string, string> = {
  'PENDING->SUBMITTED': 'Marcar como entregue',
  'SUBMITTED->PENDING': 'Desfazer entrega',
  'SUBMITTED->GRADED': 'Marcar como avaliado',
  'GRADED->SUBMITTED': 'Reabrir avaliação',
  'GRADED->PENDING': 'Reabrir como pendente',
}

export function getAllowedTransitions(
  type: 'task' | 'assignment' | 'exam' | string,
  current: string,
): string[] {
  if (type === 'task') return TASK_TRANSITIONS[current as TaskStatus] ?? []
  if (type === 'assignment') return ASSIGNMENT_TRANSITIONS[current as AssignmentStatus] ?? []
  return []
}

export function validateStatusTransition(
  type: 'task' | 'assignment' | 'exam' | string,
  from: string,
  to: string,
): { valid: boolean; message?: string } {
  if (from === to) return { valid: true }
  if (type !== 'task' && type !== 'assignment') {
    return { valid: false, message: 'Este tipo de atividade não possui transições de status' }
  }
  const allowed = getAllowedTransitions(type, from)
  if (!allowed.includes(to)) {
    return {
      valid: false,
      message: `Transição de ${from} para ${to} não permitida. Opções: ${allowed.join(', ') || 'nenhuma'}`,
    }
  }
  return { valid: true }
}

export function getTransitionDescription(
  type: 'task' | 'assignment' | 'exam' | string,
  from: string,
  to: string,
): string {
  const key = `${from}->${to}`
  if (type === 'task') return TASK_DESCRIPTIONS[key] ?? `Alterar status para ${to}`
  if (type === 'assignment') return ASSIGNMENT_DESCRIPTIONS[key] ?? `Alterar status para ${to}`
  return 'Sem alteração de status'
}

/** Verifica se todos os estados são alcançáveis a partir do estado inicial. */
export function allStatesReachable(type: 'task' | 'assignment'): boolean {
  const graph: Record<string, string[]> =
    type === 'task'
      ? (TASK_TRANSITIONS as unknown as Record<string, string[]>)
      : (ASSIGNMENT_TRANSITIONS as unknown as Record<string, string[]>)
  const states = Object.keys(graph)
  const start = type === 'task' ? TaskStatus.TODO : AssignmentStatus.PENDING
  const visited = new Set<string>([start])
  const queue: string[] = [start]
  while (queue.length) {
    const current = queue.shift() as string
    for (const next of graph[current as keyof typeof graph] ?? []) {
      if (!visited.has(next)) {
        visited.add(next)
        queue.push(next)
      }
    }
  }
  return states.every((state) => visited.has(state))
}
