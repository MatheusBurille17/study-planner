import { describe, expect, it } from 'vitest'
import { addDays } from 'date-fns'
import fc from 'fast-check'
import {
  applyFilterCriteria,
  combineFilters,
  createSearchQuery,
  normalizeSearchTerm,
  paginate,
  parseQueryString,
  serializeQueryString,
} from '@/features/activities/application/useCases/filterActivities'
import { filterActivities } from '@/features/activities/domain/filters'
import { Priority, TaskStatus } from '@/shared/types/activity'
import { assignmentFixture, examFixture, taskFixture } from '../../fixtures/activityFixtures'

const activities = [
  taskFixture({ title: 'Cálculo II', priority: Priority.HIGH, status: TaskStatus.TODO }),
  taskFixture({ title: 'Revisão de Anatomia', priority: Priority.LOW, status: TaskStatus.COMPLETED }),
  examFixture({ title: 'Prova de Direito' }),
  assignmentFixture({ title: 'Trabalho de Psicologia' }),
]

describe('lógica de filtros', () => {
  it('sem filtros retorna todas as atividades', () => {
    expect(filterActivities(activities, {})).toHaveLength(4)
  })

  it('filtra por prioridade, status e tipo', () => {
    expect(filterActivities(activities, { priorities: [Priority.HIGH] })).toHaveLength(1)
    expect(filterActivities(activities, { statuses: [TaskStatus.COMPLETED] })).toHaveLength(1)
    expect(filterActivities(activities, { types: ['exam'] as never })).toHaveLength(1)
  })

  it('busca é case-insensitive e ignora acentos', () => {
    expect(filterActivities(activities, { search: 'calculo' })).toHaveLength(1)
    expect(normalizeSearchTerm('CÁLCULO')).toBe('calculo')
    expect(createSearchQuery('Cálculo')).toBe('calculo')
  })

  it('combina filtros com AND entre categorias', () => {
    const filtered = applyFilterCriteria(activities, {
      types: ['task'],
      priorities: [Priority.HIGH],
      search: 'cálculo',
    } as never)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('Cálculo II')
  })

  it('inclui tarefas sem data em filtro de período', () => {
    const undated = taskFixture({ dueDate: undefined })
    const filtered = applyFilterCriteria([...activities, undated], {
      dateFrom: new Date().toISOString().slice(0, 10),
      dateTo: new Date().toISOString().slice(0, 10),
    } as never)
    expect(filtered.some((activity) => activity.id === undated.id)).toBe(true)
  })

  it('suporta status overdue', () => {
    const overdue = taskFixture({ dueDate: addDays(new Date(), -3), status: TaskStatus.TODO })
    const filtered = applyFilterCriteria([...activities, overdue], { statuses: ['overdue'] } as never)
    expect(filtered.map((activity) => activity.id)).toContain(overdue.id)
  })

  it('faz round-trip de query string', () => {
    const criteria = {
      search: 'cálculo',
      priorities: [Priority.HIGH, Priority.LOW],
      subjectIds: [crypto.randomUUID()],
      statuses: [TaskStatus.TODO],
      types: ['task' as const],
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
      sort: 'priority_desc' as const,
      page: 2,
      limit: 20,
    }
    const parsed = parseQueryString(serializeQueryString(criteria))
    expect(parsed.search).toBe(criteria.search)
    expect(parsed.priorities).toEqual(criteria.priorities)
    expect(parsed.sort).toBe(criteria.sort)
    expect(parsed.dateFrom).toBe(criteria.dateFrom)
  })

  it('pagina em blocos de 20 com hasMore correto', () => {
    const many = Array.from({ length: 45 }, (_, index) => taskFixture({ title: `Tarefa ${index}` }))
    const first = paginate(many, 1, 20)
    expect(first.items).toHaveLength(20)
    expect(first.total).toBe(45)
    expect(first.hasMore).toBe(true)
    const last = paginate(many, 3, 20)
    expect(last.items).toHaveLength(5)
    expect(last.hasMore).toBe(false)
  })

  it('combina critérios preservando união dentro da categoria', () => {
    const combined = combineFilters(
      { priorities: [Priority.HIGH], types: ['task'], sort: 'date_asc', page: 1, limit: 20 },
      { priorities: [Priority.LOW], types: ['exam'], sort: 'date_asc', page: 1, limit: 20 },
    )
    expect(combined.priorities).toEqual([Priority.HIGH, Priority.LOW])
    expect(combined.types).toEqual(['task', 'exam'])
  })

  it('propriedade: busca retorna apenas títulos/descrições correspondentes', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 10 }), (term) => {
        const result = filterActivities(activities, { search: term })
        const normalized = normalizeSearchTerm(term)
        return result.every((activity) =>
          normalizeSearchTerm(`${activity.title} ${activity.description ?? ''}`).includes(normalized),
        )
      }),
      { numRuns: 100 },
    )
  })

  it('propriedade: serialização round-trip preserva filtros', () => {
    fc.assert(
      fc.property(
        fc.record({
          search: fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
          sort: fc.constantFrom('date_asc', 'date_desc', 'priority_desc', 'title_asc'),
        }),
        (partial) => {
          const criteria = { ...partial, page: 1, limit: 20 } as never
          const parsed = parseQueryString(serializeQueryString(criteria))
          return parsed.search === (partial.search?.trim() || undefined) && parsed.sort === partial.sort
        },
      ),
      { numRuns: 100 },
    )
  })
})
