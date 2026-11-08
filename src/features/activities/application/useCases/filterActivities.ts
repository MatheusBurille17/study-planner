import { filterActivities as filterDomainActivities } from '../../domain/filters'
import type { Activity } from '@/shared/types/activity'
import type { ActivityFilter } from '@/shared/types/notification'
import {
  DEFAULT_FILTERS,
  parseFilterCriteria,
  serializeFilterCriteria,
  type FilterCriteria,
} from '../../presentation/schemas/filterSchema'

/** Remove acentos e normaliza para busca case-insensitive. */
export function normalizeSearchTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Combina critérios: AND entre categorias, OR/união dentro da mesma categoria. */
export function combineFilters(...filters: FilterCriteria[]): FilterCriteria {
  return filters.reduce<FilterCriteria>(
    (combined, current) => ({
      search: current.search ?? combined.search,
      priorities: union(combined.priorities, current.priorities),
      subjectIds: union(combined.subjectIds, current.subjectIds),
      statuses: union(combined.statuses, current.statuses),
      types: union(combined.types, current.types),
      dateFrom: current.dateFrom ?? combined.dateFrom,
      dateTo: current.dateTo ?? combined.dateTo,
      sort: current.sort ?? combined.sort,
      page: current.page ?? combined.page,
      limit: current.limit ?? combined.limit,
    }),
    { ...DEFAULT_FILTERS },
  )
}

function union<T>(left?: T[], right?: T[]): T[] | undefined {
  if (!left?.length) return right
  if (!right?.length) return left
  return Array.from(new Set([...left, ...right])) as T[]
}

/** Valida combinações impossíveis (datas invertidas etc.). */
export function validateFilterCombination(criteria: FilterCriteria): { valid: boolean; error?: string } {
  if (criteria.dateFrom && criteria.dateTo && criteria.dateFrom > criteria.dateTo) {
    return { valid: false, error: 'Data inicial deve ser antes da final' }
  }
  if (criteria.limit !== undefined && (criteria.limit < 5 || criteria.limit > 100)) {
    return { valid: false, error: 'Limite deve estar entre 5 e 100' }
  }
  if (criteria.page !== undefined && criteria.page < 1) {
    return { valid: false, error: 'Página deve ser maior ou igual a 1' }
  }
  return { valid: true }
}

export function parseQueryString(query: string): FilterCriteria {
  return parseFilterCriteria(new URLSearchParams(query))
}

export function serializeQueryString(criteria: FilterCriteria): string {
  return serializeFilterCriteria(criteria)
}

/** Converte critérios de UI em filtros de domínio e aplica. */
export function applyFilterCriteria(activities: Activity[], criteria: FilterCriteria): Activity[] {
  const statuses = criteria.statuses ?? []
  const wantsOverdue = statuses.includes('overdue')
  const remainingStatuses = statuses.filter((status) => status !== 'overdue')

  const domainFilter: ActivityFilter = {
    types: criteria.types as ActivityFilter['types'],
    priorities: criteria.priorities,
    statuses: remainingStatuses.length ? remainingStatuses : undefined,
    subjectIds: criteria.subjectIds,
    search: criteria.search,
    dateFrom: criteria.dateFrom ? new Date(`${criteria.dateFrom}T00:00:00`) : undefined,
    dateTo: criteria.dateTo ? new Date(`${criteria.dateTo}T23:59:59`) : undefined,
    sortBy:
      criteria.sort?.startsWith('priority')
        ? 'priority'
        : criteria.sort?.startsWith('created')
          ? 'createdAt'
          : criteria.sort?.startsWith('title')
            ? 'title'
            : 'dueDate',
    sortOrder: criteria.sort?.endsWith('desc') ? 'desc' : 'asc',
  }

  let result = filterDomainActivities(activities, domainFilter)

  if (wantsOverdue) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    result = result.filter((activity) => {
      if (activity.type === 'task' && activity.status === 'COMPLETED') return false
      if (activity.type === 'assignment' && activity.status !== 'PENDING') return false
      const date =
        activity.type === 'task' || activity.type === 'assignment'
          ? activity.dueDate
          : activity.type === 'exam'
            ? activity.date
            : undefined
      return Boolean(date && date.getTime() < today.getTime())
    })
  }

  // Busca também ignora acentos.
  if (criteria.search) {
    const term = normalizeSearchTerm(criteria.search)
    result = result.filter((activity) =>
      normalizeSearchTerm(`${activity.title} ${activity.description ?? ''}`).includes(term),
    )
  }
  return result
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  totalPages: number
}

export function paginate<T>(items: T[], page = 1, limit = 20): PaginatedResult<T> {
  const total = items.length
  const safeLimit = Math.max(1, limit)
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * safeLimit
  return {
    items: items.slice(start, start + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    hasMore: start + safeLimit < total,
    totalPages,
  }
}

/** Filtro de busca textual para reutilização em queries Supabase. */
export function createSearchQuery(term: string): string {
  return normalizeSearchTerm(term).replace(/[%_]/g, '')
}
