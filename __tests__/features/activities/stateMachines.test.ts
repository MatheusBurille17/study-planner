import { describe, expect, it } from 'vitest'
import { addHours } from 'date-fns'
import {
  allStatesReachable,
  getAllowedTransitions,
  getTransitionDescription,
  validateStatusTransition,
} from '@/features/activities/domain/stateMachines'
import { UndoRedoStack } from '@/features/activities/domain/undoRedoStack'
import {
  isConflict,
  resolveConflictWithDiscard,
  resolveConflictWithKeepLocal,
  resolveConflictWithReload,
} from '@/features/activities/application/useCases/detectConflict'
import { AssignmentStatus, TaskStatus } from '@/shared/types/activity'
import { resolveConflictLastWriteWins } from '@/shared/lib/offline/conflictResolver'
import { taskFixture } from '../../fixtures/activityFixtures'

describe('máquinas de estado', () => {
  it('permite transições válidas de tarefa', () => {
    expect(validateStatusTransition('task', TaskStatus.TODO, TaskStatus.IN_PROGRESS).valid).toBe(true)
    expect(validateStatusTransition('task', TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED).valid).toBe(true)
    expect(validateStatusTransition('task', TaskStatus.COMPLETED, TaskStatus.TODO).valid).toBe(true)
  })

  it('valida transições de trabalho', () => {
    expect(validateStatusTransition('assignment', AssignmentStatus.PENDING, AssignmentStatus.SUBMITTED).valid).toBe(true)
    expect(validateStatusTransition('assignment', AssignmentStatus.SUBMITTED, AssignmentStatus.GRADED).valid).toBe(true)
    expect(validateStatusTransition('assignment', AssignmentStatus.GRADED, AssignmentStatus.PENDING).valid).toBe(true)
  })

  it('rejeita transição inválida e tipo sem status', () => {
    expect(validateStatusTransition('exam', 'ANY', 'OTHER').valid).toBe(false)
    expect(validateStatusTransition('assignment', AssignmentStatus.PENDING, AssignmentStatus.GRADED).valid).toBe(false)
  })

  it('todos os estados são alcançáveis', () => {
    expect(allStatesReachable('task')).toBe(true)
    expect(allStatesReachable('assignment')).toBe(true)
  })

  it('retorna transições permitidas e descrição', () => {
    expect(getAllowedTransitions('task', TaskStatus.TODO)).toEqual([
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
    ])
    expect(getTransitionDescription('task', TaskStatus.TODO, TaskStatus.COMPLETED)).toMatch(/Concluir/)
  })
})

describe('undo/redo', () => {
  it('desfaz e refaz recuperando o estado original', () => {
    const stack = new UndoRedoStack<number>()
    stack.record({ type: 'set', previousState: 1, newState: 2, description: 'Alterar' })
    const undone = stack.undo()
    expect(undone?.previousState).toBe(1)
    expect(stack.canRedo()).toBe(true)
    const redone = stack.redo()
    expect(redone?.newState).toBe(2)
  })

  it('limita a 10 ações e limpa redo ao registrar nova ação', () => {
    const stack = new UndoRedoStack<number>(10)
    for (let index = 0; index < 15; index += 1) {
      stack.record({ type: 'set', previousState: index, newState: index + 1, description: String(index) })
    }
    expect(stack.getHistory()).toHaveLength(10)
    stack.undo()
    expect(stack.canRedo()).toBe(true)
    stack.record({ type: 'set', previousState: 99, newState: 100, description: 'nova' })
    expect(stack.canRedo()).toBe(false)
  })
})

describe('detecção de conflito', () => {
  const earlier = new Date()
  const later = addHours(earlier, 1)

  it('detecta conflito quando servidor é mais novo', () => {
    expect(isConflict(later, earlier)).toBe(true)
    expect(isConflict(earlier, later)).toBe(false)
  })

  it('resolve conflito com reload, discard e keep-local', () => {
    expect(resolveConflictWithReload({ value: 1 }).data).toEqual({ value: 1 })
    expect(resolveConflictWithDiscard({ value: 1 }).action).toBe('discard')
    const merged = resolveConflictWithKeepLocal({ title: 'local' }, { title: 'server', id: '1' })
    expect(merged.data).toMatchObject({ title: 'local', id: '1' })
  })

  it('last-write-wins mantém versão mais recente', () => {
    const base = taskFixture()
    const newer = { ...base, title: 'Servidor', updatedAt: addHours(base.updatedAt, 1) } as typeof base
    const result = resolveConflictLastWriteWins(base, newer)
    expect(result.winner).toBe('server')
    expect(result.data.title).toBe('Servidor')
  })
})
